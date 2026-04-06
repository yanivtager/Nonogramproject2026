#!/usr/bin/env node
// Content posting — runs 3x/week via cron
// Tue 08:00 UTC (Europe), Thu 16:00 UTC (USA), Sat 12:00 UTC (Asia/AU)
// Only publishes posts with status 'approved' (set via weekly email approval)

import { getNextScheduledPost, markPostPublished, markPostFailed, logActivity } from '../lib/supabase.mjs';
import { createPin } from '../platforms/pinterest.mjs';

async function main() {
  console.log(`[${new Date().toISOString()}] Starting content posting run...`);

  const post = await getNextScheduledPost();
  if (!post) {
    console.log('No approved posts due. All caught up!');
    await logActivity('content_run_empty', null, { message: 'No approved posts due' }, 'warning');
    return;
  }

  console.log(`Posting: "${post.copy_text.substring(0, 60)}..." to ${post.platform}`);

  try {
    if (post.platform === 'pinterest') {
      const url = await createPin(null, {
        boardName: 'Grand Grid Studio',
        title: post.copy_text.split('\n')[0],
        description: post.copy_text,
        imagePath: post.image_url,
        link: post.puzzles?.etsy_listing_url || 'https://www.etsy.com/shop/GrandGridStudio',
      });
      if (url) {
        await markPostPublished(post.id, url);
        console.log(`Content run complete: 1 post published.`);
        await logActivity('content_run_complete', 'pinterest', { postId: post.id, url });
      } else {
        await markPostFailed(post.id, 'Pinterest post returned no URL');
      }
    } else {
      console.log(`Platform "${post.platform}" not supported for auto-posting. Skipping.`);
      await logActivity('content_run_skip', post.platform, { postId: post.id, reason: 'unsupported platform' }, 'warning');
    }
  } catch (err) {
    console.error(`Post ${post.id} error:`, err.message);
    await markPostFailed(post.id, err.message);
  }
}

main().catch(err => {
  console.error('Content posting failed:', err);
  process.exit(1);
});
