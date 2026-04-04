#!/usr/bin/env node
// Content posting — runs at 12:00 Israel time
// Posts scheduled marketing content to Pinterest and Reddit

import { launchBrowser } from '../lib/browser.mjs';
import { getReadyPosts, markPostPublished, markPostFailed, logActivity } from '../lib/supabase.mjs';
import { createPin } from '../platforms/pinterest.mjs';
import { createRedditPost } from '../platforms/reddit.mjs';

// Posting schedule: which platforms to post on which day
const SCHEDULE = {
  0: { pinterest: 2, reddit: 0 },  // Sunday
  1: { pinterest: 1, reddit: 1 },  // Monday (r/nonograms)
  2: { pinterest: 1, reddit: 0 },  // Tuesday
  3: { pinterest: 1, reddit: 1 },  // Wednesday (r/puzzles)
  4: { pinterest: 1, reddit: 0 },  // Thursday
  5: { pinterest: 1, reddit: 1 },  // Friday (community engagement)
  6: { pinterest: 0, reddit: 1 },  // Saturday (casual/fun)
};

const SUBREDDITS = {
  1: 'nonograms',    // Monday
  3: 'puzzles',      // Wednesday
  5: 'picross',      // Friday
  6: 'nonograms',    // Saturday
};

async function main() {
  console.log(`[${new Date().toISOString()}] Starting content posting run...`);
  const dayOfWeek = new Date().getDay();
  const todaySchedule = SCHEDULE[dayOfWeek];

  const readyPosts = await getReadyPosts();
  if (!readyPosts.length) {
    console.log('No posts ready to publish. Generate content first.');
    await logActivity('content_run_empty', null, { message: 'No ready_to_post content found' }, 'warning');
    return;
  }

  const context = await launchBrowser();
  let posted = 0;

  try {
    // Post to Pinterest
    const pinterestPosts = readyPosts.filter(p => p.platform === 'pinterest').slice(0, todaySchedule.pinterest);
    for (const post of pinterestPosts) {
      console.log(`Posting to Pinterest: ${post.copy_text.substring(0, 50)}...`);
      const url = await createPin(context, {
        boardName: post.details?.board || 'Nonogram Puzzles',
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
    }

    // Post to Reddit
    const subreddit = SUBREDDITS[dayOfWeek];
    if (subreddit && todaySchedule.reddit > 0) {
      const redditPosts = readyPosts.filter(p => p.platform === 'reddit').slice(0, todaySchedule.reddit);
      for (const post of redditPosts) {
        console.log(`Posting to Reddit r/${subreddit}: ${post.copy_text.substring(0, 50)}...`);
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
      }
    }

    console.log(`Content run complete: ${posted} posts published.`);
    await logActivity('content_run_complete', null, { postsPublished: posted, day: dayOfWeek });

  } finally {
    await context.close();
  }
}

main().catch(err => {
  console.error('Content posting failed:', err);
  process.exit(1);
});
