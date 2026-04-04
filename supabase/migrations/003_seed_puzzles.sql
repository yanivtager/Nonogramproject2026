-- Seed puzzles table with current GrandGridStudio Etsy catalog
-- Run in Supabase SQL Editor after 001 and 002

INSERT INTO puzzles (name, difficulty, grid_size, theme, book_title, etsy_listing_url, marketed) VALUES

('Expert Nonogram Puzzle Bundle – Titanic Fantasy Picross Art',
 'expert', 'mixed', 'fantasy',
 'Titanic Fantasy Bundle',
 'https://www.etsy.com/listing/4454075252/', TRUE),

('Cafe Serenade – Single Masterpiece Edition',
 'expert', '250x150', 'lifestyle',
 'Masterpiece Edition',
 NULL, TRUE),

('Snow Leopard Nonogram – Master Level',
 'expert', '200x200', 'wildlife',
 'Colossus Tier',
 NULL, TRUE),

('Dragon Nonogram Puzzle – Expert Grid',
 'expert', '100x150', 'fantasy',
 'Single Puzzle',
 NULL, TRUE),

('45 Mega Nonogram Puzzles – Grand Grid Studio Vol. 1',
 'expert', 'mixed', 'mixed',
 'Grand Grid Studio Vol. 1',
 NULL, TRUE),

('Behemoth Nonograms – 15 Giant People & Scenes',
 'expert', 'giant', 'people_scenes',
 'Behemoth Series',
 NULL, TRUE),

('Giant Nonogram Puzzle – 200x200 Nature Theme',
 'expert', '200x200', 'nature',
 'Colossus Tier',
 'https://www.etsy.com/listing/4454075252/', TRUE);
