// Supabase client for logging, FAQ lookups, and escalation management

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Activity Logging ---

export async function logActivity(actionType, platform, details, status = 'success', errorMessage = null) {
  const { error } = await supabase.from('activity_log').insert({
    action_type: actionType,
    platform,
    details,
    status,
    error_message: errorMessage,
  });
  if (error) console.error('Failed to log activity:', error.message);
}

// --- Messages ---

export async function logMessage(platform, sender, content, category, senderUrl = null, threadUrl = null) {
  const { data, error } = await supabase.from('messages_inbox').insert({
    platform,
    sender,
    sender_url: senderUrl,
    thread_url: threadUrl,
    content,
    category,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function markAutoResponded(messageId, responseText) {
  await supabase.from('messages_inbox').update({
    auto_responded: true,
    auto_response_text: responseText,
  }).eq('id', messageId);
}

// --- FAQ Lookup ---

export async function findFaqMatch(messageText) {
  const { data: faqs } = await supabase
    .from('faq_knowledge')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: false });

  if (!faqs) return null;

  const lowerMessage = messageText.toLowerCase();
  for (const faq of faqs) {
    const patterns = faq.question_pattern.split('|');
    if (patterns.some(p => lowerMessage.includes(p.trim()))) {
      return faq;
    }
  }
  return null;
}

// --- Escalations ---

export async function createEscalation(messageId, draftResponse, threadUrl = null) {
  const { data, error } = await supabase.from('escalation_queue').insert({
    message_id: messageId,
    draft_response: draftResponse,
    platform_thread_url: threadUrl,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getPendingEscalations() {
  const { data } = await supabase
    .from('escalation_queue')
    .select('*, messages_inbox(*)')
    .eq('resolved', false)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function getOverdueEscalations(hoursThreshold = 36) {
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('escalation_queue')
    .select('*, messages_inbox(*)')
    .eq('resolved', false)
    .eq('reminder_sent', false)
    .lt('created_at', cutoff);
  return data || [];
}

export async function markReminderSent(escalationId) {
  await supabase.from('escalation_queue').update({
    reminder_sent: true,
    reminder_sent_at: new Date().toISOString(),
  }).eq('id', escalationId);
}

// --- Marketing Posts ---

export async function getReadyPosts() {
  const { data } = await supabase
    .from('marketing_posts')
    .select('*, puzzles(*)')
    .eq('status', 'ready_to_post')
    .order('created_at', { ascending: true });
  return data || [];
}

export async function getNextScheduledPost() {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('marketing_posts')
    .select('*, puzzles(*)')
    .eq('status', 'approved')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single();
  return data || null;
}

export async function getUpcomingPosts(startDate, endDate) {
  const { data } = await supabase
    .from('marketing_posts')
    .select('*, puzzles(*)')
    .eq('status', 'ready_to_post')
    .gte('scheduled_at', startDate)
    .lte('scheduled_at', endDate)
    .order('scheduled_at', { ascending: true });
  return data || [];
}

export async function approvePostsByToken(token) {
  const { data, error } = await supabase
    .from('marketing_posts')
    .update({ status: 'approved' })
    .eq('approval_token', token)
    .eq('status', 'ready_to_post')
    .select();
  if (error) throw error;
  return data || [];
}

export async function markPostPublished(postId, platformUrl) {
  await supabase.from('marketing_posts').update({
    status: 'posted',
    platform_post_url: platformUrl,
    posted_at: new Date().toISOString(),
  }).eq('id', postId);
}

export async function markPostFailed(postId, errorMessage) {
  await supabase.from('marketing_posts').update({
    status: 'failed',
  }).eq('id', postId);
  await logActivity('post_failed', null, { post_id: postId }, 'failure', errorMessage);
}
