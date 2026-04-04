#!/usr/bin/env node
// Message sweep — runs at 08:00, 18:00, 22:00 Israel time
// Checks all platforms for messages, classifies, auto-responds or escalates

import { launchBrowser } from '../lib/browser.mjs';
import { logMessage, markAutoResponded, findFaqMatch, createEscalation, getOverdueEscalations, markReminderSent, logActivity } from '../lib/supabase.mjs';
import { sendEscalationEmail } from '../lib/email.mjs';
import { checkEtsyMessages, replyEtsyMessage } from '../platforms/etsy.mjs';
import { checkRedditInbox, replyReddit } from '../platforms/reddit.mjs';
import { checkPinterestNotifications } from '../platforms/pinterest.mjs';

const BOT_DISCLOSURE = "Hi! I'm GrandGridStudio's AI assistant.";
const BOT_FOOTER = "If you'd like to speak with a human, just let me know and Yaniv will get back to you within 48 hours.";
const CHECK_REMINDERS = process.argv.includes('--check-reminders');

async function classifyAndRespond(context, platform, messages, replyFn) {
  let stats = { autoResponded: 0, escalated: 0, spam: 0 };

  for (const msg of messages) {
    try {
      // Log the message
      const record = await logMessage(platform, msg.sender, msg.content, null, msg.senderUrl, msg.threadUrl);

      // Find FAQ match
      const faq = await findFaqMatch(msg.content);

      if (faq && faq.category !== 'escalation') {
        // Auto-respond
        const response = `${BOT_DISCLOSURE} ${faq.answer_template} ${BOT_FOOTER}`;
        const sent = await replyFn(context, msg.threadUrl, response);
        if (sent) {
          await markAutoResponded(record.id, response);
          stats.autoResponded++;
        }
      } else {
        // Escalate
        const holdingResponse = `${BOT_DISCLOSURE} Thanks for reaching out! I've flagged this for Yaniv, who will personally get back to you within 48 hours. ${BOT_FOOTER}`;
        await replyFn(context, msg.threadUrl, holdingResponse);

        const draftResponse = faq ? faq.answer_template : `Thank you for your message. I'll review this and get back to you shortly.`;
        const escalation = await createEscalation(record.id, draftResponse, msg.threadUrl);

        await sendEscalationEmail({
          customerMessage: msg.content,
          sender: msg.sender,
          platform,
          threadUrl: msg.threadUrl,
          draftResponse,
          escalationId: escalation.id,
          messageId: record.id,
        });
        stats.escalated++;
      }
    } catch (err) {
      console.error(`Error processing ${platform} message from ${msg.sender}:`, err.message);
      await logActivity('message_processing_error', platform, { sender: msg.sender }, 'failure', err.message);
    }
  }
  return stats;
}

async function main() {
  console.log(`[${new Date().toISOString()}] Starting message sweep...`);
  const context = await launchBrowser();
  const allStats = { autoResponded: 0, escalated: 0, spam: 0 };

  try {
    // 1. Check Etsy
    console.log('Checking Etsy messages...');
    const etsyMessages = await checkEtsyMessages(context);
    if (etsyMessages.length) {
      const stats = await classifyAndRespond(context, 'etsy', etsyMessages, replyEtsyMessage);
      Object.keys(stats).forEach(k => allStats[k] += stats[k]);
    }

    // 2. Check Reddit
    console.log('Checking Reddit inbox...');
    const redditMessages = await checkRedditInbox(context);
    if (redditMessages.length) {
      const stats = await classifyAndRespond(context, 'reddit', redditMessages, replyReddit);
      Object.keys(stats).forEach(k => allStats[k] += stats[k]);
    }

    // 3. Check Pinterest
    console.log('Checking Pinterest notifications...');
    await checkPinterestNotifications(context);

    // 4. Check escalation reminders (afternoon sweep only)
    if (CHECK_REMINDERS) {
      console.log('Checking overdue escalations...');
      const overdue = await getOverdueEscalations(36);
      for (const esc of overdue) {
        await sendEscalationEmail({
          customerMessage: esc.messages_inbox.content,
          sender: esc.messages_inbox.sender,
          platform: esc.messages_inbox.platform,
          threadUrl: esc.platform_thread_url,
          draftResponse: esc.draft_response,
          escalationId: esc.id,
          messageId: esc.message_id,
          isReminder: true,
        });
        await markReminderSent(esc.id);
      }
      if (overdue.length) console.log(`Sent ${overdue.length} escalation reminders.`);
    }

    // 5. Log summary
    const total = etsyMessages.length + redditMessages.length;
    console.log(`Sweep complete: ${total} messages found, ${allStats.autoResponded} auto-responded, ${allStats.escalated} escalated.`);
    await logActivity('message_sweep_complete', null, { ...allStats, total });

  } finally {
    await context.close();
  }
}

main().catch(err => {
  console.error('Message sweep failed:', err);
  process.exit(1);
});
