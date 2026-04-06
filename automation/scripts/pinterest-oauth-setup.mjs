#!/usr/bin/env node
// One-time Pinterest OAuth setup
// 1. Opens browser for user to authorize the app
// 2. User pastes the redirect URL with the code
// 3. Exchanges code for access + refresh tokens
// 4. Saves tokens to automation/auth/pinterest-tokens.json

import { createInterface } from 'readline';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = join(__dirname, '..', 'auth');
mkdirSync(AUTH_DIR, { recursive: true });

const TOKENS_PATH = join(AUTH_DIR, 'pinterest-tokens.json');

function ask(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => { rl.close(); resolve(answer.trim()); });
  });
}

async function main() {
  console.log('\n=== Pinterest API OAuth Setup ===\n');

  const appId = await ask('Enter your Pinterest App ID: ');
  const appSecret = await ask('Enter your Pinterest App Secret: ');

  // Build authorization URL
  const redirectUri = 'https://localhost/callback';
  const scope = 'boards:read,boards:write,pins:read,pins:write';
  const authUrl = `https://www.pinterest.com/oauth/?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;

  console.log('\n1. Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n2. Log in and authorize the app');
  console.log('3. You will be redirected to a URL like: https://localhost/callback?code=XXXXX');
  console.log('   (The page will fail to load — that is expected)');
  console.log('4. Copy the ENTIRE redirect URL and paste it below\n');

  const redirectUrl = await ask('Paste the redirect URL: ');

  // Extract the code from the URL
  const url = new URL(redirectUrl);
  const code = url.searchParams.get('code');
  if (!code) {
    console.error('Could not find "code" parameter in the URL. Please try again.');
    process.exit(1);
  }

  console.log(`\nGot authorization code: ${code.substring(0, 10)}...`);
  console.log('Exchanging for access token...');

  // Exchange code for tokens
  const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
  const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error(`Token exchange failed (${tokenRes.status}): ${errText}`);
    process.exit(1);
  }

  const tokens = await tokenRes.json();
  console.log(`\nAccess token received! Expires in ${Math.round(tokens.expires_in / 86400)} days.`);

  // Save tokens + app credentials
  const tokenData = {
    app_id: appId,
    app_secret: appSecret,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    refresh_expires_at: tokens.refresh_token_expires_in
      ? new Date(Date.now() + tokens.refresh_token_expires_in * 1000).toISOString()
      : null,
    created_at: new Date().toISOString(),
  };

  writeFileSync(TOKENS_PATH, JSON.stringify(tokenData, null, 2));
  console.log(`\nTokens saved to: ${TOKENS_PATH}`);
  console.log('Done! Pinterest API is ready to use.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
