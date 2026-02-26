import { createClient, Client } from "@libsql/client";
import { InventoryItem, Transaction, PendingIssue, SqlStatement, CartItem } from './types';
import { INITIAL_INVENTORY, MOCK_USERS, ZONES, DEPARTMENTS } from './constants';

const DEFAULT_URL = process.env.VITE_TURSO_URL;
const DEFAULT_TOKEN = process.env.VITE_TURSO_TOKEN;

const REQUEST_DB_URL = "libsql://prrequest-vercel-icfg-tf7wnf43zngjwvbur4t9rp6n.aws-us-east-1.turso.io";
const REQUEST_DB_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzEwNjA0NDEsImlkIjoiNTEyODlkNzQtYzhjNi00YzllLTg2YjYtNjk1MTZlY2ZjNDgzIiwicmlkIjoiMzQyNmUyODUtYjhlNS00OWI2LWE0ZDktNDFmZTQ3MzE0ZjNjIn0.rqlTsVVTqoMowmh-2XO9pptsb77qdThUvOvyH95KNsTkCUaOKiO2DwHMnl72qET3ORXfFyHjELmyTu4rLMKuDA";

let client: Client;
let requestClient: Client;

const getCredentials = () => {
  const url = localStorage.getItem('TURSO_URL') || DEFAULT_URL;
  const token = localStorage.getItem('TURSO_TOKEN') || DEFAULT_TOKEN;
  return { url, token };
};

const initClient = () => {
  const { url, token } = getCredentials();
  if (url && token) {
    client = createClient({ url, authToken: token });
  }
  
  // Initialize dedicated client for request picker
  requestClient = createClient({
    url: REQUEST_DB_URL,
    authToken: REQUEST_DB_TOKEN
  });
};

// Initial creation
initClient();

