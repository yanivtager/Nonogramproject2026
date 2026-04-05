// Generate ~80 marketing posts and insert into marketing_posts table
// Usage: export $(grep -v '^#' .env | xargs) && node automation/scripts/seed-content.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Fetch all puzzles from DB
async function getPuzzles() {
  const { data, error } = await supabase.from('puzzles').select('*').order('book_title', { ascending: true });
  if (error) throw error;
  return data;
}

// --- COPY TEMPLATES ---

// 1. Puzzle Spotlight posts (45 posts — one per puzzle)
function puzzleSpotlight(puzzle) {
  const series = puzzle.book_title.replace(' Series', '');
  const gridLabel = puzzle.grid_size;
  const difficulty = series === 'Titanic' ? 'Expert' : series === 'Colossus' ? 'Master' : 'Grandmaster';
  const tier = series === 'Titanic' ? 'Tier 1' : series === 'Colossus' ? 'Tier 2' : 'Tier 3';

  const templates = [
    `"${puzzle.name}" — a ${gridLabel} ${difficulty}-level nonogram from the ${series} Series.\n\nThis isn't a 15x15 warmup. This is ${gridLabel} cells of pure logic. Every row, every column, every decision matters.\n\n${tier} • ${series} Series • Grand Grid Studio Vol. 1`,

    `Meet "${puzzle.name}" from the ${series} Series.\n\n${gridLabel} grid. No colors. No hints. Just you, the clues, and thousands of cells waiting to be filled.\n\nThis is what separates solvers from masters.\n\n🔗 Link in bio • Code NEXTLEVEL for 25% off`,

    `Can you solve "${puzzle.name}"?\n\n${gridLabel} cells. ${difficulty} difficulty. The solved image reveals stunning pixel art — but you'll have to earn it.\n\nPart of the ${series} Series (15 puzzles) in Grand Grid Studio Vol. 1.\n\nAre you ready?`,

    `"${puzzle.name}" — ${series} Series\n\nGrid: ${gridLabel} | Difficulty: ${difficulty}\n\nThe solved artwork speaks for itself. But getting there? That's the real challenge. Every cell is a decision. Every row is a puzzle within a puzzle.\n\nGrand Grid Studio • Made for the elite 1% of solvers`,

    `This is "${puzzle.name}" — solved.\n\nWhat you see is the reward. What you don't see is the hours of logic, deduction, and patience it takes to fill a ${gridLabel} grid cell by cell.\n\n${series} Series • Grand Grid Studio Vol. 1\n\nCode NEXTLEVEL saves you 25%`,
  ];

  // Rotate through templates based on puzzle order hash
  const idx = (puzzle.name.length + (puzzle.grid_size?.charCodeAt(0) || 0)) % templates.length;
  return templates[idx];
}

