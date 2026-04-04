// Etsy message checking and responding via Playwright
// Replaces Computer Use browser control with headless Playwright

import { launchBrowser, safeGoto, screenshot } from '../lib/browser.mjs';
import { logActivity } from '../lib/supabase.mjs';

const ETSY_MESSAGES_URL = 'https://www.etsy.com/your/messages';
const ETSY_SHOP_URL = 'https://www.etsy.com/your/shops/GrandGridStudio';

/**
 * Check Etsy for new messages. Returns array of { sender, content, threadUrl }.
 */
export async function checkEtsyMessages(context) {
  const page = await context.newPage();
  try {
    await safeGoto(page, ETSY_MESSAGES_URL);

    // Check if logged in
    if (page.url().includes('/signin')) {
      await logActivity('etsy_login_required', 'etsy', { url: page.url() }, 'warning');
      console.warn('Etsy: Not logged in. Run setup-logins.mjs first.');
      return [];
    }

    // Wait for messages to load
    await page.waitForSelector('[data-messages-list], .messages-list, .wt-grid', { timeout: 10000 }).catch(() => {});

    // Extract unread messages
    const messages = await page.evaluate(() => {
      const items = [];
      // Etsy's message UI uses various selectors — try common patterns
      const messageEls = document.querySelectorAll('[data-message-thread], .message-thread, .convo-thread');
      for (const el of messageEls) {
        const unread = el.querySelector('.unread, [data-unread="true"], .wt-badge');
        if (!unread) continue;
        const sender = el.querySelector('.sender-name, .from-name, [data-sender]')?.textContent?.trim() || 'Unknown';
        const preview = el.querySelector('.message-preview, .snippet, [data-preview]')?.textContent?.trim() || '';
        const link = el.querySelector('a')?.href || '';
        items.push({ sender, content: preview, threadUrl: link });
      }
      return items;
    });

    await logActivity('etsy_messages_checked', 'etsy', { count: messages.length });
    return messages;
  } catch (err) {
    await logActivity('etsy_check_error', 'etsy', {}, 'failure', err.message);
    await screenshot(page, 'etsy-error');
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Send a reply to an Etsy message thread.
 */
export async function replyEtsyMessage(context, threadUrl, responseText) {
  const page = await context.newPage();
  try {
    await safeGoto(page, threadUrl);
    await page.waitForSelector('textarea, [contenteditable], .reply-box', { timeout: 10000 });

    // Type the response
    const textarea = await page.$('textarea, [contenteditable="true"], .reply-textarea');
    if (!textarea) throw new Error('Reply textarea not found');
    await textarea.fill(responseText);

    // Click send
    const sendBtn = await page.$('button[type="submit"], .send-button, [data-send]');
    if (!sendBtn) throw new Error('Send button not found');
    await sendBtn.click();

    await page.waitForTimeout(2000); // Wait for send to complete
    await logActivity('etsy_reply_sent', 'etsy', { threadUrl, responseLength: responseText.length });
    return true;
  } catch (err) {
    await logActivity('etsy_reply_error', 'etsy', { threadUrl }, 'failure', err.message);
    await screenshot(page, 'etsy-reply-error');
    return false;
  } finally {
    await page.close();
  }
}
