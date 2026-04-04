# Afternoon Sweep — 18:00 Israel Time

## Objective
Second message check of the day + post any evening-scheduled content.

## Steps

### 1. Message Sweep
Same process as morning sweep:
- Check Etsy, Reddit, Pinterest, Instagram for new messages
- Classify, auto-respond, or escalate
- Log everything to Supabase

### 2. Escalation Reminders
- Query: `SELECT * FROM escalation_queue WHERE resolved = FALSE AND created_at < NOW() - INTERVAL '36 hours' AND reminder_sent = FALSE`
- For each overdue escalation: send reminder email, update `reminder_sent = TRUE`

### 3. Evening Content (if scheduled)
- Check `marketing_posts` with status `ready_to_post` for today
- Post any remaining scheduled content

### 4. Log Activity
- Log sweep summary to `activity_log`
