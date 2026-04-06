# GrandGridStudio — Bot Setup Guide

> Everything that's left to get Pinterest and Reddit posting live.
> Each step says WHERE to run it (🖥️ Local = your Windows machine, 🖧 SSH = the Hetzner VM).
> All links have been verified as of April 2026.

---

## Current Status

| Platform  | Status | What failed | Fix |
|-----------|--------|-------------|-----|
| Pinterest | ❌ Posting fails | Playwright can't find upload button (Pinterest changed their UI) | Switch to Pinterest REST API (free for business accounts) |
| Reddit    | ⏳ Waiting | Reddit requires pre-approval for API apps since Nov 2025 | Waiting for approval (~7 business days from submission) |

**What IS working:** All 80 posts scheduled in Supabase, images uploaded, VM cron running 3x/week, all infrastructure ready. The only missing piece is the API credentials for both platforms.

---

## PART 1: Pinterest API Setup

### Critical Warning: Trial vs Standard Access

New Pinterest apps start at **Trial Access**. Pins created with Trial Access are **invisible to the public** (sandboxed). You must upgrade to **Standard Access** for pins to be visible.

**Sources:**
- https://community.pinterest.biz/t/frequently-asked-questions-pinterest-api/2083
- https://community.make.com/t/pinterest-trial-access-vs-standard-access/50622

### Step 1.1 — Start privacy policy server on VM

Pinterest requires a publicly accessible privacy policy URL when creating an app.

**🖧 SSH into VM:**
```bash
ssh grandgrid@178.104.137.140
```

```bash
cd ~/Nonogramproject2026
git pull
nohup node automation/scripts/privacy-policy-server.mjs > /tmp/privacy-server.log 2>&1 &
```

Verify it works by visiting: `http://178.104.137.140:8085/privacy`

### Step 1.2 — Create a Pinterest App

**🖥️ Local (browser):**

1. Go to **https://developers.pinterest.com/apps/**
2. Log in with your GrandGridStudio Pinterest account
3. Click **"Create app"** (you can create up to 5 apps)
4. Fill in:
   - **App name:** `GrandGridStudio`
   - **App description:** `Automated pin creation for our nonogram puzzle Etsy shop. We use the API to post puzzle images to our own boards with titles, descriptions, and links to our Etsy listings.`
   - **Privacy policy URL:** `http://178.104.137.140:8085/privacy`
5. Submit — the app will be created with **Trial Access**
6. Note down your **App ID** and **App Secret** (click "show" to reveal the secret)

**Source:** https://developers.pinterest.com/docs/getting-started/set-up-app/

### Step 1.3 — Run OAuth to get tokens

**🖥️ Local machine:**
```bash
cd C:\Users\yaniv\Nonogramproject2026
node automation/scripts/pinterest-oauth-setup.mjs
```

The script will:
1. Ask for your App ID and App Secret
2. Give you a URL to open in your browser
3. You authorize the app on Pinterest (click "Allow")
4. Pinterest redirects to `https://localhost/callback?code=XXXXX` (the page won't load — that's expected)
5. Copy the entire URL from the browser address bar and paste it into the script
6. It exchanges the code for access + refresh tokens and saves them to `automation/auth/pinterest-tokens.json`

**OAuth scopes requested:** `boards:read`, `boards:write`, `pins:read`, `pins:write`
**Token lifetime:** 30 days access, refresh tokens are indefinitely refreshable (60-day rolling window for apps created after Sept 2025)

**Source:** https://developers.pinterest.com/docs/api/v5/oauth-token/

### Step 1.4 — Create a board (if not done already)

**🖥️ Local (browser):**

Go to https://www.pinterest.com/GrandGridStudio/ and create a board called **"Grand Grid Studio"** if it doesn't exist yet. This is the board where all automated pins will be posted.

### Step 1.5 — Test pin creation (Trial mode)

**🖥️ Local machine:**
```bash
cd C:\Users\yaniv\Nonogramproject2026
export $(grep -v '^#' .env | xargs)
node -e "
import { createPin } from './automation/platforms/pinterest.mjs';
const url = await createPin(null, {
  boardName: 'Grand Grid Studio',
  title: 'Test Pin - Nonogram Puzzle',
  description: 'Testing automated pin creation for GrandGridStudio',
  imagePath: 'https://YOUR_SUPABASE_URL/storage/v1/object/public/marketing-images/covers/colossus-cover.png',
  link: 'https://www.etsy.com/shop/GrandGridStudio',
});
console.log('Result:', url);
"
```

Replace `YOUR_SUPABASE_URL` with your actual Supabase URL. If it returns a pin URL, the API is working.

**Note:** In Trial mode, the pin will only be visible to YOU. Public users won't see it until Standard Access is approved.

### Step 1.6 — Apply for Standard Access (REQUIRED for public pins)

**🖥️ Local (browser):**

