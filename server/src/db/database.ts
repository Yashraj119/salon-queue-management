import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const defaultDatabasePath = resolve(moduleDirectory, '../../data/salon-queue.sqlite');
mkdirSync(dirname(defaultDatabasePath), { recursive: true });

export const database = new DatabaseSync(process.env.DATABASE_PATH ?? defaultDatabasePath);
database.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
