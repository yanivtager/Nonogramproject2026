// Pinterest posting via official API v5
// Replaces Playwright browser automation with reliable REST calls

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logActivity } from '../lib/supabase.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = resolve(__dirname, '..', 'auth', 'pinterest-tokens.json');
const API_BASE = 'https://api.pinterest.com/v5';

/** Load and return a valid access token, refreshing if needed. */
async function getAccessToken() {
  if (!existsSync(TOKENS_PATH)) {
    throw new Error('Pinterest tokens not found. Run: node automation/scripts/pinterest-oauth-setup.mjs');
  }

  const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf-8'));

  // Check if token is expired or expiring within 1 day
  const expiresAt = new Date(tokens.expires_at);
  const oneDayFromNow = new Date(Date.now() + 86400 * 1000);

  if (expiresAt > oneDayFromNow) {
    return tokens.access_token;
  }

  // Refresh the token
  console.log('Pinterest access token expiring soon, refreshing...');
  const basicAuth = Buffer.from(`${tokens.app_id}:${tokens.app_secret}`).toString('base64');

  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${err}`);
  }

  const newTokens = await res.json();
  tokens.access_token = newTokens.access_token;
  tokens.expires_at = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
  if (newTokens.refresh_token) {
    tokens.refresh_token = newTokens.refresh_token;
    tokens.refresh_expires_at = newTokens.refresh_token_expires_in
      ? new Date(Date.now() + newTokens.refresh_token_expires_in * 1000).toISOString()
      : tokens.refresh_expires_at;
  }
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  console.log('Pinterest token refreshed successfully.');

  return tokens.access_token;
}

/** Get the board ID by name. Caches result in tokens file. */
async function getBoardId(accessToken, boardName) {
  // Check cache first
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf-8'));
  if (tokens.board_cache?.[boardName]) {
    return tokens.board_cache[boardName];
  }

  const res = await fetch(`${API_BASE}/boards`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list boards (${res.status}): ${err}`);
  }

  const data = await res.json();
  const board = data.items?.find(b =>
    b.name.toLowerCase() === boardName.toLowerCase()
  );

  if (!board) {
    // List available boards for debugging
    const names = data.items?.map(b => b.name).join(', ') || 'none';
    throw new Error(`Board "${boardName}" not found. Available: ${names}`);
  }

  // Cache it
  tokens.board_cache = tokens.board_cache || {};
  tokens.board_cache[boardName] = board.id;
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));

  return board.id;
}

/**
 * Create a pin on Pinterest via the API.
 * @param {object} _context - Unused (kept for backward compat with content-post.mjs)
 * @param {object} opts
 * @param {string} opts.boardName - Target board name
 * @param {string} opts.title - Pin title (max 100 chars)
 * @param {string} opts.description - Pin description (max 800 chars)
 * @param {string} opts.imagePath - Public URL of the image
 * @param {string} opts.link - Destination URL
 */
export async function createPin(_context, { boardName, title, description, imagePath, link }) {
  try {
    const accessToken = await getAccessToken();
    const boardId = await getBoardId(accessToken, boardName);

    const pinData = {
      board_id: boardId,
      title: (title || '').substring(0, 100),
      description: (description || '').substring(0, 800),
      link: link || undefined,
      media_source: {
        source_type: 'image_url',
        url: imagePath,
      },
    };

    console.log(`  Creating pin: "${pinData.title}" on board ${boardId}`);

    const res = await fetch(`${API_BASE}/pins`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pinData),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Pin creation failed (${res.status}): ${errBody}`);
    }

    const pin = await res.json();
    const pinUrl = `https://www.pinterest.com/pin/${pin.id}/`;
    console.log(`  Pin created: ${pinUrl}`);

    await logActivity('pinterest_pin_created', 'pinterest', {
      pin_id: pin.id,
      title: pinData.title,
      board: boardName,
      url: pinUrl,
    });

    return pinUrl;
  } catch (err) {
    await logActivity('pinterest_post_error', 'pinterest', { title }, 'failure', err.message);
    console.error(`  Pinterest error: ${err.message}`);
    return null;
  }
}

/**
 * Check Pinterest notifications — not available via API, returns empty.
 */
export async function checkPinterestNotifications() {
  return [];
}
