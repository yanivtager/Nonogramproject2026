// Assign scheduled_at dates to all ready_to_post entries
// Schedule: Tue 08:00 UTC, Thu 16:00 UTC, Sat 12:00 UTC (rotating)
// Usage: export $(grep -v '^#' .env | xargs) && node automation/scripts/schedule-posts.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Start date: first Tuesday after today (2026-04-07 is a Tuesday)
const START_DATE = new Date('2026-04-07T08:00:00Z');

// Posting slots: [dayOfWeek (0=Sun), hour UTC]
const SLOTS = [
  { day: 2, hour: 8 },  // Tuesday 08:00 UTC (Europe morning)
  { day: 4, hour: 16 }, // Thursday 16:00 UTC (USA morning)
  { day: 6, hour: 12 }, // Saturday 12:00 UTC (Asia/AU evening)
];

function getNextSlot(currentDate, slotIndex) {
  const slot = SLOTS[slotIndex % SLOTS.length];
  const date = new Date(currentDate);

  // Find the next occurrence of the target day
  const currentDay = date.getUTCDay();
  let daysToAdd = slot.day - currentDay;
  if (daysToAdd < 0) daysToAdd += 7;
  if (daysToAdd === 0 && date.getUTCHours() >= slot.hour) daysToAdd += 7;

  date.setUTCDate(date.getUTCDate() + daysToAdd);
  date.setUTCHours(slot.hour, 0, 0, 0);
  return date;
}

async function main() {
  // Get all ready_to_post entries
  const { data: posts, error } = await supabase
    .from('marketing_posts')
    .select('id, content_type, platform, copy_text')
    .eq('status', 'ready_to_post')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch posts:', error.message);
    process.exit(1);
  }

  console.log(`Scheduling ${posts.length} posts...`);

  // Assign dates using the 3-slot rotation
  let currentDate = new Date(START_DATE);
  let slotIndex = 0;

  for (const post of posts) {
    const scheduledDate = getNextSlot(currentDate, slotIndex);

    const { error: updateError } = await supabase
      .from('marketing_posts')
      .update({ scheduled_at: scheduledDate.toISOString() })
      .eq('id', post.id);

    if (updateError) {
      console.error(`Failed to schedule ${post.id}:`, updateError.message);
      // If column doesn't exist yet, bail with instructions
      if (updateError.message.includes('scheduled_at')) {
        console.error('\nThe scheduled_at column does not exist yet.');
        console.error('Please run this SQL in Supabase Dashboard → SQL Editor:');
        console.error('  ALTER TABLE marketing_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;');
        process.exit(1);
      }
    } else {
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][scheduledDate.getUTCDay()];
      console.log(`  ${dayName} ${scheduledDate.toISOString().slice(0,16)} — ${post.platform} — ${post.copy_text.slice(0,50)}...`);
    }

    // Move to next slot
    slotIndex++;
    if (slotIndex % 3 === 0) {
      // After completing a full week cycle, advance the current date
      currentDate = new Date(scheduledDate);
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  // Calculate end date
  const lastDate = getNextSlot(currentDate, slotIndex - 1);
  const weeks = Math.ceil(posts.length / 3);
  console.log(`\n${posts.length} posts scheduled across ~${weeks} weeks`);
  console.log(`First post: ${START_DATE.toISOString().slice(0,10)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