export const db = {
  async setCredentials(url: string, token: string) {
    localStorage.setItem('TURSO_URL', url);
    localStorage.setItem('TURSO_TOKEN', token);
    initClient();
    return await this.initialize();
  },

  async disconnectCloud() {
    localStorage.removeItem('TURSO_URL');
    localStorage.removeItem('TURSO_TOKEN');
    initClient();
  },

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await client.execute("SELECT 1");
      return { success: true };
    } catch (error) {
      console.error("Database connection test failed:", error);
      return { success: false, error: error.message };
    }
  },

  async initialize() {
    try {
      // Step 1: Schema Setup
      await client.batch([
        `CREATE TABLE IF NOT EXISTS inventory (
          id TEXT PRIMARY KEY,
          sku TEXT,
          name TEXT,
          category TEXT,
          uom TEXT,
          unit_cost REAL,
          par_stock REAL,
          initial_par_stock REAL,
          stock_json TEXT,
          batches_json TEXT,
          earliest_expiry TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          timestamp TEXT,
          user_name TEXT,
          action TEXT,
          qty REAL,
          item_sku TEXT,
          item_name TEXT,
          item_uom TEXT,
          dest_zone TEXT,
          department TEXT,
          receiver_name TEXT,
          signature TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS pending_issues (
          id TEXT PRIMARY KEY,
          timestamp TEXT,
          user_name TEXT,
          receiver_name TEXT,
          department TEXT,
          signature TEXT,
          items_json TEXT,
          status TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value_json TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT,
          role TEXT
        )`
      ], "write");

      // Step 2: Seeding Check
      const invCheck = await client.execute("SELECT count(*) as count FROM inventory");
      const configCheck = await client.execute("SELECT count(*) as count FROM config");

      if (invCheck.rows[0].count === 0) {
        const statements = INITIAL_INVENTORY.map(item => ({
          sql: `INSERT INTO inventory (id, sku, name, category, uom, unit_cost, par_stock, initial_par_stock, stock_json, batches_json, earliest_expiry) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            item.id, item.sku, item.name, item.category, item.uom, item.unitCost, 
            item.parStock, item.initialParStock, JSON.stringify(item.stock), 
            JSON.stringify(item.batches), item.earliestExpiry
          ]
        }));
        if (statements.length > 0) {
          await client.batch(statements, "write");
        }
      }

      if (configCheck.rows[0].count === 0) {
        await this.saveConfig({
          categories: ['Dry Goods', 'Alcohol', 'Guest Supplies', 'Chemicals'],
          departments: DEPARTMENTS,
          zones: ZONES
        });
        
        await client.execute({
          sql: "INSERT OR REPLACE INTO config (key, value_json) VALUES (?, ?)",
          args: ["admin_password", JSON.stringify("1234")]
        });
      }

      const userCheck = await client.execute("SELECT count(*) as count FROM users");
      if (userCheck.rows[0].count === 0) {
        const userStatementsWithIds = MOCK_USERS.map(user => ({
          sql: "INSERT OR REPLACE INTO users (id, name, role) VALUES (?, ?, ?)",
          args: [user.id, user.name, user.role]
        }));
        await client.batch(userStatementsWithIds, "write");
      }

      return true;
    } catch (error) {
      console.error("Database initialization failed", error);
      return false;
    }
  },

  async getInventory(): Promise<InventoryItem[]> {
    try {
      const res = await client.execute("SELECT * FROM inventory");
      return res.rows.map(row => ({
        id: String(row.id),
        sku: String(row.sku),
        name: String(row.name),
        category: String(row.category),
        uom: String(row.uom),
        unitCost: Number(row.unit_cost),
        parStock: Number(row.par_stock),
        initialParStock: Number(row.initial_par_stock),
        stock: JSON.parse(String(row.stock_json || '{}')),
        batches: JSON.parse(String(row.batches_json || '[]')),
        earliestExpiry: String(row.earliest_expiry)
      }));
    } catch (e: unknown) {
      console.error("Error fetching inventory:", e);
      throw e;
    }
  },

  async updateInventory(items: InventoryItem[]): Promise<void> {
    const statements: { sql: string; args: (string | number | null)[] }[] = [];
    items.forEach(item => {
      statements.push({
        sql: `INSERT OR REPLACE INTO inventory (id, sku, name, category, uom, unit_cost, par_stock, initial_par_stock, stock_json, batches_json, earliest_expiry) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id, item.sku, item.name, item.category, item.uom, item.unitCost, 
          item.parStock, item.initialParStock, JSON.stringify(item.stock), 
          JSON.stringify(item.batches), item.earliestExpiry
        ]
      });
    });
    if (statements.length > 0) {
      await client.batch(statements, "write");
    }
  },

  async deleteInventoryItem(id: string): Promise<void> {
    await client.execute({
      sql: "DELETE FROM inventory WHERE id = ?",
      args: [id]
    });
  },

  async getTransactions(): Promise<Transaction[]> {
    try {
      const res = await client.execute("SELECT * FROM transactions ORDER BY timestamp DESC");
      return res.rows.map(row => ({
        id: String(row.id),
        timestamp: String(row.timestamp),
        user: String(row.user_name),
        action: row.action as 'ISSUE' | 'RECEIVE',
        qty: Number(row.qty),
        itemSku: String(row.item_sku),
        itemName: String(row.item_name),
        itemUom: String(row.item_uom || ''),
        destZone: String(row.dest_zone),
        department: String(row.department || ''),
        receiverName: String(row.receiver_name || ''),
        signature: String(row.signature || '')
      }));
    } catch (e: unknown) {
      console.error("Error fetching transactions:", e);
      throw e;
    }
  },

  async addTransactions(newTxs: Transaction[]): Promise<void> {
    const statements = newTxs.map(tx => ({
      sql: `INSERT INTO transactions (id, timestamp, user_name, action, qty, item_sku, item_name, item_uom, dest_zone, department, receiver_name, signature)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tx.id, tx.timestamp, tx.user, tx.action, tx.qty, tx.itemSku, 
        tx.itemName, tx.itemUom || '', tx.destZone, tx.department || '', 
        tx.receiverName || '', tx.signature || ''
      ]
    }));
    if (statements.length > 0) {
      await client.batch(statements, "write");
    }
  },
  
  async updateTransactions(txs: Transaction[]): Promise<void> {
    const statements: { sql: string; args: (string | number | null)[] }[] = [{ sql: "DELETE FROM transactions", args: [] }];
    txs.forEach(tx => {
      statements.push({
        sql: `INSERT INTO transactions (id, timestamp, user_name, action, qty, item_sku, item_name, item_uom, dest_zone, department, receiver_name, signature)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          tx.id, tx.timestamp, tx.user, tx.action, tx.qty, tx.itemSku, 
          tx.itemName, tx.itemUom || '', tx.destZone, tx.department || '', 
          tx.receiverName || '', tx.signature || ''
        ]
      });
    });
    await client.batch(statements, "write");
  },

  async getPendingIssues(): Promise<PendingIssue[]> {
    try {
      const res = await client.execute("SELECT * FROM pending_issues WHERE status = 'pending' ORDER BY timestamp DESC");
      return res.rows.map(row => ({
        id: String(row.id),
        timestamp: String(row.timestamp),
        user: String(row.user_name),
        receiverName: String(row.receiver_name || ''),
        department: String(row.department),
        signature: String(row.signature || ''),
        items: JSON.parse(String(row.items_json || '[]')),
        status: row.status as 'pending' | 'released',
      }));
    } catch (e: unknown) {
      console.error("Error fetching pending issues:", e);
      return [];
    }
  },

  async getExternalRequests(): Promise<PendingIssue[]> {
    try {
      if (!requestClient) {
        console.warn("Request DB client not initialized");
        return [];
      }
      // Fetch from 'requisitions' table
      const res = await requestClient.execute("SELECT * FROM requisitions ORDER BY date DESC");
      
      const issues: PendingIssue[] = [];

      for (const row of res.rows) {
        const id = String(row.id);
        let items: CartItem[] = [];

        try {
          // Parse items from JSON blob in 'items' column
          const rawItems = JSON.parse(String(row.items || '[]'));
          
          if (Array.isArray(rawItems)) {
            items = rawItems
              .filter((i: { source?: string }) => i.source === 'Warehouse') // Filter for Warehouse items
              .map((i: { id?: string; sku?: string; name?: string; quantity?: number; unit?: string }) => ({
                itemId: String(i.id || `item-${Math.random()}`),
                sku: String(i.sku || ''),
                name: String(i.name || 'Unknown Item'),
                quantity: Number(i.quantity || 0),
                zone: 'Main', // Default zone
                uom: String(i.unit || 'Units')
              }));
          }
        } catch (e) {
          console.warn(`Failed to parse items for requisition ${id}`, e);
        }

        const dbStatus = String(row.status).toLowerCase();
        let appStatus: 'pending' | 'released' | 'in progress' = 'pending';
        if (dbStatus === 'completed' || dbStatus === 'released') {
          appStatus = 'released';
        } else if (dbStatus === 'in progress') {
          appStatus = 'in progress';
        }

        // Only include if there are warehouse items
        if (items.length > 0) {
          issues.push({
            id: id,
            timestamp: String(row.date),
            user: String(row.requester),
            receiverName: '',
            department: String(row.department),
            signature: '',
            items: items,
            status: appStatus,
          });
        }
      }
      
      return issues;
    } catch (e: unknown) {
      console.error("Error fetching external requests:", e);
      return [];
    }
  },

  async updateExternalRequestStatus(id: string, status: string): Promise<void> {
    try {
      if (!requestClient) return;
      await requestClient.execute({
        sql: "UPDATE requisitions SET status = ? WHERE id = ?",
        args: [status, id]
      });
    } catch (e) {
      console.error(`Failed to update external request status for ${id}`, e);
      throw e;
    }
  },

  async updatePendingIssues(issues: PendingIssue[]): Promise<void> {
    const statements: { sql: string; args: (string | number | null)[] }[] = [];
    issues.forEach(req => {
      statements.push({
        sql: `INSERT OR REPLACE INTO pending_issues (id, timestamp, user_name, receiver_name, department, signature, items_json, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          req.id, req.timestamp, req.user, req.receiverName || '', 
          req.department, req.signature || '', JSON.stringify(req.items), req.status
        ]
      });
    });
    if (statements.length > 0) {
      await client.batch(statements, "write");
    }
  },

  async deletePendingIssue(id: string): Promise<void> {
    await client.execute({
      sql: "DELETE FROM pending_issues WHERE id = ?",
      args: [id]
    });
  },

  async pushState(inventory: InventoryItem[], transactions: Transaction[], pendingIssues: PendingIssue[]): Promise<void> {
    try {
      const statements: SqlStatement[] = [
        { sql: "DELETE FROM inventory", args: [] },
        { sql: "DELETE FROM transactions", args: [] },
        { sql: "DELETE FROM pending_issues", args: [] }
      ];

      inventory.forEach(item => {
        statements.push({
          sql: `INSERT INTO inventory (id, sku, name, category, uom, unit_cost, par_stock, initial_par_stock, stock_json, batches_json, earliest_expiry) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            item.id, item.sku, item.name, item.category, item.uom, item.unitCost, 
            item.parStock, item.initialParStock, JSON.stringify(item.stock), 
            JSON.stringify(item.batches), item.earliestExpiry
          ]
        });
      });

      transactions.forEach(tx => {
        statements.push({
          sql: `INSERT INTO transactions (id, timestamp, user_name, action, qty, item_sku, item_name, item_uom, dest_zone, department, receiver_name, signature)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            tx.id, tx.timestamp, tx.user, tx.action, tx.qty, tx.itemSku, 
            tx.itemName, tx.itemUom || '', tx.destZone, tx.department || '', 
            tx.receiverName || '', tx.signature || ''
          ]
        });
      });

      pendingIssues.forEach(req => {
        statements.push({
          sql: `INSERT INTO pending_issues (id, timestamp, user_name, receiver_name, department, signature, items_json, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            req.id, req.timestamp, req.user, req.receiverName || '', 
            req.department, req.signature || '', JSON.stringify(req.items), req.status
          ]
        });
      });

      await client.batch(statements, "write");
    } catch (e: unknown) {
      console.error("Atomic state push failed:", e);
      throw e;
    }
  },

  async getConfig() {
    try {
      const res = await client.execute({
        sql: "SELECT value_json FROM config WHERE key = ?",
        args: ["system_config"]
      });
      return res.rows.length > 0 ? JSON.parse(String(res.rows[0].value_json)) : { categories: [], departments: [], zones: [] };
    } catch (e: unknown) {
      console.error("Error fetching config:", e);
      return { categories: [], departments: [], zones: [] };
    }
  },

  async saveConfig(config: { categories: string[]; departments: string[]; zones: string[] }) {
    try {
      await client.execute({
        sql: "INSERT OR REPLACE INTO config (key, value_json) VALUES (?, ?)",
        args: ["system_config", JSON.stringify(config)]
      });
    } catch (e: unknown) {
      console.error("Error saving config:", e);
      throw e;
    }
  },

  async getAdminPassword(): Promise<string> {
    try {
      const res = await client.execute({
        sql: "SELECT value_json FROM config WHERE key = ?",
        args: ["admin_password"]
      });
      return res.rows.length > 0 ? JSON.parse(String(res.rows[0].value_json)) : '1234';
    } catch (err: unknown) {
      console.error("Error fetching admin password:", err);
      return '1234';
    }
  },

  async setAdminPassword(password: string): Promise<void> {
    try {
      await client.execute({
        sql: "INSERT OR REPLACE INTO config (key, value_json) VALUES (?, ?)",
        args: ["admin_password", JSON.stringify(password)]
      });
    } catch (e: unknown) {
      console.error("Error saving admin password:", e);
      throw e;
    }
  },

  async saveAuditState(state: { isAuditMode: boolean; isAuditPaused: boolean; auditTimer: number; auditCounts: Record<string, number> }): Promise<void> {
    try {
      await client.execute({
        sql: "INSERT OR REPLACE INTO config (key, value_json) VALUES (?, ?)",
        args: ["audit_state", JSON.stringify(state)]
      });
    } catch (e: unknown) {
      console.error("Error saving audit state:", e);
      throw e;
    }
  },

  async getAuditState(): Promise<{ isAuditMode: boolean; isAuditPaused: boolean; auditTimer: number; auditCounts: Record<string, number> } | null> {
    try {
      const res = await client.execute({
        sql: "SELECT value_json FROM config WHERE key = ?",
        args: ["audit_state"]
      });
      return res.rows.length > 0 ? JSON.parse(String(res.rows[0].value_json)) : null;
    } catch (e: unknown) {
      console.error("Error fetching audit state:", e);
      return null;
    }
  }
};