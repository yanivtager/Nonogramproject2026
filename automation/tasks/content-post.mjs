#!/usr/bin/env node
// Content posting — runs 3x/week via cron
// Tue 08:00 UTC (Europe), Thu 16:00 UTC (USA), Sat 12:00 UTC (Asia/AU)
// Posts the next scheduled ready_to_post entry (1 post per run)

import { launchBrowser } from '../lib/browser.mjs';
import { getNextScheduledPost, markPostPublished, markPostFailed, logActivity } from '../lib/supabase.mjs';
import { createPin } from '../platforms/pinterest.mjs';
import { createRedditPost } from '../platforms/reddit.mjs';

// Subreddit rotation for Reddit posts
const SUBREDDIT_ROTATION = ['nonograms', 'puzzles', 'picross'];

async function main() {
  console.log(`[${new Date().toISOString()}] Starting content posting run...`);

  const post = await getNextScheduledPost();
  if (!post) {
    console.log('No posts scheduled for now. All caught up!');
    await logActivity('content_run_empty', null, { message: 'No scheduled posts due' }, 'warning');
    return;
  }

  console.log(`Posting: "${post.copy_text.substring(0, 60)}..." to ${post.platform}`);

  let posted = 0;

  try {
    if (post.platform === 'pinterest') {
      // Pinterest uses the REST API — no browser needed
      const url = await createPin(null, {
        boardName: 'Grand Grid Studio',
        title: post.copy_text.split('\n')[0],
        description: post.copy_text,
        imagePath: post.image_url,
        link: post.puzzles?.etsy_listing_url || 'https://www.etsy.com/shop/GrandGridStudio',
      });
      if (url) {
        await markPostPublished(post.id, url);
        posted++;
      } else {
        await markPostFailed(post.id, 'Pinterest post failed');
      }
    } else if (post.platform === 'reddit') {
      // Reddit still uses Playwright browser automation
      const context = await launchBrowser('reddit');
      try {
        // Rotate subreddits based on post count
        const { data: postedCount } = await (await import('../lib/supabase.mjs')).supabase
          .from('marketing_posts')
          .select('id', { count: 'exact', head: true })
          .eq('platform', 'reddit')
          .eq('status', 'posted');
        const subIdx = (postedCount?.length || 0) % SUBREDDIT_ROTATION.length;
        const subreddit = SUBREDDIT_ROTATION[subIdx];

        console.log(`  Target subreddit: r/${subreddit}`);
        const url = await createRedditPost(context, {
          subreddit,
          title: post.copy_text.split('\n')[0],
          body: post.copy_text,
          imagePath: post.image_url,
        });
        if (url) {
          await markPostPublished(post.id, url);
          posted++;
        } else {
          await markPostFailed(post.id, `Reddit r/${subreddit} post failed`);
        }
      } finally {
        await context.close();
      }
    }

    console.log(`Content run complete: ${posted} post(s) published.`);
    await logActivity('content_run_complete', post.platform, { postId: post.id, posted });
  } catch (err) {
    console.error(`Post ${post.id} error:`, err.message);
    await markPostFailed(post.id, err.message);
  }
}

main().catch(err => {
  console.error('Content posting failed:', err);
  process.exit(1);
});
