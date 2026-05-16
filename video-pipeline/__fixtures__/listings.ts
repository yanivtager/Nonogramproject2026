/**
 * Test fixtures matching the seed in supabase/migrations/007_video_pipeline_seed.sql.
 * Used by the validation gate tests so we can run them without hitting Supabase.
 */

import type { Listing } from "../src/data/types.js";

export const cafeSerenade: Listing = {
  id: "cafe-serenade",
  name: "Cafe Serenade",
  etsy_url: "https://www.etsy.com/listing/4455156318/",
  etsy_listing_id: "4455156318",
  theme: "A 250x250 cafe scene positioned as a screen-free analog challenge.",
  grid_size: "250x250",
  cell_count: 62500,
  puzzle_count: 1,
  difficulty: "Master",
  cover_image_url: null,
  solved_artwork_url: null,
  recommended_templates: ["print-ritual", "scale-shock"],
};

export const dragonsWrath: Listing = {
  id: "dragons-wrath",
  name: "Dragon's Wrath",
  etsy_url: "https://www.etsy.com/listing/4455139351/",
  etsy_listing_id: "4455139351",
  theme: "A fantasy dragon reveal in a printable expert nonogram.",
  grid_size: "100x150",
  cell_count: 15000,
  puzzle_count: 1,
  difficulty: "Expert",
  cover_image_url: null,
  solved_artwork_url: "https://jmzkexgwcvodquczjqfk.supabase.co/storage/v1/object/public/video-assets/video-pipeline/solved-artwork/single_dragons_wrath_sol-3.png",
  recommended_templates: ["solve-reveal", "before-after", "print-ritual-real"],
};

export const frozenGaze: Listing = {
  id: "frozen-gaze",
  name: "Frozen Gaze",
  etsy_url: "https://www.etsy.com/listing/4455144471/",
  etsy_listing_id: "4455144471",
  theme: "A 200x200 wolf and winter wildlife reveal.",
  grid_size: "200x200",
  cell_count: 40000,
  puzzle_count: 1,
  difficulty: "Expert",
  cover_image_url: null,
  solved_artwork_url: null,
  recommended_templates: ["solve-reveal"],
};

export const ultimateBundle: Listing = {
  id: "ultimate-bundle",
  name: "Ultimate Bundle",
  etsy_url: "https://www.etsy.com/listing/4454210115/",
  etsy_listing_id: "4454210115",
  theme: "45 expert printable nonograms across fantasy, wildlife, and grandmaster scenes.",
  grid_size: "100x150, 200x200, 250x250",
  cell_count: 117500,
  puzzle_count: 45,
  difficulty: "Master",
  cover_image_url: null,
  solved_artwork_url: null,
  recommended_templates: ["scale-shock", "before-after"],
};

export const titanicSeries: Listing = {
  id: "titanic-series",
  name: "Titanic Series",
  etsy_url: "https://www.etsy.com/listing/4453773767/",
  etsy_listing_id: "4453773767",
  theme: "15 fantasy nonograms with dragons, magic, libraries, and hidden pixel art.",
  grid_size: "100x150",
  cell_count: 15000,
  puzzle_count: 15,
  difficulty: "Expert",
  cover_image_url: null,
  solved_artwork_url: null,
  recommended_templates: ["solve-reveal", "before-after"],
};

export const colossusSeries: Listing = {
  id: "colossus-series",
  name: "Colossus Series",
  etsy_url: "https://www.etsy.com/listing/4454075252/",
  etsy_listing_id: "4454075252",
  theme: "15 wildlife nonograms built for long, focused solving sessions.",
  grid_size: "200x200",
  cell_count: 40000,
  puzzle_count: 15,
  difficulty: "Expert",
  cover_image_url: null,
  solved_artwork_url: null,
  recommended_templates: ["scale-shock", "solve-reveal"],
};

export const behemothSeries: Listing = {
  id: "behemoth-series",
  name: "Behemoth Series",
  etsy_url: "https://www.etsy.com/listing/4454100576/",
  etsy_listing_id: "4454100576",
  theme: "15 grandmaster 250x250 nonograms with people, places, and scene reveals.",
  grid_size: "250x250",
  cell_count: 62500,
  puzzle_count: 15,
  difficulty: "Master",
  cover_image_url: null,
  solved_artwork_url: null,
  recommended_templates: ["scale-shock"],
};
