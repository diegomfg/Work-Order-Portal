-- Work Order Portal Database Schema
-- SQLite (dev) / PostgreSQL (prod)

-- Main work orders table
CREATE TABLE IF NOT EXISTS workorders (
  id           INTEGER PRIMARY KEY,      -- WO ID from Ideal (e.g., 1398925)
  customer_id  INTEGER NOT NULL,         -- Ideal's internal customer number
  customer     TEXT NOT NULL,            -- "LAST, FIRST" or "COMPANY NAME"
  tag          TEXT,                     -- Shop's equipment tag
  tech         TEXT,                     -- Technician initials (internal only, never shown to customers)
  in_date      TEXT NOT NULL,            -- ISO date: "2026-03-31"
  start_date   TEXT,                     -- Date work began (nullable)
  compl_date   TEXT,                     -- Date work completed (nullable)
  out_date     TEXT,                     -- Date equipment left shop (nullable)
  mfr          TEXT NOT NULL,            -- Normalized manufacturer name: "Stihl", not "STI"
  model        TEXT NOT NULL,            -- Model code
  description  TEXT NOT NULL,            -- Human-readable equipment description
  serial       TEXT,                     -- Serial number (sometimes a customer-name placeholder)
  meter        TEXT,                     -- Hour meter reading (null for handheld equipment)
  type         TEXT NOT NULL             -- 'lawn' | '2cycle' | 'other'
    CHECK (type IN ('lawn', '2cycle', 'other')),
  status       TEXT NOT NULL             -- 'completed' | 'warranty' | 'nwf' | 'review' | 'inprogress'
    CHECK (status IN ('completed', 'warranty', 'nwf', 'review', 'inprogress')),
  comments     TEXT,                     -- Technician notes (shown to customer)
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

-- Indexes for customer portal lookups (WO ID, serial, customer ID)
CREATE INDEX IF NOT EXISTS idx_workorders_customer_id ON workorders(customer_id);
CREATE INDEX IF NOT EXISTS idx_workorders_serial ON workorders(serial);

-- Indexes for admin dashboard filters
CREATE INDEX IF NOT EXISTS idx_workorders_status ON workorders(status);
CREATE INDEX IF NOT EXISTS idx_workorders_type ON workorders(type);
CREATE INDEX IF NOT EXISTS idx_workorders_in_date ON workorders(in_date);

-- Meta table for app-wide settings (e.g., last_updated timestamp)
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Seed last_updated key
INSERT OR IGNORE INTO meta (key, value) VALUES ('last_updated', NULL);

-- Upload history log (for admin dashboard)
CREATE TABLE IF NOT EXISTS uploads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  filename     TEXT NOT NULL,            -- Original PDF filename
  uploaded_at  TEXT DEFAULT (datetime('now')),
  wo_count     INTEGER NOT NULL,         -- Total WOs parsed from file
  inserted     INTEGER NOT NULL,         -- New WOs added
  updated      INTEGER NOT NULL          -- Existing WOs refreshed
);
