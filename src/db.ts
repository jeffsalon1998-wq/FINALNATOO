import { createClient, Client } from '@libsql/client';
import { InventoryItem, Transaction, PendingIssue, Config, ExternalRequest } from './types';

class Database {
  private client: Client | null = null;
  private tursoUrl: string | undefined = undefined;
  private tursoToken: string | undefined = undefined;

  constructor() {
    this.tursoUrl = localStorage.getItem('TURSO_URL') || process.env.VITE_TURSO_URL;
    this.tursoToken = localStorage.getItem('TURSO_TOKEN') || process.env.VITE_TURSO_TOKEN;
  }

  public async initialize(): Promise<boolean> {
    if (this.client) {
      return true; // Already initialized
    }

    if (!this.tursoUrl || !this.tursoToken) {
      console.error("Turso URL or Token not configured.");
      return false;
    }

    try {
      this.client = createClient({
        url: this.tursoUrl,
        authToken: this.tursoToken,
      });

      await this.client.execute("SELECT 1"); // Test connection
      await this.createTables();
      console.log("Turso database initialized and connected.");
      return true;
    } catch (e) {
      console.error("Failed to initialize Turso database:", e);
      this.client = null;
      return false;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        uom TEXT NOT NULL,
        unitCost REAL NOT NULL,
        parStock INTEGER NOT NULL,
        stock TEXT NOT NULL, -- JSON string of {zone: qty}
        initialParStock INTEGER NOT NULL,
        expiryDates TEXT NOT NULL -- JSON string of {date: qty}
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        itemId TEXT NOT NULL,
        itemName TEXT NOT NULL,
        action TEXT NOT NULL,
        qty INTEGER NOT NULL,
        zone TEXT NOT NULL,
        department TEXT NOT NULL,
        user TEXT NOT NULL,
        type TEXT NOT NULL,
        details TEXT -- JSON string of additional details
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS pending_issues (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        department TEXT NOT NULL,
        items TEXT NOT NULL, -- JSON string of CartItem[]
        status TEXT NOT NULL,
        signature TEXT
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS external_requests (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT NOT NULL -- JSON string of request details
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS config (
        id TEXT PRIMARY KEY DEFAULT 'app_config',
        categories TEXT NOT NULL,
        departments TEXT NOT NULL,
        zones TEXT NOT NULL
      );
    `);

    // Insert default config if not exists
    await this.client.execute(`
      INSERT OR IGNORE INTO config (id, categories, departments, zones) VALUES (
        'app_config',
        '["Food", "Beverage", "Supplies", "Equipment", "Other"]',
        '["Kitchen", "Bar", "Housekeeping", "Front Desk", "Maintenance"]',
        '["Main Storage", "Kitchen Fridge", "Bar Stock", "Cleaning Supply", "Office"]'
      );
    `);
  }

  public async getInventory(): Promise<InventoryItem[]> {
    if (!this.client) throw new Error("Database not initialized.");
    const rs = await this.client.execute("SELECT * FROM inventory");
    return rs.rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      sku: row.sku as string,
      category: row.category as string,
      uom: row.uom as string,
      unitCost: row.unitCost as number,
      parStock: row.parStock as number,
      stock: JSON.parse(row.stock as string),
      initialParStock: row.initialParStock as number,
      expiryDates: JSON.parse(row.expiryDates as string),
    }));
  }

  public async updateInventory(items: InventoryItem[]): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    const tx = await this.client.transaction();
    try {
      for (const item of items) {
        await tx.execute(
          `INSERT OR REPLACE INTO inventory (id, name, sku, category, uom, unitCost, parStock, stock, initialParStock, expiryDates) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [
            item.id, item.name, item.sku, item.category, item.uom, item.unitCost, 
            item.parStock, JSON.stringify(item.stock), item.initialParStock, JSON.stringify(item.expiryDates)
          ]
        );
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  public async deleteInventoryItem(id: string): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    await this.client.execute("DELETE FROM inventory WHERE id = ?", [id]);
  }

  public async getTransactions(startDate?: Date, endDate?: Date): Promise<Transaction[]> {
    if (!this.client) throw new Error("Database not initialized.");

    let query = "SELECT * FROM transactions";
    const params: (string | number)[] = [];

    if (startDate && endDate) {
      query += " WHERE timestamp BETWEEN ? AND ?";
      params.push(startDate.getTime(), endDate.getTime());
    }

    query += " ORDER BY timestamp DESC";

    const rs = await this.client.execute({ sql: query, args: params });

    return rs.rows.map(row => ({
      id: row.id as string,
      timestamp: row.timestamp as number,
      itemId: row.itemId as string,
      itemName: row.itemName as string,
      action: row.action as 'RECEIVE' | 'ISSUE',
      qty: row.qty as number,
      zone: row.zone as string,
      department: row.department as string,
      user: row.user as string,
      type: row.type as string,
      details: row.details ? JSON.parse(row.details as string) : undefined,
    }));
  }

  public async addTransaction(transaction: Transaction): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    await this.client.execute(
      `INSERT INTO transactions (id, timestamp, itemId, itemName, action, qty, zone, department, user, type, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [
        transaction.id, transaction.timestamp, transaction.itemId, transaction.itemName, 
        transaction.action, transaction.qty, transaction.zone, transaction.department, 
        transaction.user, transaction.type, transaction.details ? JSON.stringify(transaction.details) : null
      ]
    );
  }

  public async updateTransactions(transactions: Transaction[]): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    if (transactions.length === 0) {
      await this.client.execute("DELETE FROM transactions");
      return;
    }
    const tx = await this.client.transaction();
    try {
      await tx.execute("DELETE FROM transactions");
      for (const transaction of transactions) {
        await tx.execute(
          `INSERT INTO transactions (id, timestamp, itemId, itemName, action, qty, zone, department, user, type, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [
            transaction.id, transaction.timestamp, transaction.itemId, transaction.itemName, 
            transaction.action, transaction.qty, transaction.zone, transaction.department, 
            transaction.user, transaction.type, transaction.details ? JSON.stringify(transaction.details) : null
          ]
        );
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  public async getPendingIssues(): Promise<PendingIssue[]> {
    if (!this.client) throw new Error("Database not initialized.");
    const rs = await this.client.execute("SELECT * FROM pending_issues ORDER BY timestamp DESC");
    return rs.rows.map(row => ({
      id: row.id as string,
      timestamp: row.timestamp as number,
      department: row.department as string,
      items: JSON.parse(row.items as string),
      status: row.status as string,
      signature: row.signature as string | undefined,
    }));
  }

  public async addPendingIssue(issue: PendingIssue): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    await this.client.execute(
      `INSERT INTO pending_issues (id, timestamp, department, items, status, signature) VALUES (?, ?, ?, ?, ?, ?)`, 
      [
        issue.id, issue.timestamp, issue.department, JSON.stringify(issue.items),
        issue.status, issue.signature || null
      ]
    );
  }

  public async updatePendingIssue(issue: PendingIssue): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    await this.client.execute(
      `UPDATE pending_issues SET timestamp = ?, department = ?, items = ?, status = ?, signature = ? WHERE id = ?`, 
      [
        issue.timestamp, issue.department, JSON.stringify(issue.items),
        issue.status, issue.signature || null, issue.id
      ]
    );
  }

  public async deletePendingIssue(id: string): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    await this.client.execute("DELETE FROM pending_issues WHERE id = ?", [id]);
  }

