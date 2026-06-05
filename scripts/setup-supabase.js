/**
 * One-time setup: apply schema + create admin user.
 * Usage: node scripts/setup-supabase.js
 * Requires .env.local from `npx vercel env pull`
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env.local — run: npx vercel env pull');
    process.exit(1);
  }
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)="?([^"]*)"?\s*$/);
    if (m) process.env[m[1].trim()] = m[2];
  });
}

async function runSql() {
  const pg = require('pg');
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!url) throw new Error('No POSTGRES_URL in env');

  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('✓ Schema applied');
}

async function createAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@aesthete.hr',
      password: 'admin',
      email_confirm: true,
      user_metadata: { role: 'admin' },
    }),
  });

  const body = await res.json();
  if (res.ok) {
    console.log('✓ Admin user created: admin@aesthete.hr');
    return;
  }
  if (body.msg?.includes('already') || body.message?.includes('already')) {
    console.log('✓ Admin user already exists');
    return;
  }
  throw new Error(JSON.stringify(body));
}

async function main() {
  loadEnv();
  await runSql();
  await createAdmin();
  console.log('Setup complete.');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