1. Go to https://developers.pinterest.com/apps/
2. Click on your app
3. Look for "Request Standard Access" or "Upgrade"
4. You need to submit a **demo video** showing:
   - The OAuth consent screen (the page where you click "Allow")
   - A successful pin creation via the API (show the API call + the resulting pin)
   - Your live Pinterest integration in action
5. **Tips to avoid rejection:**
   - Show the FULL OAuth flow in the video (not just the result)
   - Make your app description detailed and accurate
   - Ensure the privacy policy URL is accessible
   - If rejected, create a new app (up to 5 allowed) and resubmit

**Approval time:** Varies — some report 24 hours, some report days. If no response after a week, contact Pinterest support.

**Sources:**
- https://community.make.com/t/pinterest-trial-access-vs-standard-access/50622
- https://community.n8n.io/t/pinterest-api-trial-standard-any-success-stories-tips-for-standard-access-approval/257516

### Step 1.7 — Deploy tokens to VM

Once the test works (Step 1.5), copy the tokens to the VM:

**🖥️ Local machine (PowerShell):**
```powershell
scp C:\Users\yaniv\Nonogramproject2026\automation\auth\pinterest-tokens.json grandgrid@178.104.137.140:/home/grandgrid/Nonogramproject2026/automation/auth/
```

### Step 1.8 — Push code and test on VM

**🖥️ Local machine:**
```bash
cd C:\Users\yaniv\Nonogramproject2026
git add automation/platforms/pinterest.mjs automation/tasks/content-post.mjs automation/scripts/pinterest-oauth-setup.mjs automation/scripts/privacy-policy-server.mjs
git commit -m "Switch Pinterest to REST API, drop Playwright dependency"
git push
```

**🖧 SSH into VM:**
```bash
cd ~/Nonogramproject2026
git pull
source <(grep -v '^#' .env | sed 's/^/export /')
node automation/tasks/content-post.mjs
```

If it posts successfully, the cron will handle the rest automatically.

### Step 1.9 — Stop the privacy policy server (optional, after app creation)

**🖧 SSH:**
```bash
pkill -f privacy-policy-server
```

---

## PART 2: Reddit API Setup

### Current Situation

Reddit changed their API policy in November 2025. Self-service app creation at `reddit.com/prefs/apps` is now gated behind the **Responsible Builder Policy** — you must submit a request and wait for manual approval.

**You already submitted this request.** Expected response: ~7 business days (by approximately April 14, 2026).

**Sources:**
- https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy
- https://www.wappkit.com/blog/reddit-api-credentials-guide-2025

### Important: Subreddit Requirements

Before posting, verify these for each target subreddit:

| Subreddit | Check | How |
|-----------|-------|-----|
| r/nonograms | Minimum karma? Post rules? | Visit reddit.com/r/nonograms → About/Rules tab |
| r/puzzles | Has a **"Promo Weekly"** thread for self-promotion — may need to post there instead of the main feed | Visit reddit.com/r/puzzles → About/Rules tab |
| r/picross | Minimum karma? Post rules? | Visit reddit.com/r/picross → About/Rules tab |

**Many subreddits require 30+ day account age and 100+ karma to post.** If u/GrandGridStudio is new, you may need to build karma first by commenting/engaging.

**Source:** https://postiz.com/blog/reddit-api-limits-rules-and-posting-restrictions-explained

### Step 2.1 — When Reddit approves your API request

You'll receive an email. Then:

**🖥️ Local (browser):**

1. Go to **https://www.reddit.com/prefs/apps**
2. Click **"create another app..."** (at the bottom)
3. Fill in:
   - **Name:** `GrandGridStudio`
   - **App type:** Select **"script"**
   - **Description:** `Automated posting of nonogram puzzle content to relevant subreddits`
   - **About URL:** `https://www.etsy.com/shop/GrandGridStudio`
   - **Redirect URI:** `https://localhost/callback`
4. Click **"create app"**
5. Note down:
   - **Client ID** — shown under the app name (short string like `abc123def456`)
   - **Client Secret** — labeled "secret"

### Step 2.2 — Run OAuth to get tokens

**🖥️ Local machine:**
```bash
cd C:\Users\yaniv\Nonogramproject2026
node automation/scripts/reddit-oauth-setup.mjs
```

Same flow as Pinterest: enter credentials → open URL → authorize → paste redirect URL → tokens saved.

**OAuth scopes requested:** `identity`, `submit`, `read`, `privatemessages`
**Token lifetime:** Access tokens last 1 hour, refresh tokens are permanent (with `duration=permanent`)

**Source:** https://github.com/reddit-archive/reddit/wiki/oauth2

### Step 2.3 — Test a post locally

**🖥️ Local machine:**
```bash
cd C:\Users\yaniv\Nonogramproject2026
export $(grep -v '^#' .env | xargs)
node -e "
import { createRedditPost } from './automation/platforms/reddit-api.mjs';
const url = await createRedditPost(null, {
  subreddit: 'test',
  title: 'GrandGridStudio Test Post',
  body: 'Testing automated posting. Please ignore.',
});
console.log('Result:', url);
"
```

r/test is a subreddit specifically for testing — posts there are expected and won't bother anyone.

