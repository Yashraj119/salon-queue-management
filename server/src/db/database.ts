import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeQueueStatuses } from '../queue/queueRules.js';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const defaultDatabasePath = resolve(moduleDirectory, '../../data/salon-queue.sqlite');
const databasePath = process.env.DATABASE_PATH ?? defaultDatabasePath;
mkdirSync(dirname(databasePath), { recursive: true });

export const database = new DatabaseSync(databasePath);
database.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export function withTransaction<T>(action: () => T): T {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = action();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

database.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_gu TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
    price_rupees INTEGER NOT NULL CHECK(price_rupees >= 0),
    is_available INTEGER NOT NULL DEFAULT 1 CHECK(is_available IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS barbers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Available', 'Busy', 'On break')),
    is_on_duty INTEGER NOT NULL DEFAULT 1 CHECK(is_on_duty IN (0, 1)),
    photo_url TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS salon_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    salon_name TEXT NOT NULL,
    opening_minute INTEGER NOT NULL,
    closing_minute INTEGER NOT NULL,
    online_queue_open INTEGER NOT NULL DEFAULT 1 CHECK(online_queue_open IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS queue_entries (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    token TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    barber_id TEXT REFERENCES barbers(id),
    status TEXT NOT NULL DEFAULT 'Waiting',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS queue_entry_services (
    queue_id TEXT NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id),
    service_name_en TEXT NOT NULL,
    service_name_gu TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price_rupees INTEGER NOT NULL,
    PRIMARY KEY(queue_id, service_id)
  );
`);

const activeStatusSql = activeQueueStatuses.map((status) => `'${status.replaceAll("'", "''")}'`).join(', ');
database.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS one_active_queue_entry_per_phone
  ON queue_entries(phone)
  WHERE status IN (${activeStatusSql})
`);

const serviceCount = (database.prepare('SELECT COUNT(*) AS count FROM services').get() as { count: number }).count;
if (serviceCount === 0) {
  const insertService = database.prepare(
    'INSERT INTO services (name_en, name_gu, duration_minutes, price_rupees) VALUES (?, ?, ?, ?)',
  );
  withTransaction(() => {
    [
      ['Haircut', 'હેરકટ', 30, 150],
      ['Beard trim', 'દાઢી ટ્રિમ', 15, 80],
      ['Hair spa', 'હેર સ્પા', 45, 400],
      ['Hair color', 'વાળનો રંગ', 60, 800],
      ['Head massage', 'માથાની મસાજ', 20, 200],
      ['Cleanup', 'ક્લીનઅપ', 30, 350],
    ].forEach((service) => insertService.run(...service));
  });
}

const barberCount = (database.prepare('SELECT COUNT(*) AS count FROM barbers').get() as { count: number }).count;
if (barberCount === 0) {
  const insertBarber = database.prepare(
    'INSERT INTO barbers (id, name, status, is_on_duty, photo_url) VALUES (?, ?, ?, 1, ?)',
  );
  withTransaction(() => {
    insertBarber.run('ravi', 'Ravi', 'Busy', 'https://randomuser.me/api/portraits/men/32.jpg');
    insertBarber.run('amit', 'Amit', 'Available', 'https://randomuser.me/api/portraits/men/12.jpg');
    insertBarber.run('imran', 'Imran', 'On break', 'https://randomuser.me/api/portraits/men/57.jpg');
  });
}

database.prepare(`
  INSERT OR IGNORE INTO salon_settings (id, salon_name, opening_minute, closing_minute, online_queue_open)
  VALUES (1, 'Salon Queue', 540, 1260, 1)
`).run();
