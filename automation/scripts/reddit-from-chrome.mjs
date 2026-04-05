// Extract Reddit session by launching Playwright with your existing Chrome user data
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
  // IMPORTANT: Close all Chrome windows first!
  console.log('\n=== IMPORTANT: Close ALL Chrome windows first! ===\n');
  await waitForEnter('Press ENTER after closing all Chrome windows...');

  const userDataDir = join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await context.newPage();
  await page.goto('https://www.reddit.com');

  console.log('\nCheck the browser — you should be logged into Reddit already.');
  await waitForEnter('\nIf you see your Reddit account logged in, press ENTER to save the session...');

  const sessionPath = join(AUTH_DIR, 'reddit-session.json');
  await context.storageState({ path: sessionPath });
  console.log(`\nSession saved to: ${sessionPath}`);

  await context.close();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
