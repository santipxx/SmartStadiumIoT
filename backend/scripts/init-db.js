const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function shouldUseSsl() {
  const sslMode = (process.env.DB_SSL || process.env.PGSSLMODE || '').toLowerCase();

  return sslMode === 'true' || sslMode === 'require';
}

function createClient() {
  const ssl = shouldUseSsl() ? { rejectUnauthorized: false } : undefined;

  if (process.env.DATABASE_URL) {
    return new Client({
      connectionString: process.env.DATABASE_URL,
      ssl,
    });
  }

  return new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl,
  });
}

async function main() {
  loadDotEnv();

  const sqlPath = path.join(__dirname, '..', 'database', 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = createClient();

  await client.connect();
  await client.query(sql);
  await client.end();

  console.log('Database schema and seed data are ready.');
}

main().catch((error) => {
  console.error('Database initialization failed.');
  console.error(error);
  process.exit(1);
});
