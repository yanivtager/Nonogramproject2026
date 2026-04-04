# GrandGridStudio — Automated Marketing Operations

AI-powered marketing and customer service system for the GrandGridStudio Etsy nonogram puzzle shop.

## Architecture

- **Claude Code + Computer Use**: Orchestration engine running on a cloud VM
- **Supabase**: Database for puzzle catalog, marketing posts, message handling, escalation queue
- **Resend**: Email notifications for escalations and daily summaries
- **Lovable App**: Nonogram puzzle generation and teaser image export

## Project Structure

```
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql    # Database tables
│   │   └── 002_seed_faq.sql          # FAQ knowledge base (20 entries)
│   └── functions/
│       └── send-escalation-email/    # Edge Function for escalation notifications
├── prompts/
│   ├── system-context.md             # Brand identity, rules, tone
│   ├── morning-sweep.md              # 08:00 — message check + respond
│   ├── content-run.md                # 12:00 — generate + post content
│   ├── afternoon-sweep.md            # 18:00 — message check + reminders
│   └── night-summary.md              # 22:00 — daily summary email
├── config/
│   ├── crontab.txt                   # Cron schedule (4 runs/day)
│   └── .env.example                  # Environment variables template
└── scripts/
    └── setup-vm.sh                   # Cloud VM setup script
```

## Setup

1. Provision a cloud VM (Hetzner, DigitalOcean, or Oracle Cloud free tier)
2. Run `scripts/setup-vm.sh`
3. Create Supabase project and run migrations in SQL Editor
4. Deploy Edge Function: `supabase functions deploy send-escalation-email`
5. Configure `.env` with your keys
6. Set up browser profiles with platform logins
7. Cron handles the rest — check your email for escalations and daily reports