// 2. Series/Collection Showcase (9 posts — 3 per series + 3 cross-series)
function seriesShowcases() {
  return [
    // Titanic
    {
      copy: `The Titanic Series — 15 Expert-Level Fantasy Nonograms\n\nDragons. Libraries. Mystic chambers. Every puzzle is a 150x150 grid of pure logic that reveals stunning pixel art when solved.\n\nThis is where your nonogram journey gets serious.\n\n15 puzzles • Expert difficulty • Fantasy & Magic theme\nGrand Grid Studio Vol. 1`,
      series: 'Titanic',
      type: 'series_showcase',
    },
    {
      copy: `15 fantasy worlds. 15 logic challenges. Zero hints.\n\nThe Titanic Series pushes expert solvers with 150x150 grids featuring dragons, enchanted libraries, and celestial riders.\n\nPrint on A2 or larger. Grab a pencil. Enter the grid.\n\n🔗 Available now on Etsy`,
      series: 'Titanic',
      type: 'series_showcase',
    },
    // Colossus
    {
      copy: `The Colossus Series — 15 Master-Level Nature Nonograms\n\n200x200 grids. Eagles, wolves, elephants, snow leopards. Each solved puzzle reveals breathtaking wildlife pixel art.\n\nPrint on A1 minimum. These grids don't fit on a desk — they demand a wall.\n\n15 puzzles • Master difficulty • Nature & Wildlife\nGrand Grid Studio Vol. 1`,
      series: 'Colossus',
      type: 'series_showcase',
    },
    {
      copy: `200×200 cells of nature, decoded through pure logic.\n\nThe Colossus Series features 15 wildlife nonograms — from Majestic Sentinel to Jungle Sentinel. Every grid is a test of endurance and deduction.\n\nNot for beginners. Not even for most experts.\n\nGrand Grid Studio • The Elite 1% of Logic Solvers`,
      series: 'Colossus',
      type: 'series_showcase',
    },
    // Behemoth
    {
      copy: `The Behemoth Series — 15 Grandmaster-Level Nonograms\n\n250×250 grids. People, portraits, scenes of daily life. Each puzzle contains 62,500 cells of pure logic.\n\nPrint on A0. Clear your weekend. Clear your week.\n\n15 puzzles • Grandmaster difficulty • People & Scenes\nGrand Grid Studio Vol. 1`,
      series: 'Behemoth',
      type: 'series_showcase',
    },
    {
      copy: `62,500 cells per puzzle. 15 puzzles. Zero shortcuts.\n\nThe Behemoth Series is the final boss of nonograms. Cafe scenes, ballroom elegance, cityscapes — all hidden inside 250×250 grids.\n\nIf you've finished everything else, this is what's next.\n\nGrand Grid Studio Vol. 1 • Available on Etsy`,
      series: 'Behemoth',
      type: 'series_showcase',
    },
    // Cross-series
    {
      copy: `3 tiers. 45 puzzles. 1 ultimate collection.\n\n🔹 Titanic (150×150) — Expert — Fantasy & Magic\n🔹 Colossus (200×200) — Master — Nature & Wildlife\n🔹 Behemoth (250×250) — Grandmaster — People & Scenes\n\nGrand Grid Studio Vol. 1 has something for every serious solver. Start at your level, work your way up.\n\nCode NEXTLEVEL for 25% off the Ultimate Bundle`,
      series: 'All',
      type: 'series_showcase',
    },
    {
      copy: `How far can you go?\n\nLevel 1: Titanic — 150×150 Expert grids\nLevel 2: Colossus — 200×200 Master grids\nLevel 3: Behemoth — 250×250 Grandmaster grids\n\n45 puzzles total. Each one reveals pixel art when solved. Each one is harder than the last.\n\nGrand Grid Studio Vol. 1 — The progression system for elite solvers`,
      series: 'All',
      type: 'series_showcase',
    },
    {
      copy: `The Grand Grid Studio Vol. 1 Collection:\n\n✦ 45 unique nonogram puzzles\n✦ 3 difficulty tiers (Expert → Master → Grandmaster)\n✦ Grid sizes from 150×150 to 250×250\n✦ Themes: Fantasy, Nature, People & Scenes\n✦ Print-ready PDFs with Master Index\n✦ Printing guide included\n\nDesigned for solvers who've outgrown 25×25 puzzles.\n\nNEXTLEVEL = 25% off`,
      series: 'All',
      type: 'series_showcase',
    },
  ];
}

