// Pinterest posting and notification checking via Playwright

import { launchBrowser, safeGoto, screenshot } from '../lib/browser.mjs';
import { logActivity } from '../lib/supabase.mjs';

const PINTEREST_HOME = 'https://www.pinterest.com';

/**
 * Post a pin to Pinterest.
 * @param {object} context - Playwright browser context
 * @param {string} boardName - Target board name
 * @param {string} title - Pin title
 * @param {string} description - Pin description with hashtags
 * @param {string} imagePath - Local path to the image file
 * @param {string} link - Destination URL (Etsy listing)
 */
export async function createPin(context, { boardName, title, description, imagePath, link }) {
  const page = await context.newPage();
  try {
    await safeGoto(page, `${PINTEREST_HOME}/pin-creation-tool/`);

    if (page.url().includes('/login')) {
      await logActivity('pinterest_login_required', 'pinterest', {}, 'warning');
      return null;
    }

    // Upload image
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File upload input not found');
    await fileInput.setInputFiles(imagePath);
    await page.waitForTimeout(3000); // Wait for upload

    // Fill title
    const titleInput = await page.$('[data-test-id="pin-draft-title"] input, #pin-draft-title, [placeholder*="title" i]');
    if (titleInput) await titleInput.fill(title);

    // Fill description
    const descInput = await page.$('[data-test-id="pin-draft-description"] textarea, #pin-draft-description, [placeholder*="description" i]');
    if (descInput) await descInput.fill(description);

    // Fill destination link
    const linkInput = await page.$('[data-test-id="pin-draft-link"] input, #pin-draft-link, [placeholder*="link" i], [placeholder*="url" i]');
    if (linkInput) await linkInput.fill(link);

    // Select board
    const boardSelector = await page.$('[data-test-id="board-dropdown"], .boardPickerButton, [aria-label*="board" i]');
    if (boardSelector) {
      await boardSelector.click();
      await page.waitForTimeout(1000);
      const board = await page.$(`text="${boardName}"`);
      if (board) await board.click();
    }

    // Publish
    const publishBtn = await page.$('[data-test-id="board-dropdown-save-button"], button:has-text("Publish"), button:has-text("Save")');
    if (publishBtn) await publishBtn.click();

    await page.waitForTimeout(3000);
    const pinUrl = page.url();
    await logActivity('pinterest_pin_created', 'pinterest', { title, board: boardName, url: pinUrl });
    return pinUrl;
  } catch (err) {
    await logActivity('pinterest_post_error', 'pinterest', { title }, 'failure', err.message);
    await screenshot(page, 'pinterest-error');
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Check Pinterest notifications for comments/messages.
 */
export async function checkPinterestNotifications(context) {
  const page = await context.newPage();
  try {
    await safeGoto(page, `${PINTEREST_HOME}/notifications/`);
    if (page.url().includes('/login')) return [];

    await page.waitForTimeout(3000);
    const notifications = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('[data-test-id="notification"], .notif-item').forEach(el => {
        items.push({
          text: el.textContent?.trim() || '',
          link: el.querySelector('a')?.href || '',
        });
      });
      return items.slice(0, 20); // Last 20
    });

    await logActivity('pinterest_notifications_checked', 'pinterest', { count: notifications.length });
    return notifications;
  } catch (err) {
    await logActivity('pinterest_check_error', 'pinterest', {}, 'failure', err.message);
    return [];
  } finally {
    await page.close();
  }
}
