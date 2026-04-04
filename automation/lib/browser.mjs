// Shared Playwright browser setup with persistent login state
// Replaces Computer Use — same capability, runs on any Linux VM

import { chromium } from 'playwright';
import { resolve } from 'path';

const USER_DATA_DIR = process.env.BROWSER_PROFILE_DIR || resolve(process.env.HOME, '.grandgrid-browser');

/**
 * Launch a persistent browser context with saved login sessions.
 * Platform logins (Etsy, Pinterest, Reddit, Instagram) are stored in USER_DATA_DIR.
 * After first manual login, sessions persist across cron runs.
 */
export async function launchBrowser() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Jerusalem',
  });
  return context;
}

/**
 * Take a screenshot and return the path (for debugging/logging).
 */
export async function screenshot(page, name) {
  const path = `/tmp/grandgrid-screenshots/${name}-${Date.now()}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

/**
 * Wait for navigation with a generous timeout for slow platforms.
 */
export async function safeGoto(page, url, timeout = 30000) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
}