// 3. Listing Promotion posts (7 posts — one per Etsy listing)
function listingPromotions() {
  return [
    {
      copy: `NEW: Dragon's Wrath — Single Masterpiece Edition\n\nOne puzzle. 100×150 grid. Expert difficulty.\n\nPerfect if you want to test yourself before committing to a full series. Print, solve, reveal the dragon.\n\n₪29 on Etsy • Instant PDF download\n\n🔗 Link in bio`,
      listing: 'dragons_wrath_single',
      type: 'listing_promo',
    },
    {
      copy: `NEW: Frozen Gaze Majesty — Snow Leopard Edition\n\nA single 200×200 Master-level nonogram. The solved pixel art reveals a majestic snow leopard.\n\nPrint on A1 or larger. This is a serious grid.\n\n₪29 on Etsy • Instant download`,
      listing: 'frozen_gaze_single',
      type: 'listing_promo',
    },
    {
      copy: `NEW: Cafe Serenade — Single Masterpiece Edition\n\n250×250 Grandmaster grid. 62,500 cells of pure logic. The solved image reveals a bustling cafe scene.\n\nThe biggest single puzzle we offer. Not for the faint of heart.\n\n₪29 on Etsy • Print on A0`,
      listing: 'cafe_serenade_single',
      type: 'listing_promo',
    },
    {
      copy: `Titanic Fantasy Bundle — 15 Expert Nonograms\n\n15 puzzles, one theme, endless hours of solving. Dragons, libraries, mystic chambers — all in 150×150 grids.\n\n₪59 on Etsy (that's under ₪4 per puzzle)\n\nCode NEXTLEVEL for 25% off`,
      listing: 'titanic_bundle',
      type: 'listing_promo',
    },
    {
      copy: `Colossus Nature Collection — 15 Master-Level Nonograms\n\n200×200 grids featuring eagles, wolves, elephants, and more. Each puzzle reveals stunning wildlife pixel art.\n\n₪89 on Etsy • 15 print-ready PDFs\n\nReady to level up from Expert?`,
      listing: 'colossus_bundle',
      type: 'listing_promo',
    },
    {
      copy: `Behemoth Series — 15 Grandmaster Nonograms\n\n250×250 grids. The largest nonograms you'll find anywhere. Cafe scenes, ballrooms, cityscapes — all in pixel art.\n\n₪119 on Etsy • For the absolute elite\n\nCode NEXTLEVEL for 25% off`,
      listing: 'behemoth_bundle',
      type: 'listing_promo',
    },
    {
      copy: `Grand Grid Studio Vol. 1 — The Ultimate Bundle\n\n45 puzzles across 3 difficulty tiers. Every puzzle in our collection, plus the Master Index and Printing Guide.\n\n₪169 on Etsy (that's ₪3.75 per puzzle)\n\nThe most nonogram you can get in one download.\n\nCode NEXTLEVEL = 25% off`,
      listing: 'ultimate_bundle',
      type: 'listing_promo',
    },
  ];
}

