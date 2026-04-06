#!/usr/bin/env node
// One-time Reddit OAuth setup
// Requires: approved Reddit API app (client_id + client_secret from reddit.com/prefs/apps)
// Flow: opens browser for authorization, user grants access, saves tokens

import { createInterface } from 'readline';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = join(__dirname, '..', 'auth');
mkdirSync(AUTH_DIR, { recursive: true });

const TOKENS_PATH = join(AUTH_DIR, 'reddit-tokens.json');
const REDIRECT_URI = 'https://localhost/callback';
const USER_AGENT = 'GrandGridStudio/1.0 (by u/GrandGridStudio)';

function ask(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => { rl.close(); resolve(answer.trim()); });
  });
}

async function main() {
  console.log('\n=== Reddit API OAuth Setup ===\n');
  console.log('Prerequisites: Your Reddit API app must be approved first.');
  console.log('Get credentials from: https://www.reddit.com/prefs/apps\n');

  const clientId = await ask('Enter your Reddit Client ID (under the app name): ');
  const clientSecret = await ask('Enter your Reddit Client Secret: ');

  // Build authorization URL
  const state = Math.random().toString(36).substring(2);
  const scope = 'identity submit read privatemessages';
  const authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${clientId}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&duration=permanent&scope=${scope}`;

  console.log('\n1. Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n2. Click "Allow" to authorize the app');
  console.log('3. You will be redirected to a URL like: https://localhost/callback?state=...&code=XXXXX');
  console.log('   (The page will fail to load — that is expected)');
  console.log('4. Copy the ENTIRE redirect URL and paste it below\n');

  const redirectUrl = await ask('Paste the redirect URL: ');

  const url = new URL(redirectUrl);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (!code) {
    console.error('Could not find "code" parameter in the URL.');
    process.exit(1);
  }
  if (returnedState !== state) {
    console.error('State mismatch — possible CSRF. Please try again.');
    process.exit(1);
  }

  console.log(`\nGot authorization code: ${code.substring(0, 10)}...`);
  console.log('Exchanging for access token...');

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error(`Token exchange failed (${tokenRes.status}): ${errText}`);
    process.exit(1);
  }

  const tokens = await tokenRes.json();
  if (tokens.error) {
    console.error(`Reddit error: ${tokens.error}`);
    process.exit(1);
  }

  console.log(`\nAccess token received! Expires in ${Math.round(tokens.expires_in / 3600)} hour(s).`);

  const tokenData = {
    client_id: clientId,
    client_secret: clientSecret,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    scope: tokens.scope,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  writeFileSync(TOKENS_PATH, JSON.stringify(tokenData, null, 2));
  console.log(`\nTokens saved to: ${TOKENS_PATH}`);
  console.log('Done! Reddit API is ready to use.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
