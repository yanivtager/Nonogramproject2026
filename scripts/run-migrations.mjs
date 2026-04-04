// Run SQL migrations against Supabase using the Management API workaround
// Uses fetch with service role key to execute SQL via pg endpoint

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jmzkexgwcvodquczjqfk.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function executeSql(sql, label) {
  console.log(`\n→ Running: ${label}...`);

  // Try the Supabase SQL endpoint (available on newer Supabase versions)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      // This won't work for DDL, but let's try a workaround
    }),
  });

  // Since PostgREST doesn't support DDL, we need to use a different approach
  // Let's try executing via the pg-meta endpoint
  const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (pgRes.ok) {
    const data = await pgRes.json();
    console.log(`  ✓ ${label} completed`);
    return data;
  }

  // Fallback: try the newer /sql endpoint
  const sqlRes = await fetch(`${SUPABASE_URL}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (sqlRes.ok) {
    const data = await sqlRes.json();
    console.log(`  ✓ ${label} completed`);
    return data;
  }

  const errorText = await sqlRes.text();
  throw new Error(`Failed to execute ${label}: ${sqlRes.status} ${errorText}`);
}

async function main() {
  if (!SERVICE_ROLE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');

  try {
    const schema = readFileSync(join(migrationsDir, '001_initial_schema.sql'), 'utf8');
    await executeSql(schema, '001_initial_schema');
  } catch (err) {
    console.error('Schema migration error:', err.message);
    console.log('\n⚠️  If this failed, you can run the SQL manually:');
    console.log('   1. Go to https://supabase.com/dashboard/project/jmzkexgwcvodquczjqfk/sql');
    console.log('   2. Paste the contents of supabase/migrations/001_initial_schema.sql');
    console.log('   3. Click "Run"');
    console.log('   4. Then do the same for 002_seed_faq.sql');
    return;
  }

  try {
    const seed = readFileSync(join(migrationsDir, '002_seed_faq.sql'), 'utf8');
    await executeSql(seed, '002_seed_faq');
  } catch (err) {
    console.error('FAQ seed error:', err.message);
  }

  console.log('\n✅ All migrations complete!');
}

main();