// 4. Educational posts (10 posts)
function educationalPosts() {
  return [
    {
      copy: `How to print a 200×200 nonogram (without going insane)\n\nRule 1: Never print on A4. You'll need a magnifying glass.\nRule 2: A2 is the minimum for Colossus grids. A1 is recommended.\nRule 3: Use thick paper (120gsm+). You'll be erasing.\nRule 4: Print in landscape for landscape grids. Obvious, but people forget.\n\nOur Printing Guide (included free) covers paper sizes, margins, and recommended settings for every grid size.\n\nGrand Grid Studio Vol. 1`,
      type: 'educational',
      topic: 'printing_tips',
    },
    {
      copy: `Nonogram solving strategy: The "guaranteed cells" technique\n\nFor any clue row/column, some cells can be determined before you start cross-referencing.\n\nExample: A 200-cell row with clue [120] → cells 81-120 are guaranteed filled.\n\nFormula: If clue sum + gaps > half the row length, overlap cells are guaranteed.\n\nThis technique scales beautifully to our 150×150 and 200×200 grids. Master it and you'll crack the first 20% of any puzzle in minutes.\n\nGrand Grid Studio — Made for solvers who think in systems`,
      type: 'educational',
      topic: 'solving_strategy',
    },
    {
      copy: `The difference between a 25×25 and a 250×250 nonogram isn't just size.\n\n25×25 = 625 cells. One sitting. Simple patterns.\n250×250 = 62,500 cells. Multiple sessions. Layered logic.\n\nAt 250×250, you need:\n• A tracking system (mark solved rows)\n• Print size planning (A0 minimum)\n• Patience measured in hours, not minutes\n\nOur Behemoth Series lives at 250×250. It's a different sport.\n\nGrand Grid Studio Vol. 1`,
      type: 'educational',
      topic: 'grid_comparison',
    },
    {
      copy: `5 mistakes that will ruin your giant nonogram:\n\n1. Printing too small (A4 for a 200×200? No.)\n2. Using pen instead of pencil (you WILL make errors)\n3. Not marking completed rows/columns\n4. Trying to solve randomly instead of systematically\n5. Skipping the edge analysis phase\n\nGiant grids reward method, not guessing. Work the edges first, find guaranteed cells, then fill inward.\n\nGrand Grid Studio — Puzzles for methodical minds`,
      type: 'educational',
      topic: 'solving_strategy',
    },
    {
      copy: `Why do our solved nonograms look like photographs?\n\nIt's called Floyd-Steinberg dithering — an algorithm that converts grayscale images into pure black and white while preserving the illusion of shading.\n\nEach cell is either filled or empty, but the pattern of filled cells mimics continuous tone. The bigger the grid, the more detail survives.\n\nThat's why a 250×250 Behemoth puzzle reveals portrait-quality pixel art when solved.\n\nScience + art + logic = Grand Grid Studio`,
      type: 'educational',
      topic: 'behind_the_scenes',
    },
    {
      copy: `Paper size guide for Grand Grid Studio puzzles:\n\n📐 Titanic (150×150): Print on A3 minimum, A2 recommended\n📐 Colossus (200×200): Print on A2 minimum, A1 recommended\n📐 Behemoth (250×250): Print on A1 minimum, A0 recommended\n\n⚠️ Do NOT print Colossus or Behemoth on A3/A4. The cells will be too small to work with.\n\nEvery purchase includes our free Printing Guide with exact settings.\n\nGrand Grid Studio Vol. 1`,
      type: 'educational',
      topic: 'printing_tips',
    },
    {
      copy: `Advanced technique: Cross-referencing multiple rows\n\nIn a 150×150 grid, single-row analysis only gets you so far. The real breakthroughs come from cross-referencing.\n\nWhen you know cell (row 45, col 80) must be filled, check what that means for col 80's clues. Each deduction cascades.\n\nIn our Titanic Series, a single cross-reference can unlock 10+ cells. In Behemoth, it can unlock 50+.\n\nThis is why giant nonograms are addictive.\n\nGrand Grid Studio — Engineered for deep logic`,
      type: 'educational',
      topic: 'solving_strategy',
    },
    {
      copy: `How we create a nonogram puzzle:\n\n1. AI generates a detailed image matching our theme\n2. The image is converted to grayscale\n3. Floyd-Steinberg dithering reduces it to pure black/white\n4. A grid is overlaid and clues are calculated for every row and column\n5. The puzzle is verified to have exactly one solution\n6. A print-ready PDF is generated with proper formatting\n\nEvery puzzle in Grand Grid Studio Vol. 1 went through this process. No random grids — every solution is meaningful art.\n\nGrand Grid Studio`,
      type: 'educational',
      topic: 'behind_the_scenes',
    },
    {
      copy: `Solving a 200×200 nonogram in phases:\n\nPhase 1 — Edge scan: Check all rows and columns for guaranteed cells (10 min)\nPhase 2 — First pass: Work through rows with the most information (30 min)\nPhase 3 — Cross-reference: Use confirmed cells to solve adjacent rows/cols (1-2 hours)\nPhase 4 — Deep logic: The remaining cells require multi-step deduction (2-4 hours)\nPhase 5 — Cleanup: Fill the last holdouts (30 min)\n\nTotal: 4-8 hours for experienced solvers.\n\nColossus Series • Grand Grid Studio Vol. 1`,
      type: 'educational',
      topic: 'solving_strategy',
    },
    {
      copy: `Why we don't make "easy" nonograms:\n\nThere are hundreds of free 15×15 and 25×25 nonograms online. The world doesn't need more.\n\nWhat the world needs is nonograms that challenge experienced solvers. Grids that take hours, not minutes. Solutions that reveal real art, not simple icons.\n\nThat's why Grand Grid Studio starts at 150×150 and goes up to 250×250.\n\nWe made these for the elite 1% of logic solvers. If that's you, welcome.\n\nGrand Grid Studio Vol. 1`,
      type: 'educational',
      topic: 'brand_philosophy',
    },
  ];
}

