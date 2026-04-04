// Reddit posting and message checking via Playwright

import { safeGoto, screenshot } from '../lib/browser.mjs';
import { logActivity } from '../lib/supabase.mjs';

/**
 * Create a Reddit post in a subreddit.
 */
export async function createRedditPost(context, { subreddit, title, body, flair = null, imagePath = null }) {
  const page = await context.newPage();
  try {
    await safeGoto(page, `https://www.reddit.com/r/${subreddit}/submit`);

    if (page.url().includes('/login')) {
      await logActivity('reddit_login_required', 'reddit', {}, 'warning');
      return null;
    }

    await page.waitForTimeout(2000);

    if (imagePath) {
      // Image post
      const imageTab = await page.$('[role="tab"]:has-text("Image"), button:has-text("Image")');
      if (imageTab) await imageTab.click();
      await page.waitForTimeout(1000);
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) await fileInput.setInputFiles(imagePath);
      await page.waitForTimeout(3000);
    }

    // Fill title
    const titleInput = await page.$('textarea[placeholder*="title" i], input[placeholder*="title" i], [name="title"]');
    if (titleInput) await titleInput.fill(title);

    // Fill body (for text posts)
    if (body && !imagePath) {
      const bodyInput = await page.$('[role="textbox"], textarea[placeholder*="text" i], .notranslate');
      if (bodyInput) {
        await bodyInput.click();
        await bodyInput.fill(body);
      }
    }

    // Select flair if provided
    if (flair) {
      const flairBtn = await page.$('button:has-text("Flair"), [aria-label*="flair" i]');
      if (flairBtn) {
        await flairBtn.click();
        await page.waitForTimeout(1000);
        const flairOption = await page.$(`text="${flair}"`);
        if (flairOption) {
          await flairOption.click();
          const applyBtn = await page.$('button:has-text("Apply")');
          if (applyBtn) await applyBtn.click();
        }
      }
    }

    // Submit
    const submitBtn = await page.$('button[type="submit"]:has-text("Post"), button:has-text("Post")');
    if (submitBtn) await submitBtn.click();

    await page.waitForTimeout(5000);
    const postUrl = page.url();
    await logActivity('reddit_post_created', 'reddit', { subreddit, title, url: postUrl });
    return postUrl;
  } catch (err) {
    await logActivity('reddit_post_error', 'reddit', { subreddit, title }, 'failure', err.message);
    await screenshot(page, 'reddit-error');
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Check Reddit inbox for new messages and comment replies.
 */
export async function checkRedditInbox(context) {
  const page = await context.newPage();
  try {
    await safeGoto(page, 'https://www.reddit.com/message/inbox/');
    if (page.url().includes('/login')) return [];

    await page.waitForTimeout(3000);
    const messages = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('.message, [data-testid="message"], .thing.message').forEach(el => {
        const isUnread = el.classList.contains('unread') || el.querySelector('.unread');
        if (!isUnread) return;
        items.push({
          sender: el.querySelector('.author, [data-testid="message-author"]')?.textContent?.trim() || 'Unknown',
          content: el.querySelector('.md, .message-body, [data-testid="message-body"]')?.textContent?.trim() || '',
          threadUrl: el.querySelector('a.title, a[data-testid="message-subject"]')?.href || '',
        });
      });
      return items;
    });

    await logActivity('reddit_inbox_checked', 'reddit', { count: messages.length });
    return messages;
  } catch (err) {
    await logActivity('reddit_check_error', 'reddit', {}, 'failure', err.message);
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Reply to a Reddit comment or message.
 */
export async function replyReddit(context, threadUrl, responseText) {
  const page = await context.newPage();
  try {
    await safeGoto(page, threadUrl);
    await page.waitForTimeout(2000);

    const replyBox = await page.$('[role="textbox"], textarea.comment, .usertext-edit textarea');
    if (!replyBox) throw new Error('Reply box not found');
    await replyBox.click();
    await replyBox.fill(responseText);

    const submitBtn = await page.$('button:has-text("Comment"), button:has-text("Reply"), button[type="submit"]');
    if (submitBtn) await submitBtn.click();

    await page.waitForTimeout(3000);
    await logActivity('reddit_reply_sent', 'reddit', { threadUrl });
    return true;
  } catch (err) {
    await logActivity('reddit_reply_error', 'reddit', { threadUrl }, 'failure', err.message);
    return false;
  } finally {
    await page.close();
  }
}