  public async getExternalRequests(): Promise<ExternalRequest[]> {
    if (!this.client) throw new Error("Database not initialized.");
    const rs = await this.client.execute("SELECT * FROM external_requests ORDER BY timestamp DESC");
    return rs.rows.map(row => ({
      id: row.id as string,
      timestamp: row.timestamp as number,
      type: row.type as string,
      status: row.status as string,
      details: JSON.parse(row.details as string),
    }));
  }

  public async addExternalRequest(request: ExternalRequest): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    await this.client.execute(
      `INSERT INTO external_requests (id, timestamp, type, status, details) VALUES (?, ?, ?, ?, ?)`, 
      [
        request.id, request.timestamp, request.type, request.status, JSON.stringify(request.details)
      ]
    );
  }

  public async getConfig(): Promise<Config | null> {
    if (!this.client) throw new Error("Database not initialized.");
    const rs = await this.client.execute("SELECT * FROM config WHERE id = 'app_config'");
    if (rs.rows.length === 0) return null;
    const row = rs.rows[0];
    return {
      categories: JSON.parse(row.categories as string),
      departments: JSON.parse(row.departments as string),
      zones: JSON.parse(row.zones as string),
    };
  }

  public async updateConfig(config: Config): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    await this.client.execute(
      `INSERT OR REPLACE INTO config (id, categories, departments, zones) VALUES (?, ?, ?, ?)`, 
      [
        'app_config', JSON.stringify(config.categories),
        JSON.stringify(config.departments), JSON.stringify(config.zones)
      ]
    );
  }

  public async setCredentials(url: string, token: string): Promise<boolean> {
    this.tursoUrl = url;
    this.tursoToken = token;
    localStorage.setItem('TURSO_URL', url);
    localStorage.setItem('TURSO_TOKEN', token);
    this.client = null; // Force re-initialization
    return this.initialize();
  }

    public async disconnectCloud(): Promise<void> {
    localStorage.removeItem('TURSO_URL');
    localStorage.removeItem('TURSO_TOKEN');
    this.tursoUrl = process.env.VITE_TURSO_URL;
    this.tursoToken = process.env.VITE_TURSO_TOKEN;
    this.client = null;
  }

  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.tursoUrl || !this.tursoToken) {
      return { success: false, error: 'Credentials not set.' };
    }
    try {
      const testClient = createClient({ url: this.tursoUrl, authToken: this.tursoToken });
      await testClient.execute('SELECT 1');
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message };
    }
  }
}

export const db = new Database();
