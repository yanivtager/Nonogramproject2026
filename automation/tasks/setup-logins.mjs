#!/usr/bin/env node
// One-time setup: opens a VISIBLE browser for you to log into each platform.
// Login sessions are saved to the persistent browser profile so automation
// runs don't need to log in again.
//
// Run this once on the VM with a display (use SSH X11 forwarding or VNC).
// Usage: node tasks/setup-logins.mjs

import { chromium } from 'playwright';
import { resolve } from 'path';
import { createInterface } from 'readline';

const USER_DATA_DIR = process.env.BROWSER_PROFILE_DIR || resolve(process.env.HOME, '.grandgrid-browser');

const PLATFORMS = [
  { name: 'Etsy', url: 'https://www.etsy.com/signin' },
  { name: 'Pinterest', url: 'https://www.pinterest.com/login/' },
  { name: 'Reddit', url: 'https://www.reddit.com/login/' },
  { name: 'Instagram', url: 'https://www.instagram.com/accounts/login/' },
];

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function main() {
  console.log('=== GrandGridStudio — Platform Login Setup ===');
  console.log(`Browser profile: ${USER_DATA_DIR}`);
  console.log('');
  console.log('A browser window will open for each platform.');
  console.log('Log in manually, then press Enter here to continue.');
  console.log('');

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, // VISIBLE browser for manual login
    viewport: { width: 1280, height: 800 },
  });

  for (const platform of PLATFORMS) {
    const page = await context.newPage();
    await page.goto(platform.url);
    console.log(`→ ${platform.name}: Browser opened. Log in now.`);
    await ask(`   Press Enter when you've logged into ${platform.name}...`);
    await page.close();
    console.log(`   ✓ ${platform.name} login saved.`);
  }

  await context.close();
  rl.close();

  console.log('');
  console.log('✅ All logins saved! The automation scripts will use these sessions.');
  console.log('You can now run: node tasks/message-sweep.mjs');
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
