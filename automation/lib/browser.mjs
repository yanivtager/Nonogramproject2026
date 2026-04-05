// Shared Playwright browser setup with saved session state
// Replaces Computer Use — same capability, runs on any Linux VM

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = resolve(__dirname, '..', 'auth');

/**
 * Launch a browser context with a saved session for the given platform.
 * @param {string} platform - 'pinterest', 'reddit', or 'etsy'
 */
export async function launchBrowser(platform = 'pinterest') {
  const sessionPath = resolve(AUTH_DIR, `${platform}-session.json`);
  const hasSession = existsSync(sessionPath);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const contextOptions = {
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Jerusalem',
  };

  if (hasSession) {
    contextOptions.storageState = sessionPath;
  }

  const context = await browser.newContext(contextOptions);
  // Attach browser ref so caller can close everything
  context._browser = browser;
  const origClose = context.close.bind(context);
  context.close = async () => { await origClose(); await browser.close(); };

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
