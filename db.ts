import { InventoryItem, Transaction, User, StockBatch } from './types';
import { INITIAL_INVENTORY, MOCK_USERS, ZONES, DEPARTMENTS } from './constants';
import { createClient } from '@libsql/client';

// Provided Turso Credentials
const DEFAULT_TURSO_URL = "libsql://sunlight-vercel-icfg-tf7wnf43zngjwvbur4t9rp6n.aws-us-east-1.turso.io";
const DEFAULT_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzA3NzY4ODgsImlkIjoiZmFmMWM0MzAtOTU1Yi00ZTlkLWFkMGItNmFlYWRkMDI0NjgzIiwicmlkIjoiZDY4MTQ0ZDQtNzM2OC00NTQzLThhOTgtYmI4MjI2ZDc2MjUzIn0.Ivs2G_Lhuy4eP4ZlsJdNXpnUn1R_VGpTO5oYpCXPaWK3Ak4wBifInsT7ISY8vWT78f_r80cOMfnnQMue2lHPAg";

const STORAGE_KEYS = {
  INVENTORY: 'sunlight_db_inventory',
  TRANSACTIONS: 'sunlight_db_transactions',
  USERS: 'sunlight_db_users',
  CONFIG: 'sunlight_db_config',
  ADMIN_PW: 'sunlight_db_pw',
  TURSO_URL: 'sunlight_turso_url',
  TURSO_TOKEN: 'sunlight_turso_token',
};

interface StorageWrapper<T> {
  data: T;
  updatedAt: string;
}

const getTursoClient = () => {
  const url = localStorage.getItem(STORAGE_KEYS.TURSO_URL) || DEFAULT_TURSO_URL;
  const authToken = localStorage.getItem(STORAGE_KEYS.TURSO_TOKEN) || DEFAULT_TURSO_TOKEN;
  
  if (!url) return null;
  try {
    return createClient({ url, authToken: authToken || undefined });
  } catch (e) {
    console.error("Failed to create Turso client", e);
    return null;
  }
};

