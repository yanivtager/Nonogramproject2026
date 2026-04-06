#!/usr/bin/env node
// Triggers the weekly digest email — runs every Sunday at 17:00 UTC (20:00 Israel)
// Calls the Supabase Edge Function which sends the approval email

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

async function main() {
  console.log(`[${new Date().toISOString()}] Triggering weekly digest email...`);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/weekly-digest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Weekly digest failed:', data);
    process.exit(1);
  }

  console.log('Weekly digest result:', data);
}

main().catch(err => {
  console.error('Weekly digest trigger failed:', err);
  process.exit(1);
});