### Step 2.4 — Switch content-post.mjs to use API module

**🖥️ Local machine — edit `automation/tasks/content-post.mjs`:**

Change line 9:
```javascript
// FROM:
import { createRedditPost } from '../platforms/reddit.mjs';
// TO:
import { createRedditPost } from '../platforms/reddit-api.mjs';
```

Also remove the `launchBrowser` import if Reddit is the only platform still using it (Pinterest no longer needs it). Remove these lines from the Reddit block:
```javascript
const context = await launchBrowser('reddit');
// ... and the context.close() in finally
```

Pass `null` as the first argument instead of `context`:
```javascript
const url = await createRedditPost(null, { ... });
```

### Step 2.5 — Deploy to VM

**🖥️ Local machine:**
```bash
git add -A && git commit -m "Switch Reddit to API, drop Playwright" && git push
```

**🖧 SSH:**
```bash
cd ~/Nonogramproject2026 && git pull
```

Copy tokens to VM:
**🖥️ Local (PowerShell):**
```powershell
scp C:\Users\yaniv\Nonogramproject2026\automation\auth\reddit-tokens.json grandgrid@178.104.137.140:/home/grandgrid/Nonogramproject2026/automation/auth/
```

### Step 2.6 — If Reddit DENIES the API request

**Fallback options (ranked):**

1. **Resubmit with more detail** — Common rejection reason is vague descriptions. Rewrite emphasizing: educational puzzle content, low volume (3 posts/week), no scraping, no data collection.

2. **Manual posting with prepared content** — All 80 posts are pre-written in Supabase. We can build a simple script that shows you the next post to copy-paste, one at a time. Not automated, but takes <1 minute per post.

3. **Skip Reddit, focus Pinterest** — Pinterest alone with 3x/week posting is a solid marketing channel. Reddit can be added later when/if API access is granted.

**Source:** https://molehill.io/blog/reddit_killed_self-service_api_keys_your_options_for_automated_reddit_integration

---

## PART 3: After Both Platforms Are Live

### Verify cron is running

**🖧 SSH:**
```bash
crontab -l
```

Should show:
```
0 8 * * 2 cd ~/Nonogramproject2026 && source .env && node automation/tasks/content-post.mjs >> /tmp/content-post.log 2>&1
0 16 * * 4 cd ~/Nonogramproject2026 && source .env && node automation/tasks/content-post.mjs >> /tmp/content-post.log 2>&1
0 12 * * 6 cd ~/Nonogramproject2026 && source .env && node automation/tasks/content-post.mjs >> /tmp/content-post.log 2>&1
```

### Monitor posts

Check Supabase `marketing_posts` table — posts should transition from `ready_to_post` → `posted` with a `published_url`.

Check the activity log:
```sql
SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 20;
```

### Token maintenance

- **Pinterest:** Tokens auto-refresh (code handles this). If refresh fails after 60 days of no activity, re-run Step 1.3.
- **Reddit:** Tokens auto-refresh every hour (code handles this). Permanent refresh tokens don't expire.

---

## Summary: Your To-Do List

| # | Task | Where | Time | Depends on |
|---|------|-------|------|------------|
| 1 | Start privacy policy server on VM | 🖧 SSH | 1 min | — |
| 2 | Create Pinterest app at developers.pinterest.com/apps | 🖥️ Browser | 3 min | #1 |
| 3 | Run `pinterest-oauth-setup.mjs` locally | 🖥️ Local | 2 min | #2 |
| 4 | Test pin creation locally | 🖥️ Local | 1 min | #3 |
| 5 | Record demo video + apply for Standard Access | 🖥️ Browser | 10 min | #4 |
| 6 | SCP tokens to VM + git push + git pull | 🖥️ + 🖧 | 3 min | #4 |
| 7 | Test content-post.mjs on VM | 🖧 SSH | 2 min | #6 |
| 8 | Wait for Reddit API approval | ⏳ | ~7 biz days | Already submitted |
| 9 | Create Reddit app + run `reddit-oauth-setup.mjs` | 🖥️ Local | 5 min | #8 |
| 10 | Switch reddit import + deploy to VM | 🖥️ + 🖧 | 3 min | #9 |

**Total hands-on time: ~25 minutes** (spread across Pinterest now + Reddit when approved)

---

## All Code Is Pre-Written

These files are ready and committed:

| File | Purpose |
|------|---------|
| `automation/platforms/pinterest.mjs` | Pinterest API pin creation (replaces Playwright) |
| `automation/platforms/reddit-api.mjs` | Reddit API posting (replaces Playwright) |
| `automation/scripts/pinterest-oauth-setup.mjs` | One-time Pinterest OAuth token setup |
| `automation/scripts/reddit-oauth-setup.mjs` | One-time Reddit OAuth token setup |
| `automation/scripts/privacy-policy-server.mjs` | Temp server for Pinterest app creation requirement |
| `automation/tasks/content-post.mjs` | Updated — Pinterest no longer uses browser |
