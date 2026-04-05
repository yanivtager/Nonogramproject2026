// One-time login setup — saves Pinterest/Reddit sessions for Playwright automation
// Usage: npx playwright test --headed (or just: node login-setup.mjs pinterest|reddit)

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = join(__dirname, '..', 'auth');
mkdirSync(AUTH_DIR, { recursive: true });

function waitForEnter(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

async function main() {
  const platform = process.argv[2];
  if (!platform || !['pinterest', 'reddit'].includes(platform)) {
    console.log('Usage: node login-setup.mjs pinterest');
    console.log('       node login-setup.mjs reddit');
    process.exit(1);
  }

  const url = platform === 'pinterest'
    ? 'https://www.pinterest.com/login/'
    : 'https://www.reddit.com/login/';

  console.log(`\nOpening browser for ${platform} login...`);

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',  // Use your real Chrome, not Playwright's bundled one
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  await page.goto(url);

  await waitForEnter(`\n>>> Log into ${platform} in the browser window, then press ENTER here <<<\n`);

  const sessionPath = join(AUTH_DIR, `${platform}-session.json`);
  await context.storageState({ path: sessionPath });
  console.log(`\nSession saved to: ${sessionPath}`);

  await browser.close();
  console.log('Done! You can now upload this session file to the VM.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
