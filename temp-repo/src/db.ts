import { createClient, Client } from '@libsql/client';
import { InventoryItem, Transaction, PendingIssue, Config } from './types';

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

    // Helper to check if a table needs migration
    const checkSchema = async (tableName: string, requiredColumns: Record<string, string>): Promise<boolean> => {
      const tableInfo = await this.client!.execute(`PRAGMA table_info(${tableName})`);
      if (tableInfo.rows.length === 0) return true; // Table doesn't exist

      const existingCols = tableInfo.rows.reduce((acc, row) => {
        acc[row.name as string] = (row.type as string).toUpperCase();
        return acc;
      }, {} as Record<string, string>);

      for (const [col, type] of Object.entries(requiredColumns)) {
        if (!existingCols[col]) return true; // Missing column
        // Check for type mismatch (allow some flexibility, e.g. INTEGER vs INT, but REAL vs TEXT is bad)
        const existType = existingCols[col];
        if (type.includes('REAL') && !existType.includes('REAL') && !existType.includes('FLOAT') && !existType.includes('DOUBLE')) return true;
        if (type.includes('INTEGER') && !existType.includes('INT')) return true;
      }
      return false;
    };

    const inventoryCols = {
      id: 'TEXT', sku: 'TEXT', name: 'TEXT', category: 'TEXT', uom: 'TEXT',
      unit_cost: 'REAL', par_stock: 'REAL', initial_par_stock: 'REAL',
      is_fast_moving: 'INTEGER', stock_json: 'TEXT', batches_json: 'TEXT', earliest_expiry: 'TEXT'
    };

    const transactionsCols = {
      id: 'TEXT', timestamp: 'TEXT', user: 'TEXT', action: 'TEXT', qty: 'REAL',
      item_sku: 'TEXT', item_name: 'TEXT', item_uom: 'TEXT', source_zone: 'TEXT',
      dest_zone: 'TEXT', department: 'TEXT', signature: 'TEXT', receiver_name: 'TEXT', pr_number: 'TEXT'
    };

    // Inventory Migration
    if (await checkSchema('inventory', inventoryCols)) {
      console.log("Migrating inventory table...");
      // Check if table exists to decide whether to rename or just create
      const exists = (await this.client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'")).rows.length > 0;
      
      if (exists) {
        await this.client.execute("ALTER TABLE inventory RENAME TO inventory_old");
      }

      await this.client.execute(`
        CREATE TABLE inventory (
          id TEXT PRIMARY KEY,
          sku TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          uom TEXT NOT NULL,
          unit_cost REAL NOT NULL DEFAULT 0,
          par_stock REAL NOT NULL DEFAULT 0,
          initial_par_stock REAL NOT NULL DEFAULT 0,
          is_fast_moving INTEGER NOT NULL DEFAULT 0,
          stock_json TEXT NOT NULL DEFAULT '{}',
          batches_json TEXT NOT NULL DEFAULT '[]',
          earliest_expiry TEXT NOT NULL DEFAULT '2099-12-31'
        );
      `);

      if (exists) {
        // Try to recover data
        try {
          // Get columns from old table to see what we can copy
          const oldCols = (await this.client.execute("PRAGMA table_info(inventory_old)")).rows.map(r => r.name as string);
          
          // Map old columns to new columns (handle camelCase to snake_case)
          const mapping: Record<string, string> = {
            id: 'id', sku: 'sku', name: 'name', category: 'category', uom: 'uom',
            unit_cost: oldCols.includes('unit_cost') ? 'unit_cost' : 'unitCost',
            par_stock: oldCols.includes('par_stock') ? 'par_stock' : 'parStock',
            initial_par_stock: oldCols.includes('initial_par_stock') ? 'initial_par_stock' : 'initialParStock',
            is_fast_moving: oldCols.includes('is_fast_moving') ? 'is_fast_moving' : 'isFastMoving',
            stock_json: oldCols.includes('stock_json') ? 'stock_json' : 'stock',
            batches_json: oldCols.includes('batches_json') ? 'batches_json' : 'batches',
            earliest_expiry: oldCols.includes('earliest_expiry') ? 'earliest_expiry' : 'earliestExpiry'
          };

          const selectParts = Object.entries(mapping).map(([newCol, oldCol]) => {
            if (oldCols.includes(oldCol)) {
              if (newCol === 'unit_cost' || newCol === 'par_stock' || newCol === 'initial_par_stock') {
                return `CAST(COALESCE(${oldCol}, 0) AS REAL)`;
              }
              if (newCol === 'is_fast_moving') {
                return `CAST(COALESCE(${oldCol}, 0) AS INTEGER)`;
              }
              return oldCol;
            }
            // Default values for missing columns
            if (newCol.includes('json')) return "'[]'";
            if (newCol === 'stock_json') return "'{}'";
            if (newCol === 'earliest_expiry') return "'2099-12-31'";
            if (newCol === 'unit_cost' || newCol === 'par_stock' || newCol === 'initial_par_stock' || newCol === 'is_fast_moving') return "0";
            return "''";
          });

          await this.client.execute(`
            INSERT INTO inventory (${Object.keys(mapping).join(', ')})
            SELECT ${selectParts.join(', ')} FROM inventory_old
          `);
        } catch (e) {
          console.error("Failed to migrate inventory data:", e);
        }
        await this.client.execute("DROP TABLE inventory_old");
      }
    }

    // Transactions Migration
    if (await checkSchema('transactions', transactionsCols)) {
      console.log("Migrating transactions table...");
      const exists = (await this.client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")).rows.length > 0;
      
      if (exists) {
        await this.client.execute("ALTER TABLE transactions RENAME TO transactions_old");
      }

      await this.client.execute(`
        CREATE TABLE transactions (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          user TEXT NOT NULL,
          action TEXT NOT NULL,
          qty REAL NOT NULL DEFAULT 0,
          item_sku TEXT NOT NULL,
          item_name TEXT NOT NULL,
          item_uom TEXT,
          source_zone TEXT,
          dest_zone TEXT NOT NULL,
          department TEXT,
          signature TEXT,
          receiver_name TEXT,
          pr_number TEXT
        );
      `);

      if (exists) {
        try {
          const oldCols = (await this.client.execute("PRAGMA table_info(transactions_old)")).rows.map(r => r.name as string);
          const mapping: Record<string, string> = {
            id: 'id', timestamp: 'timestamp', user: 'user', action: 'action', qty: 'qty',
            item_sku: oldCols.includes('item_sku') ? 'item_sku' : 'itemSku',
            item_name: oldCols.includes('item_name') ? 'item_name' : 'itemName',
            item_uom: oldCols.includes('item_uom') ? 'item_uom' : 'itemUom',
            source_zone: oldCols.includes('source_zone') ? 'source_zone' : 'sourceZone',
            dest_zone: oldCols.includes('dest_zone') ? 'dest_zone' : 'destZone',
            department: 'department', signature: 'signature',
            receiver_name: oldCols.includes('receiver_name') ? 'receiver_name' : 'receiverName',
            pr_number: oldCols.includes('pr_number') ? 'pr_number' : 'prNumber'
          };

          const selectParts = Object.entries(mapping).map(([newCol, oldCol]) => {
            if (oldCols.includes(oldCol)) {
              if (newCol === 'qty') return `CAST(COALESCE(${oldCol}, 0) AS REAL)`;
              return oldCol;
            }
            if (newCol === 'qty') return "0";
            return "NULL";
          });

          await this.client.execute(`
            INSERT INTO transactions (${Object.keys(mapping).join(', ')})
            SELECT ${selectParts.join(', ')} FROM transactions_old
          `);
        } catch (e) {
          console.error("Failed to migrate transactions data:", e);
        }
        await this.client.execute("DROP TABLE transactions_old");
      }
    }

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS pending_issues (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        user TEXT NOT NULL,
        receiverName TEXT,
        department TEXT NOT NULL,
        signature TEXT,
        items TEXT NOT NULL, -- JSON string of CartItem[]
        status TEXT NOT NULL
      );
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS config (
        id TEXT PRIMARY KEY DEFAULT 'app_config',
        categories TEXT NOT NULL,
        departments TEXT NOT NULL,
        zones TEXT NOT NULL,
        adminPassword TEXT NOT NULL DEFAULT 'sunlight2024'
      );
    `);

    // Insert default config if not exists
    await this.client.execute(`
      INSERT OR IGNORE INTO config (id, categories, departments, zones, adminPassword) VALUES (
        'app_config',
        '["Dry Goods", "Alcohol", "Guest Supplies", "Chemicals", "Food", "Beverage", "Supplies", "Equipment", "Other"]',
        '["Kitchen", "Bar", "Housekeeping", "Front Desk", "Maintenance", "Restaurant", "Admin"]',
        '["Main (On-site 25sqm)", "Satellite (On-site 10sqm)", "Bulk (4.5km Off-site 30sqm)", "Utility (4.5km Off-site 15sqm)", "Main Storage", "Kitchen Fridge", "Bar Stock", "Cleaning Supply", "Office"]',
        'sunlight2024'
      );
    `);
  }

  private safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
    if (!json) return fallback;
    try {
      return JSON.parse(json);
    } catch (e) {
      console.warn("Failed to parse JSON:", json, e);
      return fallback;
    }
  }

  public async getInventory(): Promise<InventoryItem[]> {
    if (!this.client) throw new Error("Database not initialized.");
    const rs = await this.client.execute("SELECT * FROM inventory");
    return rs.rows.map(row => ({
      id: row.id as string,
      sku: row.sku as string,
      name: row.name as string,
      category: row.category as string,
      uom: row.uom as string,
      unitCost: row.unit_cost as number,
      parStock: row.par_stock as number,
      initialParStock: row.initial_par_stock as number,
      isFastMoving: Boolean(row.is_fast_moving),
      stock: this.safeJsonParse(row.stock_json as string, {}),
      batches: this.safeJsonParse(row.batches_json as string, []),
      earliestExpiry: row.earliest_expiry as string,
    }));
  }

  public async updateInventory(items: InventoryItem[]): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    const tx = await this.client.transaction();
    try {
      for (const item of items) {
        // Ensure numeric values are valid
        const unitCost = isNaN(item.unitCost) ? 0 : item.unitCost;
        const parStock = isNaN(item.parStock) ? 0 : item.parStock;
        const initialParStock = isNaN(item.initialParStock) ? 0 : item.initialParStock;

        await tx.execute(
          `INSERT OR REPLACE INTO inventory (id, sku, name, category, uom, unit_cost, par_stock, initial_par_stock, is_fast_moving, stock_json, batches_json, earliest_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [
            item.id, item.sku, item.name, item.category, item.uom, unitCost, 
            parStock, initialParStock, item.isFastMoving ? 1 : 0,
            JSON.stringify(item.stock), JSON.stringify(item.batches), item.earliestExpiry
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

  public async getTransactions(): Promise<Transaction[]> {
    if (!this.client) throw new Error("Database not initialized.");
    const rs = await this.client.execute("SELECT * FROM transactions ORDER BY timestamp DESC");
    return rs.rows.map(row => ({
      id: row.id as string,
      timestamp: row.timestamp as string,
      user: row.user as string,
      action: row.action as 'ISSUE' | 'TRANSFER' | 'RECEIVE',
      qty: row.qty as number,
      itemSku: row.item_sku as string,
      itemName: row.item_name as string,
      itemUom: row.item_uom as string | undefined,
      sourceZone: row.source_zone as string | undefined,
      destZone: row.dest_zone as string,
      department: row.department as string | undefined,
      signature: row.signature as string | undefined,
      receiverName: row.receiver_name as string | undefined,
      prNumber: row.pr_number as string | undefined,
    }));
  }

  public async addTransactions(transactions: Transaction[]): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    const tx = await this.client.transaction();
    try {
      for (const t of transactions) {
        const qty = isNaN(t.qty) ? 0 : t.qty;
        await tx.execute(
          `INSERT INTO transactions (id, timestamp, user, action, qty, item_sku, item_name, item_uom, source_zone, dest_zone, department, signature, receiver_name, pr_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [
            t.id, t.timestamp, t.user, t.action, qty, t.itemSku, t.itemName, 
            t.itemUom || null, t.sourceZone || null, t.destZone, t.department || null, 
            t.signature || null, t.receiverName || null, t.prNumber || null
          ]
        );
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  public async updateTransactions(transactions: Transaction[]): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    const tx = await this.client.transaction();
    try {
      await tx.execute("DELETE FROM transactions");
      for (const t of transactions) {
        await tx.execute(
          `INSERT INTO transactions (id, timestamp, user, action, qty, item_sku, item_name, item_uom, source_zone, dest_zone, department, signature, receiver_name, pr_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [
            t.id, t.timestamp, t.user, t.action, t.qty, t.itemSku, t.itemName, 
            t.itemUom || null, t.sourceZone || null, t.destZone, t.department || null, 
            t.signature || null, t.receiverName || null, t.prNumber || null
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
      timestamp: row.timestamp as string,
      user: row.user as string,
      receiverName: row.receiverName as string | undefined,
      department: row.department as string,
      signature: row.signature as string | undefined,
      items: this.safeJsonParse(row.items as string, []),
      status: row.status as 'pending' | 'released' | 'in progress',
    }));
  }

  public async updatePendingIssues(issues: PendingIssue[]): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    const tx = await this.client.transaction();
    try {
      for (const issue of issues) {
        await tx.execute(
          `INSERT OR REPLACE INTO pending_issues (id, timestamp, user, receiverName, department, signature, items, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          [
            issue.id, issue.timestamp, issue.user, issue.receiverName || null,
            issue.department, issue.signature || null, JSON.stringify(issue.items),
            issue.status
          ]
        );
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  public async deletePendingIssue(id: string): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    await this.client.execute("DELETE FROM pending_issues WHERE id = ?", [id]);
  }

  public async updateExternalRequestStatus(id: string, status: string): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    // For now, we just update the status in pending_issues if it exists there
    await this.client.execute("UPDATE pending_issues SET status = ? WHERE id = ?", [status.toLowerCase(), id]);
  }

  public async getExternalRequests(): Promise<PendingIssue[]> {
    if (!this.client) throw new Error("Database not initialized.");
    // In this app, external requests are stored in pending_issues with a specific ID prefix or just all pending issues
    // Based on App.tsx line 371: finalizedReq.id.startsWith('SGHC')
    const rs = await this.client.execute("SELECT * FROM pending_issues WHERE id LIKE 'SGHC%' ORDER BY timestamp DESC");
    return rs.rows.map(row => ({
      id: row.id as string,
      timestamp: row.timestamp as string,
      user: row.user as string,
      receiverName: row.receiverName as string | undefined,
      department: row.department as string,
      signature: row.signature as string | undefined,
      items: this.safeJsonParse(row.items as string, []),
      status: row.status as 'pending' | 'released' | 'in progress',
    }));
  }

  public async getConfig(): Promise<Config | null> {
    if (!this.client) throw new Error("Database not initialized.");
    const rs = await this.client.execute("SELECT * FROM config WHERE id = 'app_config'");
    if (rs.rows.length === 0) return null;
    const row = rs.rows[0];
    return {
      categories: this.safeJsonParse(row.categories as string, []),
      departments: this.safeJsonParse(row.departments as string, []),
      zones: this.safeJsonParse(row.zones as string, []),
    };
  }

  public async saveConfig(config: Config): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    await this.client.execute(
      `UPDATE config SET categories = ?, departments = ?, zones = ? WHERE id = 'app_config'`, 
      [
        JSON.stringify(config.categories),
        JSON.stringify(config.departments),
        JSON.stringify(config.zones)
      ]
    );
  }

  public async getAdminPassword(): Promise<string> {
    if (!this.client) throw new Error("Database not initialized.");
    const rs = await this.client.execute("SELECT adminPassword FROM config WHERE id = 'app_config'");
    if (rs.rows.length === 0) return 'sunlight2024';
    return rs.rows[0].adminPassword as string;
  }

  public async pushState(inventory: InventoryItem[], transactions: Transaction[], pendingIssues: PendingIssue[]): Promise<void> {
    if (!this.client) throw new Error("Database not initialized.");
    const tx = await this.client.transaction();
    try {
      await tx.execute("DELETE FROM inventory");
      await tx.execute("DELETE FROM transactions");
      await tx.execute("DELETE FROM pending_issues");

      for (const item of inventory) {
        const unitCost = isNaN(item.unitCost) ? 0 : item.unitCost;
        const parStock = isNaN(item.parStock) ? 0 : item.parStock;
        const initialParStock = isNaN(item.initialParStock) ? 0 : item.initialParStock;

        await tx.execute(
          `INSERT INTO inventory (id, sku, name, category, uom, unit_cost, par_stock, initial_par_stock, is_fast_moving, stock_json, batches_json, earliest_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [
            item.id, item.sku, item.name, item.category, item.uom, unitCost, 
            parStock, initialParStock, item.isFastMoving ? 1 : 0,
            JSON.stringify(item.stock), JSON.stringify(item.batches), item.earliestExpiry
          ]
        );
      }

      for (const t of transactions) {
        const qty = isNaN(t.qty) ? 0 : t.qty;
        await tx.execute(
          `INSERT INTO transactions (id, timestamp, user, action, qty, item_sku, item_name, item_uom, source_zone, dest_zone, department, signature, receiver_name, pr_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [
            t.id, t.timestamp, t.user, t.action, qty, t.itemSku, t.itemName, 
            t.itemUom || null, t.sourceZone || null, t.destZone, t.department || null, 
            t.signature || null, t.receiverName || null, t.prNumber || null
          ]
        );
      }

      for (const issue of pendingIssues) {
        await tx.execute(
          `INSERT INTO pending_issues (id, timestamp, user, receiverName, department, signature, items, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          [
            issue.id, issue.timestamp, issue.user, issue.receiverName || null,
            issue.department, issue.signature || null, JSON.stringify(issue.items),
            issue.status
          ]
        );
      }

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
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
