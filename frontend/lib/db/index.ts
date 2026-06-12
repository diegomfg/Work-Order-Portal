import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'workorders.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Run schema on first connection
  // Try multiple paths to handle both dev and production environments
  const possiblePaths = [
    path.join(process.cwd(), 'lib', 'db', 'schema.sql'),
    path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql'),
    path.join(__dirname, 'schema.sql'),
  ];

  for (const schemaPath of possiblePaths) {
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
      break;
    }
  }

  return db;
}

// Types matching the database schema
export interface WorkOrder {
  id: number;
  customer_id: number;
  customer: string;
  tag: string | null;
  tech: string | null;
  in_date: string;
  start_date: string | null;
  compl_date: string | null;
  out_date: string | null;
  mfr: string;
  model: string;
  description: string;
  serial: string | null;
  type: 'lawn' | '2cycle' | 'other';
  status: 'completed' | 'warranty' | 'nwf' | 'review' | 'inprogress';
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadRecord {
  id: number;
  filename: string;
  uploaded_at: string;
  wo_count: number;
  inserted: number;
  updated: number;
}

// Get last_updated timestamp from meta table
export function getLastUpdated(): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM meta WHERE key = 'last_updated'").get() as { value: string | null } | undefined;
  return row?.value ?? null;
}

// Set last_updated timestamp
export function setLastUpdated(timestamp: string): void {
  const db = getDb();
  db.prepare("UPDATE meta SET value = ? WHERE key = 'last_updated'").run(timestamp);
}

// Upsert work orders (returns counts of inserted vs updated)
export function upsertWorkOrders(workorders: Omit<WorkOrder, 'created_at' | 'updated_at'>[]): { inserted: number; updated: number } {
  const db = getDb();

  const upsert = db.prepare(`
    INSERT INTO workorders (
      id, customer_id, customer, tag, tech, in_date, start_date, compl_date, out_date,
      mfr, model, description, serial, type, status, comments
    ) VALUES (
      @id, @customer_id, @customer, @tag, @tech, @in_date, @start_date, @compl_date, @out_date,
      @mfr, @model, @description, @serial, @type, @status, @comments
    )
    ON CONFLICT(id) DO UPDATE SET
      customer_id = excluded.customer_id,
      customer    = excluded.customer,
      tag         = excluded.tag,
      tech        = excluded.tech,
      in_date     = excluded.in_date,
      start_date  = excluded.start_date,
      compl_date  = excluded.compl_date,
      out_date    = excluded.out_date,
      mfr         = excluded.mfr,
      model       = excluded.model,
      description = excluded.description,
      serial      = excluded.serial,
      type        = excluded.type,
      status      = excluded.status,
      comments    = excluded.comments,
      updated_at  = datetime('now')
  `);

  const checkExists = db.prepare('SELECT 1 FROM workorders WHERE id = ?');

  let inserted = 0;
  let updated = 0;

  const runUpserts = db.transaction((wos: typeof workorders) => {
    for (const wo of wos) {
      const exists = checkExists.get(wo.id);
      upsert.run(wo);
      if (exists) {
        updated++;
      } else {
        inserted++;
      }
    }
  });

  runUpserts(workorders);

  return { inserted, updated };
}

// Log an upload to the uploads table
export function logUpload(filename: string, woCount: number, inserted: number, updated: number): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO uploads (filename, wo_count, inserted, updated)
    VALUES (?, ?, ?, ?)
  `).run(filename, woCount, inserted, updated);

  return result.lastInsertRowid as number;
}

// Get recent uploads for admin dashboard
export function getRecentUploads(limit = 10): UploadRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM uploads
    ORDER BY uploaded_at DESC
    LIMIT ?
  `).all(limit) as UploadRecord[];
}

// Get work order counts by status (for admin dashboard stats)
export function getStatusCounts(): Record<string, number> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM workorders
    GROUP BY status
  `).all() as { status: string; count: number }[];

  const counts: Record<string, number> = {
    completed: 0,
    warranty: 0,
    nwf: 0,
    review: 0,
    inprogress: 0,
  };

  for (const row of rows) {
    counts[row.status] = row.count;
  }

  return counts;
}

// Get total work order count
export function getTotalCount(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM workorders').get() as { count: number };
  return row.count;
}

// Search work orders (for customer portal)
export function searchWorkOrders(query: string): Omit<WorkOrder, 'tech'>[] {
  const db = getDb();

  // Try exact WO ID match first
  const numericQuery = parseInt(query, 10);
  if (!isNaN(numericQuery)) {
    const byId = db.prepare(`
      SELECT id, customer_id, customer, tag, in_date, start_date, compl_date, out_date,
             mfr, model, description, serial, type, status, comments, created_at, updated_at
      FROM workorders WHERE id = ?
    `).all(numericQuery) as Omit<WorkOrder, 'tech'>[];
    if (byId.length > 0) return byId;
  }

  // Search by customer_id, serial (partial match)
  const pattern = `%${query}%`;
  return db.prepare(`
    SELECT id, customer_id, customer, tag, in_date, start_date, compl_date, out_date,
           mfr, model, description, serial, type, status, comments, created_at, updated_at
    FROM workorders
    WHERE customer_id = ?
       OR serial LIKE ?
    ORDER BY in_date DESC
    LIMIT 50
  `).all(numericQuery || 0, pattern) as Omit<WorkOrder, 'tech'>[];
}

// Get work orders with pagination (for admin table)
export function getWorkOrdersPaginated(
  page: number,
  limit: number,
  filters?: { status?: string; type?: string }
): { workorders: WorkOrder[]; total: number } {
  const db = getDb();
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const filterParams: (string | number)[] = [];

  if (filters?.status) {
    conditions.push('status = ?');
    filterParams.push(filters.status);
  }
  if (filters?.type) {
    conditions.push('type = ?');
    filterParams.push(filters.type);
  }

  const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  const row = db.prepare(`SELECT COUNT(*) as count FROM workorders${where}`).get(...filterParams) as { count: number };
  const workorders = db.prepare(`SELECT * FROM workorders${where} ORDER BY in_date DESC LIMIT ? OFFSET ?`).all(...filterParams, limit, offset) as WorkOrder[];

  return { workorders, total: row.count };
}

// Get all work orders (for admin, includes tech field)
export function getAllWorkOrders(filters?: { status?: string; type?: string }): WorkOrder[] {
  const db = getDb();

  let query = 'SELECT * FROM workorders';
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters?.type) {
    conditions.push('type = ?');
    params.push(filters.type);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY in_date DESC';

  return db.prepare(query).all(...params) as WorkOrder[];
}
