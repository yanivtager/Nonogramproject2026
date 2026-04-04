#!/usr/bin/env node
// Daily summary — runs at 22:00 Israel time
// Compiles today's activity and sends summary email to Yaniv

import { supabase, getPendingEscalations, logActivity } from '../lib/supabase.mjs';
import { sendDailySummary } from '../lib/email.mjs';

async function main() {
  console.log(`[${new Date().toISOString()}] Compiling daily summary...`);
  const today = new Date().toISOString().split('T')[0];
  const todayStart = `${today}T00:00:00.000Z`;

  // Posts published today
  const { data: posts } = await supabase
    .from('marketing_posts')
    .select('platform, copy_text, platform_post_url')
    .eq('status', 'posted')
    .gte('posted_at', todayStart);

  const postsPublished = (posts || []).map(p => ({
    platform: p.platform,
    title: p.copy_text?.split('\n')[0]?.substring(0, 80) || 'Untitled',
    url: p.platform_post_url || '#',
  }));

  // Messages handled today
  const { data: msgs } = await supabase
    .from('messages_inbox')
    .select('category, auto_responded, escalated')
    .gte('created_at', todayStart);

  const messagesHandled = {
    total: msgs?.length || 0,
    autoResponded: msgs?.filter(m => m.auto_responded).length || 0,
    escalated: msgs?.filter(m => m.escalated).length || 0,
    spam: msgs?.filter(m => m.category === 'spam').length || 0,
  };

  // Pending escalations
  const pending = await getPendingEscalations();
  const escalationsPending = pending.map(e => ({
    platform: e.messages_inbox?.platform || 'unknown',
    sender: e.messages_inbox?.sender || 'unknown',
    created_at: e.created_at,
  }));

  // Errors today
  const { data: errorLogs } = await supabase
    .from('activity_log')
    .select('action_type, error_message, platform')
    .eq('status', 'failure')
    .gte('created_at', todayStart);

  const errors = (errorLogs || []).map(e => `${e.platform || ''} ${e.action_type}: ${e.error_message}`);

  // Send the email
  await sendDailySummary({
    postsPublished,
    messagesHandled,
    escalationsPending,
    topContent: [],
    errors,
  });

  console.log(`Daily summary sent: ${postsPublished.length} posts, ${messagesHandled.total} messages, ${escalationsPending.length} pending escalations.`);
  await logActivity('daily_summary_sent', null, { postsPublished: postsPublished.length, messages: messagesHandled.total });
}

main().catch(err => {
  console.error('Daily summary failed:', err);
  process.exit(1);
});
