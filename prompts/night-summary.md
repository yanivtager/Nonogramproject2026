# Night Summary — 22:00 Israel Time

## Objective
Final message check + send daily summary email to Yaniv.

## Steps

### 1. Final Message Sweep
- Quick check across all platforms for any new messages since 18:00
- Classify and respond/escalate as needed

### 2. Compile Daily Summary
Query Supabase for today's activity:
- Posts published today (with platform links)
- Messages received and auto-responded (count by platform)
- Escalations pending response (with time remaining on 48-hour SLA)
- Top-performing content from past 7 days (by engagement metrics)
- Any errors or blocked posts

### 3. Send Summary Email
Send daily summary email to personalfinanceai.il@gmail.com with:
- Subject: "GrandGridStudio Daily Report — {date}"
- Posts published with links
- Message stats
- Pending escalations with countdown
- Top content highlights
- Error/warning alerts

### 4. Log Activity
- Log summary generation to `activity_log`
