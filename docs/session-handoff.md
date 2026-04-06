# GrandGridStudio — Session Handoff (April 5-6, 2026)

> Read this document to resume work. No need to explain what happened — just read this and pick up.

## Current State: Everything built, waiting on Pinterest approval

The automated marketing pipeline for GrandGridStudio (Etsy nonogram puzzle shop) is fully built and deployed. The only blocker is Pinterest API trial access approval.

## What's Live

- **80 marketing posts** seeded in Supabase `marketing_posts` table, scheduled Apr 7 – Oct 8, 2026
- **45 puzzle images** extracted from PDFs and uploaded to Supabase Storage bucket `marketing-images`
- **Weekly approval email system**: every Sunday 20:00 Israel time, Yaniv gets an email with that week's 3 pins. He clicks "Approve All" → posts are marked `approved` → cron publishes them automatically via Pinterest API
- **Supabase Edge Functions deployed:**
  - `weekly-digest` — sends the approval email (tested, works)
  - `approve-posts` — handles the approve button click (tested, works)
  - `grandgridstudio` — serves privacy policy page for Pinterest app registration
  - `send-escalation-email` — customer escalation emails
- **VM (Hetzner):** IP `178.104.137.140`, user `grandgrid`, cron running 3x/week (Tue/Thu/Sat) + Sunday digest
- **Crontab** updated and installed on VM
- **Git repo:** `github.com/yanivtager/Nonogramproject2026`, code is up to date on VM

## The One Blocker

**Pinterest API app (ID 1559652)** — trial access pending review by Pinterest. When approved:

1. Yaniv gets email from Pinterest
2. Go to https://developers.pinterest.com/apps/ → Manage the app → get **App Secret**
3. Run locally: `node automation/scripts/pinterest-oauth-setup.mjs`
   - Enter App ID (`1559652`) and App Secret
   - Opens browser for OAuth authorization
   - Saves tokens to `automation/auth/pinterest-tokens.json`
4. SCP tokens to VM: `scp automation/auth/pinterest-tokens.json grandgrid@178.104.137.140:/home/grandgrid/Nonogramproject2026/automation/auth/`
5. Create a board called "Grand Grid Studio" on Pinterest if not already done
6. Test on VM: `cd /home/grandgrid/Nonogramproject2026 && source .env && node automation/tasks/content-post.mjs`
7. Done — system is fully autonomous from here

## Architecture

```
Sunday 20:00 IST → cron triggers weekly-digest.mjs
  → calls Supabase Edge Function weekly-digest
  → sends email to yanivtager@gmail.com with week's posts
  → Yaniv clicks "Approve All" in email
  → hits Supabase Edge Function approve-posts
  → posts marked 'approved' in marketing_posts table

Tue/Thu/Sat → cron triggers content-post.mjs
  → queries marketing_posts where status='approved' AND scheduled_at <= now
  → calls Pinterest API v5 POST /pins
  → marks post as 'posted' with the pin URL
```

## Key Files

| File | Purpose |
|------|---------|
| `automation/tasks/content-post.mjs` | Cron job: publishes approved Pinterest posts via API |
| `automation/tasks/weekly-digest.mjs` | Cron job: triggers weekly approval email |
| `automation/platforms/pinterest.mjs` | Pinterest API v5 client (pin creation, token refresh) |
| `automation/scripts/pinterest-oauth-setup.mjs` | One-time OAuth token setup |
| `automation/lib/supabase.mjs` | DB helpers: getNextScheduledPost (status='approved'), approvePostsByToken, etc. |
| `supabase/functions/weekly-digest/index.ts` | Edge function: builds & sends approval email via Resend |
| `supabase/functions/approve-posts/index.ts` | Edge function: one-click approval endpoint |
| `config/crontab.txt` | Full cron schedule (installed on VM) |
| `docs/bot-setup-guide.md` | Detailed setup guide with research citations |

## What Was Dropped

- **Reddit auto-posting**: Reddit's Responsible Builder Policy prohibits commercial automated posting. API request was submitted but likely to be denied. Reddit content drafts remain in Supabase if Yaniv ever wants to post manually.
- **Playwright browser automation**: Replaced entirely by REST APIs. Pinterest and Reddit Playwright modules (`platforms/reddit.mjs`, `scripts/reddit-login-clean.mjs`, etc.) are still in the repo but unused.

## Important Context

- **Resend free tier** only sends to `yanivtager@gmail.com` (the verified account email). To send to other emails, need to verify a domain on Resend.
- **Pinterest trial access creates invisible pins**. After trial works, Yaniv needs to apply for **Standard Access** (requires a demo video showing OAuth flow + pin creation). Until Standard Access, pins are sandboxed.
- **Supabase project ref:** `jmzkexgwcvodquczjqfk`
- **Pinterest Business URL:** www.pinterest.com/GrandGridStudio
- **.env** is local-only (not committed), contains SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, ESCALATION_EMAIL

## User Preferences (Yaniv)

- Wants zero manual posting — the weekly email + approve button is the maximum effort he's willing to put in
- Gets frustrated by untested solutions — always verify before suggesting
- Prefers CLI/automated solutions over manual browser steps
- Israel timezone (UTC+3 summer)
- Email: yanivtager@gmail.com

## To Resume

Just say: "Pinterest approved my app" or "continue the marketing plan" and read this document.
