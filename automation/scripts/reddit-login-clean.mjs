// Reddit login — uses a clean browser profile with delays to avoid rate limiting
// Waits 5 seconds between actions to appear human
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n=== Reddit Login Setup ===');
  console.log('This will open a browser window.');
  console.log('Take your time logging in — no rush.\n');

  // Use a persistent context in a temp folder to look like a real user
  const userDataDir = join(AUTH_DIR, 'reddit-chrome-profile');
  mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  // First go to reddit homepage, not login page directly (less suspicious)
  const page = context.pages()[0] || await context.newPage();

  console.log('Opening Reddit homepage first (to look natural)...');
  await page.goto('https://www.reddit.com', { waitUntil: 'domcontentloaded' });
  await sleep(3000);

  console.log('\n>>> In the browser window:');
  console.log('>>> 1. Click "Log In" in the top right');
  console.log('>>> 2. Enter your Reddit username & password (NOT Google login)');
  console.log('>>> 3. Complete any captchas');
  console.log('>>> 4. Wait until you see the Reddit homepage logged in');
  console.log('>>> 5. Browse around a bit (click a post, go back)');
  console.log('>>> 6. Then come back here and press ENTER\n');

  await waitForEnter('Press ENTER when you are fully logged in and have browsed a bit...');

  const sessionPath = join(AUTH_DIR, 'reddit-session.json');
  await context.storageState({ path: sessionPath });
  console.log(`\nSession saved to: ${sessionPath}`);

  await context.close();
  console.log('Done! Reddit session captured.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
