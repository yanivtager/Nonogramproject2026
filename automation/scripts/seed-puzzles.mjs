// Seed all 45 individual puzzles into the puzzles table
// Usage: export $(grep -v '^#' .env | xargs) && node automation/scripts/seed-puzzles.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public/marketing-images`;

// All 45 puzzles with metadata from TOCs
const puzzles = [
  // === TITANIC SERIES (Expert, Fantasy/Magic/Mystery) ===
  { name: 'Celestial Dragon Rider', grid_size: '150x150', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 1 },
  { name: "Dragon's Wrath", grid_size: '100x150', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 2 },
  { name: 'Enchanted Library Glow', grid_size: '100x150', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 3 },
  { name: 'Ethereal Empress', grid_size: '100x150', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 4 },
  { name: 'Arcane Illumination', grid_size: '100x150', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 5 },
  { name: 'Arcane Library Encounter', grid_size: '150x100', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 6 },
  { name: 'Celestial Conjurers', grid_size: '150x100', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 7 },
  { name: 'Forged Alliance', grid_size: '150x100', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 8 },
  { name: 'Forged in Shadows', grid_size: '150x100', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 9 },
  { name: 'Galactic Odyssey', grid_size: '150x100', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 10 },
  { name: "Knight's Vigil", grid_size: '150x100', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 11 },
  { name: 'Monolith Awakening', grid_size: '100x150', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 12 },
  { name: 'Moonlit Enchantment', grid_size: '150x100', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 13 },
  { name: 'The Arcane Library', grid_size: '150x100', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 14 },
  { name: 'The Mystic Chamber', grid_size: '150x150', series: 'Titanic', difficulty: 'expert', theme: 'fantasy', order: 15 },

  // === COLOSSUS SERIES (Master, Nature & Wildlife) ===
  { name: 'Majestic Sentinel', grid_size: '120x200', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 1 },
  { name: "Ocean's Embrace", grid_size: '200x120', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 2 },
  { name: 'Pastoral Harmony', grid_size: '200x120', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 3 },
  { name: 'Petal Symphony', grid_size: '120x200', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 4 },
  { name: 'Savannah Majesty', grid_size: '120x200', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 5 },
  { name: 'Winter Guardians', grid_size: '200x200', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 6 },
  { name: 'Wolves of Winter', grid_size: '200x120', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 7 },
  { name: 'Majestic Peaks', grid_size: '120x200', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 8 },
  { name: 'Dreaming Puppy Bliss', grid_size: '120x200', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 9 },
  { name: "Eagle's Nest Symphony", grid_size: '200x120', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 10 },
  { name: 'Elephant Serenade', grid_size: '200x200', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 11 },
  { name: 'Frozen Gaze Majesty', grid_size: '200x200', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 12 },
  { name: 'Insect Reverie', grid_size: '200x200', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 13 },
  { name: "Jungle Sage's Gaze", grid_size: '200x120', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 14 },
  { name: 'Jungle Sentinel', grid_size: '200x200', series: 'Colossus', difficulty: 'colossus', theme: 'nature', order: 15 },

  // === BEHEMOTH SERIES (Grandmaster, People & Scenes) ===
  { name: 'Classroom Shadows', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 1 },
  { name: 'Ballroom Elegance', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 2 },
  { name: 'Builders of Tomorrow', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 3 },
  { name: 'Cafe Serenade', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 4 },
  { name: 'Charming Bistro Nights', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 5 },
  { name: 'City Code Symphony', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 6 },
  { name: 'Cityscape Symposium', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 7 },
  { name: 'Culinary Symphony', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 8 },
  { name: 'Elegance in Motion', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 9 },
  { name: 'Guardians of Valor', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 10 },
  { name: 'Moonlit Serenade', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 11 },
  { name: 'Soulful Serenade', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 12 },
  { name: 'Studio Symphony', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 13 },
  { name: 'The Healing Touch', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 14 },
  { name: 'The Perfect Kick', grid_size: '250x250', series: 'Behemoth', difficulty: 'colossus', theme: 'people_scenes', order: 15 },
];

// Map puzzle to its solution image filename
function getSolutionFilename(series, order, name) {
  const slug = name.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '_');
  const seriesLower = series.toLowerCase();
  const paddedOrder = String(order).padStart(2, '0');
  return `${seriesLower}_${paddedOrder}_${slug}.png`;
}

// Map puzzle to its cover image filename
function getCoverFilename(series) {
  return `${series.toLowerCase()}_cover-01.png`;
}

async function main() {
  // Check if puzzles table exists by trying a select
  const { data: existing, error: checkError } = await supabase.from('puzzles').select('id, name').limit(1);

  if (checkError) {
    console.error('puzzles table does not exist or is inaccessible:', checkError.message);
    console.log('\nYou need to run the SQL migrations first:');
    console.log('  1. Go to Supabase Dashboard → SQL Editor');
    console.log('  2. Run supabase/migrations/001_initial_schema.sql');
    console.log('  3. Then re-run this script');
    process.exit(1);
  }

  console.log(`Found ${existing?.length || 0} existing puzzles. Upserting all 45...`);

  // Delete old seed data (the 7 listing-level entries) if they exist
  const { error: deleteError } = await supabase
    .from('puzzles')
    .delete()
    .not('id', 'is', null); // delete all

  if (deleteError) {
    console.error('Failed to clear old data:', deleteError.message);
  }

  // Insert all 45 puzzles
  const rows = puzzles.map(p => {
    const solutionFile = getSolutionFilename(p.series, p.order, p.name);
    return {
      name: p.name,
      difficulty: p.difficulty,
      grid_size: p.grid_size,
      theme: p.theme,
      book_title: `${p.series} Series`,
      solved_image_url: `${STORAGE_BASE}/solutions/${solutionFile}`,
      teaser_image_url: `${STORAGE_BASE}/covers/${getCoverFilename(p.series)}`,
      marketed: false,
    };
  });

  const { data, error } = await supabase.from('puzzles').insert(rows).select('id, name');

  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }

  console.log(`\nInserted ${data.length} puzzles:`);
  for (const row of data) {
    console.log(`  ${row.name} (${row.id})`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
