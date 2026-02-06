import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'alerts.db');

const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    market_name TEXT NOT NULL,
    threshold REAL NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('above', 'below')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create index for faster lookups
db.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id)`);

/**
 * Add a new price alert
 */
export function addAlert({ userId, chatId, marketId, marketName, threshold, direction }) {
  const stmt = db.prepare(`
    INSERT INTO alerts (user_id, chat_id, market_id, market_name, threshold, direction)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, chatId, marketId, marketName, threshold, direction);
  return result.lastInsertRowid;
}

/**
 * Get all alerts for a user
 */
export function getUserAlerts(userId) {
  const stmt = db.prepare(`
    SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC
  `);
  return stmt.all(userId);
}

/**
 * Get all alerts (for polling)
 */
export function getAllAlerts() {
  const stmt = db.prepare(`SELECT * FROM alerts`);
  return stmt.all();
}

/**
 * Delete an alert by ID (must belong to user)
 */
export function deleteAlert(alertId, userId) {
  const stmt = db.prepare(`DELETE FROM alerts WHERE id = ? AND user_id = ?`);
  const result = stmt.run(alertId, userId);
  return result.changes > 0;
}

/**
 * Delete an alert by ID (internal use - after trigger)
 */
export function removeTriggeredAlert(alertId) {
  const stmt = db.prepare(`DELETE FROM alerts WHERE id = ?`);
  stmt.run(alertId);
}

/**
 * Get count of user's alerts
 */
export function getUserAlertCount(userId) {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM alerts WHERE user_id = ?`);
  return stmt.get(userId).count;
}

export default db;