// 5. Behind-the-scenes posts (5 posts)
function behindTheScenes() {
  return [
    {
      copy: `A look inside the Grand Grid Studio production line:\n\nEvery puzzle starts as an AI-generated image, carefully tuned for the right theme and detail level. Then our dithering algorithm converts it to black and white — preserving depth through pattern density alone.\n\nThe result: pixel art that emerges only when you solve the puzzle correctly.\n\n45 puzzles. Each one hand-verified. Grand Grid Studio Vol. 1`,
      type: 'behind_the_scenes',
    },
    {
      copy: `Why "Vol. 1"?\n\nBecause this is just the beginning. Our first collection covers 3 themes across 3 difficulty tiers — Fantasy, Nature, and People & Scenes.\n\nVol. 2 is already in planning. Different themes, same giant grids, same commitment to quality.\n\nBut first — have you finished Vol. 1?\n\n45 puzzles waiting on Etsy. Code NEXTLEVEL for 25% off.`,
      type: 'behind_the_scenes',
    },
    {
      copy: `The naming of our puzzles:\n\nEvery puzzle name is chosen to match its hidden image — but you won't know HOW it matches until you solve it.\n\n"Celestial Dragon Rider" — is it literal? Metaphorical?\n"Monolith Awakening" — what's waking up?\n"Soulful Serenade" — who's playing?\n\nThe name is a preview. The grid is the journey. The solved art is the answer.\n\nGrand Grid Studio Vol. 1`,
      type: 'behind_the_scenes',
    },
    {
      copy: `Designing a 250×250 nonogram is harder than solving one.\n\nThe image needs enough contrast to survive dithering. The grid must have exactly one logical solution — no guessing allowed. And the solved result needs to actually look good.\n\nOur Behemoth Series went through dozens of iterations per puzzle. Some images that looked amazing in color were useless as nonograms.\n\nThe 15 that made it into Vol. 1 are the survivors. They earned their place.\n\nGrand Grid Studio`,
      type: 'behind_the_scenes',
    },
    {
      copy: `What makes our printing guide different:\n\nMost nonogram books don't need one. At 15×15, any printer works.\n\nAt 250×250, you need to know:\n• Which paper sizes work (and which definitely don't)\n• Print settings for crisp cell boundaries\n• How to tile across multiple pages if needed\n• Paper weight recommendations for heavy erasing\n\nOur free Printing Guide comes with every purchase. Because the puzzle doesn't start at the grid — it starts at the printer.\n\nGrand Grid Studio Vol. 1`,
      type: 'behind_the_scenes',
    },
  ];
}

// --- Platform-specific hashtags ---
const HASHTAGS = {
  pinterest: ['nonogram', 'picross', 'logicpuzzle', 'puzzleart', 'pixelart', 'printablepuzzle', 'brainteaser', 'grandgridstudio'],
  reddit: ['nonogram', 'picross', 'puzzles', 'logicpuzzles'],
};

