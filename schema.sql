-- Cloudflare D1 Schema for Maxio Aerial Drone Portfolio
-- Run with: npx wrangler d1 execute maxio-sample1-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS pilot_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status_text TEXT NOT NULL,
  airspace_clearance TEXT NOT NULL,
  base_location TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pilot_status (status_text, airspace_clearance, base_location)
SELECT 'CLEAR FOR DISPATCH — EASA A2 / STS CERTIFIED', 'GREEN (DK / EU OPEN & SPECIFIC)', 'AARHUS / COPENHAGEN, DENMARK'
WHERE NOT EXISTS (SELECT 1 FROM pilot_status);

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  service TEXT NOT NULL,
  location TEXT,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
