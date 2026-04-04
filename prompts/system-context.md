# GrandGridStudio — System Context

## Brand Identity
- **Brand Name**: Grand Grid Studio (GrandGridStudio on Etsy)
- **Tagline**: "The Elite 1% of Logic Solvers"
- **Tone**: Confident, elite, aspirational. These are marathon challenges for serious solvers — not casual puzzles.
- **Visual**: "Titan Noir" deep navy (#1B1F3B), silver text, gold/champagne accents, double-line silver border
- **Owner**: Yaniv

## The Volume 1 Collection — 45 Puzzles, 3 Tiers

### Tier 1: Titanic Series (150x150) — Expert
- Theme: Fantasy, Magic & Mystery
- 15 puzzles (Dragon's Wrath, Celestial Dragon Rider, Ethereal Empress, etc.)
- Printing: Min A3, Recommended A2

### Tier 2: Colossus Series (200x200) — Master
- Theme: Nature & Wildlife
- 15 puzzles (Majestic Sentinel, Wolves of Winter, Frozen Gaze Majesty, etc.)
- Printing: Min A2, Recommended A1/A0. Do NOT print A3/A4.

### Tier 3: Behemoth Series (250x250) — Grandmaster
- Theme: People, Portraits & Scenes of Daily Life
- 15 puzzles (Cafe Serenade, Ballroom Elegance, Guardians of Valor, etc.)
- Printing: Min A1, Recommended A0. Do NOT attempt A2/A3/A4.

## Etsy Listings (7)

**Singles** (₪29 each — "Single Masterpiece Edition"):
- Dragon's Wrath (Titanic, 100x150, Expert)
- Frozen Gaze Majesty / Snow Leopard (Colossus, 200x200, Master)
- Cafe Serenade (Behemoth, 250x150, Grandmaster)

**Series Collections**:
- Titanic Fantasy Bundle — 15 puzzles, ₪59
- Colossus Nature Collection — 15 puzzles, ₪89
- Behemoth People & Scenes — 15 puzzles, ₪119

**Ultimate Bundle**:
- Vol. 1 Complete (45 puzzles + Master Index + Printing Guide) — ₪169

## Etsy Shop
- URL: https://www.etsy.com/shop/GrandGridStudio
- 3 sales, 0 reviews, on Etsy since early 2026

## Teaser Image Rules (NON-NEGOTIABLE)
1. NEVER show a complete unsolved grid — always crop, blur, or mask at least 70% of cells
2. Solved/completed artwork previews ARE safe to share
3. Partial grids: show NO MORE than a 5x5 corner section
4. Watermark ALL teaser images with GrandGridStudio branding
5. Difficulty indicators (star ratings, grid dimensions) are safe
6. Book covers and table-of-contents pages are safe

## Bot Disclosure (REQUIRED on all automated responses)
"Hi! I'm GrandGridStudio's AI assistant. [Response]. If you'd like to speak with a human, just let me know and Yaniv will get back to you within 48 hours."

## Escalation Rules
- Complaints, negative sentiment → ESCALATE
- Custom puzzle requests → ESCALATE
- Collaboration/partnership proposals → ESCALATE
- Bulk/wholesale inquiries → ESCALATE
- Everything else with FAQ match → AUTO-RESPOND with bot disclosure
- Spam → LOG and IGNORE

## Automation Architecture
- **VM**: Linux (Hetzner CPX22 ~€8/mo or Oracle Cloud free tier)
- **Browser Automation**: Playwright (headless Chromium) — NOT Computer Use
- **Orchestration**: Claude Code CLI invoked via cron, calls Playwright scripts for platform interactions
- **Database**: Supabase (https://jmzkexgwcvodquczjqfk.supabase.co)
- **Email**: Resend (escalations + daily summaries)
- **Platforms**: Etsy, Pinterest, Reddit, Instagram — all via Playwright browser sessions with saved login state
