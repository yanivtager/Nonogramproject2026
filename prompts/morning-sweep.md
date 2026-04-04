# Morning Sweep — 08:00 Israel Time

## Objective
Check all platforms for overnight messages, classify them, and respond or escalate.

## Steps

### 1. Check Etsy Messages
- Open browser → Etsy shop dashboard → Messages
- For each new/unread message:
  - Log to Supabase `messages_inbox` table
  - Classify using FAQ knowledge base: faq | purchase_support | escalation | spam
  - If FAQ/purchase_support: auto-respond with bot disclosure, log response
  - If escalation: post holding response, create escalation_queue entry, trigger email
  - If spam: log and skip

### 2. Check Reddit
- Check notifications on the GrandGridStudio bot account
- Check mentions in r/nonograms, r/puzzles, r/picross
- For each new reply/mention:
  - Log to messages_inbox
  - Classify and respond per escalation rules
  - Respect subreddit rules — no excessive self-promotion

### 3. Check Pinterest
- Check notifications on brand account
- Log and respond to any comments on pins

### 4. Check Instagram DMs
- Check DMs on brand account
- Log and respond with bot disclosure

### 5. Log Activity
- Log sweep summary to `activity_log`:
  - Messages found per platform
  - Auto-responses sent
  - Escalations created
  - Errors encountered
