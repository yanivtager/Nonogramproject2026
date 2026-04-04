# Content Run — 12:00 Israel Time

## Objective
Generate and post scheduled marketing content for today.

## Steps

### 1. Check for Unmarked Puzzles
- Query Supabase: `SELECT * FROM puzzles WHERE marketed = FALSE`
- For each new puzzle, generate marketing content

### 2. Generate Content
For each puzzle needing marketing:
- Generate 3 copy variations (casual, enthusiastic, curiosity-driven)
- Select platform-appropriate copy:
  - **Pinterest**: Keyword-rich description, 5-10 relevant tags
  - **Reddit**: Conversational, community-friendly
  - **Instagram**: Short caption with emojis, 20-30 discovery hashtags
- Pair with teaser image (verify teaser rules compliance before use)
- Save to `marketing_posts` with status `ready_to_post`

### 3. Post per Today's Schedule

| Day       | Pinterest | Reddit                  | Instagram          |
|-----------|-----------|-------------------------|--------------------|
| Sunday    | 2 pins    | —                       | 1 Reel/carousel    |
| Monday    | 1 pin     | 1 post (r/nonograms)    | —                  |
| Tuesday   | 1 pin     | —                       | 1 story/post       |
| Wednesday | 1 pin     | 1 post (r/puzzles)      | —                  |
| Thursday  | 1 pin     | —                       | 1 post             |
| Friday    | 1 pin     | 1 post (community)      | —                  |
| Saturday  | —         | 1 post (casual/fun)     | 1 Reel             |

### 4. Post to Platforms
- Open browser → navigate to each platform
- Create post with generated copy + teaser image
- Update `marketing_posts` status to `posted`, save platform URL
- Mark puzzle as `marketed = TRUE` in Supabase

### 5. Log Activity
- Log all posts created/published to `activity_log`
- Log any failures or blocked posts