export const db = {
  async isCloud() {
    return !!(localStorage.getItem(STORAGE_KEYS.TURSO_URL) || DEFAULT_TURSO_URL);
  },

  async getStorageUsageMB(): Promise<number> {
    let totalChars = 0;
    const keys = Object.values(STORAGE_KEYS);
    for (const key of keys) {
      totalChars += (localStorage.getItem(key) || '').length;
    }
    return (totalChars * 2) / (1024 * 1024);
  },

  async trackActiveSession() {
    // Keep as placeholder for session activity if needed for cloud sync throttling, 
    // but compute hours tracking is removed from UI.
  },

  async pruneOldLogs(days = 90) {
    const txs = await this.getTransactions();
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const filtered = txs.filter(t => new Date(t.timestamp).getTime() > cutoff);
    if (filtered.length !== txs.length) {
      await this.setData(STORAGE_KEYS.TRANSACTIONS, filtered);
    }
    return txs.length - filtered.length;
  },

  async reconcile() {
    const client = getTursoClient();
    if (!client) return;

    try {
      const keys = Object.values(STORAGE_KEYS).filter(k => k !== STORAGE_KEYS.TURSO_URL && k !== STORAGE_KEYS.TURSO_TOKEN);
      for (const key of keys) {
        const localRaw = localStorage.getItem(key);
        const localParsed: StorageWrapper<any> | null = localRaw ? JSON.parse(localRaw) : null;
        
        const rs = await client.execute({
          sql: "SELECT value FROM sunlight_storage WHERE key = ?",
          args: [key]
        });
        
        const cloudParsed: StorageWrapper<any> | null = rs.rows[0]?.value ? JSON.parse(rs.rows[0].value as string) : null;

        if (!localParsed && cloudParsed) {
          localStorage.setItem(key, JSON.stringify(cloudParsed));
          continue;
        }

        if (localParsed && !cloudParsed) {
          await client.execute({
            sql: "INSERT OR REPLACE INTO sunlight_storage (key, value) VALUES (?, ?)",
            args: [key, JSON.stringify(localParsed)]
          });
          continue;
        }

        if (localParsed && cloudParsed) {
          const localTime = new Date(localParsed.updatedAt).getTime();
          const cloudTime = new Date(cloudParsed.updatedAt).getTime();
          if (localTime > cloudTime) {
            await client.execute({
              sql: "INSERT OR REPLACE INTO sunlight_storage (key, value) VALUES (?, ?)",
              args: [key, JSON.stringify(localParsed)]
            });
          } else if (cloudTime > localTime) {
            localStorage.setItem(key, JSON.stringify(cloudParsed));
          }
        }
      }
    } catch (err) {
      console.error("Sync error", err);
    }
  },

  async getData(key: string): Promise<any> {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const wrapper: StorageWrapper<any> = JSON.parse(raw);
      return wrapper.data;
    } catch {
      return null;
    }
  },

  async setData(key: string, value: any, updatedAt?: string): Promise<void> {
    const wrapper: StorageWrapper<any> = {
      data: value,
      updatedAt: updatedAt || new Date().toISOString()
    };
    const json = JSON.stringify(wrapper);
    localStorage.setItem(key, json);

    const client = getTursoClient();
    if (client) {
      try {
        await client.execute({
          sql: "INSERT OR REPLACE INTO sunlight_storage (key, value) VALUES (?, ?)",
          args: [key, json]
        });
      } catch (err) {
        console.warn(`Cloud push deferred for ${key}`);
      }
    }
  },

  async initialize() {
    const client = getTursoClient();
    if (client) {
      try {
        await client.execute("CREATE TABLE IF NOT EXISTS sunlight_storage (key TEXT PRIMARY KEY, value TEXT)");
        await this.reconcile(); 
      } catch (e) {
        console.error("Turso init failed", e);
      }
    }

    const inv = await this.getData(STORAGE_KEYS.INVENTORY);
    if (!inv) {
      const epoch = new Date(0).toISOString();
      await this.setData(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY, epoch);
      await this.setData(STORAGE_KEYS.USERS, MOCK_USERS, epoch);
      await this.setData(STORAGE_KEYS.CONFIG, {
        categories: ['Dry Goods', 'Alcohol', 'Guest Supplies', 'Chemicals'],
        departments: DEPARTMENTS,
        zones: ZONES
      }, epoch);
      await this.setData(STORAGE_KEYS.ADMIN_PW, '1234', epoch);
    }
    return true;
  },

  async getInventory(): Promise<InventoryItem[]> {
    return (await this.getData(STORAGE_KEYS.INVENTORY)) || [];
  },

  async updateInventory(items: InventoryItem[]): Promise<void> {
    await this.setData(STORAGE_KEYS.INVENTORY, items);
  },

  async getTransactions(): Promise<Transaction[]> {
    return (await this.getData(STORAGE_KEYS.TRANSACTIONS)) || [];
  },

  async addTransactions(newTxs: Transaction[]): Promise<void> {
    const current = await this.getTransactions();
    await this.setData(STORAGE_KEYS.TRANSACTIONS, [...newTxs, ...current]);
  },

  async getUsers(): Promise<User[]> {
    return (await this.getData(STORAGE_KEYS.USERS)) || [];
  },

  async saveUsers(users: User[]): Promise<void> {
    await this.setData(STORAGE_KEYS.USERS, users);
  },

  async getAdminPassword(): Promise<string> {
    return (await this.getData(STORAGE_KEYS.ADMIN_PW)) || '1234';
  },

  async setAdminPassword(pw: string): Promise<void> {
    await this.setData(STORAGE_KEYS.ADMIN_PW, pw);
  },

  async getConfig() {
    return (await this.getData(STORAGE_KEYS.CONFIG)) || { categories: [], departments: [], zones: [] };
  },

  async saveConfig(config: any) {
    await this.setData(STORAGE_KEYS.CONFIG, config);
  },

  async setTursoConfig(url: string | null, token: string | null) {
    if (!url) {
      localStorage.removeItem(STORAGE_KEYS.TURSO_URL);
      localStorage.removeItem(STORAGE_KEYS.TURSO_TOKEN);
    } else {
      localStorage.setItem(STORAGE_KEYS.TURSO_URL, url);
      if (token) localStorage.setItem(STORAGE_KEYS.TURSO_TOKEN, token);
      else localStorage.removeItem(STORAGE_KEYS.TURSO_TOKEN);
    }
    await this.initialize();
  },

  async syncLocalToCloud(url: string, token: string | null) {
    localStorage.setItem(STORAGE_KEYS.TURSO_URL, url);
    if (token) localStorage.setItem(STORAGE_KEYS.TURSO_TOKEN, token);
    const client = createClient({ url, authToken: token || undefined });
    await client.execute("CREATE TABLE IF NOT EXISTS sunlight_storage (key TEXT PRIMARY KEY, value TEXT)");
    const keys = Object.values(STORAGE_KEYS).filter(k => k !== STORAGE_KEYS.TURSO_URL && k !== STORAGE_KEYS.TURSO_TOKEN);
    for (const k of keys) {
      const val = localStorage.getItem(k);
      if (val) await client.execute({
        sql: "INSERT OR REPLACE INTO sunlight_storage (key, value) VALUES (?, ?)",
        args: [k, val]
      });
    }
    await this.reconcile();
  },

  getCloudConfig() {
    return {
      url: localStorage.getItem(STORAGE_KEYS.TURSO_URL) || DEFAULT_TURSO_URL,
      token: localStorage.getItem(STORAGE_KEYS.TURSO_TOKEN) || DEFAULT_TURSO_TOKEN
    };
  }
};