async function main() {
  const puzzles = await getPuzzles();
  console.log(`Loaded ${puzzles.length} puzzles from DB`);

  const allPosts = [];

  // 1. Puzzle spotlights (45 posts — alternate between pinterest and reddit)
  const platforms = ['pinterest', 'reddit'];
  const redditSubs = ['r/nonograms', 'r/puzzles', 'r/picross'];
  let redditSubIdx = 0;

  for (let i = 0; i < puzzles.length; i++) {
    const puzzle = puzzles[i];
    const platform = platforms[i % 2];
    const copy = puzzleSpotlight(puzzle);

    allPosts.push({
      puzzle_id: puzzle.id,
      platform,
      content_type: platform === 'pinterest' ? 'pin' : 'post',
      copy_text: copy,
      hashtags: HASHTAGS[platform],
      image_url: puzzle.solved_image_url,
      status: 'ready_to_post',
    });
  }

  // 2. Series showcases (9 posts)
  const showcases = seriesShowcases();
  for (let i = 0; i < showcases.length; i++) {
    const s = showcases[i];
    const platform = platforms[i % 2];
    // Find a representative puzzle for the image
    let repPuzzle;
    if (s.series === 'All') {
      repPuzzle = puzzles[0]; // use first puzzle as representative
    } else {
      repPuzzle = puzzles.find(p => p.book_title === `${s.series} Series`);
    }

    allPosts.push({
      puzzle_id: repPuzzle?.id || null,
      platform,
      content_type: platform === 'pinterest' ? 'pin' : 'post',
      copy_text: s.copy,
      hashtags: HASHTAGS[platform],
      image_url: repPuzzle?.solved_image_url || null,
      status: 'ready_to_post',
    });
  }

  // 3. Listing promotions (7 posts)
  const listings = listingPromotions();
  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    const platform = platforms[i % 2];

    allPosts.push({
      puzzle_id: null,
      platform,
      content_type: platform === 'pinterest' ? 'pin' : 'post',
      copy_text: l.copy,
      hashtags: HASHTAGS[platform],
      image_url: null, // will use cover images
      status: 'ready_to_post',
    });
  }

  // 4. Educational posts (10 posts)
  const edu = educationalPosts();
  for (let i = 0; i < edu.length; i++) {
    const e = edu[i];
    const platform = platforms[i % 2];

    allPosts.push({
      puzzle_id: null,
      platform,
      content_type: platform === 'pinterest' ? 'pin' : 'post',
      copy_text: e.copy,
      hashtags: [...HASHTAGS[platform], e.topic],
      image_url: null,
      status: 'ready_to_post',
    });
  }

  // 5. Behind the scenes (5 posts)
  const bts = behindTheScenes();
  for (let i = 0; i < bts.length; i++) {
    const b = bts[i];
    const platform = platforms[i % 2];

    allPosts.push({
      puzzle_id: null,
      platform,
      content_type: platform === 'pinterest' ? 'pin' : 'post',
      copy_text: b.copy,
      hashtags: [...HASHTAGS[platform], 'behind_the_scenes'],
      image_url: null,
      status: 'ready_to_post',
    });
  }

  console.log(`\nTotal posts to insert: ${allPosts.length}`);
  console.log(`  Puzzle spotlights: 45`);
  console.log(`  Series showcases: ${showcases.length}`);
  console.log(`  Listing promos: ${listings.length}`);
  console.log(`  Educational: ${edu.length}`);
  console.log(`  Behind the scenes: ${bts.length}`);

  // Clear existing posts
  await supabase.from('marketing_posts').delete().not('id', 'is', null);

  // Insert in batches of 20
  for (let i = 0; i < allPosts.length; i += 20) {
    const batch = allPosts.slice(i, i + 20);
    const { error } = await supabase.from('marketing_posts').insert(batch);
    if (error) {
      console.error(`Batch ${i}-${i+20} failed:`, error.message);
    } else {
      console.log(`  Inserted batch ${i + 1}-${Math.min(i + 20, allPosts.length)}`);
    }
  }

  console.log('\nDone! All posts seeded as ready_to_post.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
