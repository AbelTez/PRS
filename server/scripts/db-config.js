/**
 * Connection config shared by the migrate/seed scripts.
 *
 * Accepts either a managed-provider connection string (`DATABASE_URL` — Neon,
 * Supabase, RDS) or the discrete PG* variables used in local development, so
 * the same commands work against a laptop container and against production.
 */
const path = require('path');

// Load server/.env regardless of the directory the command was started from
// (root package.json scripts run these from the repo root), then fall back to
// a .env in the current working directory. dotenv never overwrites variables
// that are already set, so real environment variables always win.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const ssl = () => {
  const wantsSsl = /sslmode=(require|verify-ca|verify-full)/.test(url || '')
    || process.env.PGSSL === 'true';
  if (!wantsSsl) return undefined;
  return { rejectUnauthorized: process.env.PGSSL_NO_VERIFY !== 'true' };
};

module.exports = url
  ? { connectionString: url, ssl: ssl() }
  : {
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'erl',
    password: process.env.PGPASSWORD || 'erl',
    database: process.env.PGDATABASE || 'erl_dev',
  };
