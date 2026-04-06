// Reddit posting via official API (OAuth2)
// Replaces Playwright browser automation — activate once API access is approved
// Swap import in content-post.mjs: from './platforms/reddit.mjs' → './platforms/reddit-api.mjs'

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logActivity } from '../lib/supabase.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = resolve(__dirname, '..', 'auth', 'reddit-tokens.json');
const USER_AGENT = 'GrandGridStudio/1.0 (by u/GrandGridStudio)';

/** Get a valid Reddit access token, refreshing if expired. */
async function getAccessToken() {
  if (!existsSync(TOKENS_PATH)) {
    throw new Error('Reddit tokens not found. Run: node automation/scripts/reddit-oauth-setup.mjs');
  }

  const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf-8'));

  // Check if token is still valid (tokens last 1 hour)
  const expiresAt = new Date(tokens.expires_at);
  if (expiresAt > new Date(Date.now() + 60000)) {
    return tokens.access_token;
  }

  // Refresh using client credentials + refresh token
  console.log('Reddit access token expired, refreshing...');
  const basicAuth = Buffer.from(`${tokens.client_id}:${tokens.client_secret}`).toString('base64');

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Reddit token refresh failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  tokens.access_token = data.access_token;
  tokens.expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();
  if (data.refresh_token) {
    tokens.refresh_token = data.refresh_token;
  }
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  console.log('Reddit token refreshed.');

  return tokens.access_token;
}

/**
 * Create a Reddit post via the API.
 * @param {object} _context - Unused (kept for backward compat)
 * @param {object} opts
 */
export async function createRedditPost(_context, { subreddit, title, body, imagePath = null }) {
  try {
    const accessToken = await getAccessToken();

    // For image posts, we need to upload the image first
    // For now, we do link posts pointing to the Supabase image URL
    const params = new URLSearchParams({
      sr: subreddit,
      title,
      kind: imagePath ? 'link' : 'self',
      resubmit: 'true',
      api_type: 'json',
    });

    if (imagePath) {
      // imagePath is actually a public URL (Supabase Storage)
      params.set('url', imagePath);
    } else {
      params.set('text', body || '');
    }

    console.log(`  Submitting to r/${subreddit}: "${title}"`);

    const res = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: params,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Reddit submit failed (${res.status}): ${errBody}`);
    }

    const data = await res.json();

    if (data.json?.errors?.length) {
      throw new Error(`Reddit errors: ${JSON.stringify(data.json.errors)}`);
    }

    const postUrl = data.json?.data?.url || `https://www.reddit.com/r/${subreddit}/`;
    console.log(`  Reddit post created: ${postUrl}`);

    await logActivity('reddit_post_created', 'reddit', {
      subreddit,
      title,
      url: postUrl,
    });

    return postUrl;
  } catch (err) {
    await logActivity('reddit_post_error', 'reddit', { subreddit, title }, 'failure', err.message);
    console.error(`  Reddit error: ${err.message}`);
    return null;
  }
}

/**
 * Check Reddit inbox via API.
 */
export async function checkRedditInbox() {
  try {
    const accessToken = await getAccessToken();

    const res = await fetch('https://oauth.reddit.com/message/unread?limit=25', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const messages = (data.data?.children || []).map(m => ({
      sender: m.data.author || 'Unknown',
      content: m.data.body || '',
      threadUrl: `https://www.reddit.com${m.data.context || ''}`,
    }));

    await logActivity('reddit_inbox_checked', 'reddit', { count: messages.length });
    return messages;
  } catch (err) {
    await logActivity('reddit_check_error', 'reddit', {}, 'failure', err.message);
    return [];
  }
}
