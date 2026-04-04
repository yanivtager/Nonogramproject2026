-- Seed FAQ knowledge base with initial entries
-- These power the auto-response system for customer messages

INSERT INTO faq_knowledge (question_pattern, question_examples, answer_template, category, priority) VALUES

-- Product format
('digital|pdf|download|file|format',
 ARRAY['What format are the puzzles in?', 'Is this a physical book?', 'How do I get the puzzles?'],
 'All our nonogram puzzles are delivered as digital PDF downloads. After purchase, you''ll receive instant access to download the file — no physical items are shipped. The PDFs are optimized for printing on standard paper sizes.',
 'product', 10),

-- Printing
('print|paper|size|a4|letter|printer',
 ARRAY['What paper size should I use?', 'Can I print these?', 'What printer settings?'],
 'Our puzzle PDFs are optimized for printing. Standard collections work great on A4 or US Letter paper in black and white. Our Colossus Series (200x200) puzzles are designed for A1/A2 large-format printing for the best experience. We recommend using a laser printer for the crispest lines.',
 'technical', 8),

-- Difficulty levels
('difficulty|easy|medium|hard|beginner|expert|level',
 ARRAY['How hard are these puzzles?', 'Are there easy ones?', 'What difficulty levels do you have?'],
 'We offer puzzles across multiple difficulty levels: Easy (5x5 to 10x10 grids, great for beginners), Medium (10x10 to 15x15), Hard (15x15 to 25x25), and our Expert/Colossus series (up to 200x200 grids requiring 10-25 hours each). Every puzzle is pure logic — no guessing required!',
 'product', 9),

-- How nonograms work
('how|what is|instructions|rules|play|solve',
 ARRAY['How do nonograms work?', 'What is a nonogram?', 'How do I solve these?'],
 'Nonograms (also called picross, griddlers, or hanjie) are logic puzzles where you fill in cells on a grid based on number clues along the rows and columns. The numbers tell you how many consecutive filled cells are in each line. When solved correctly, the filled cells reveal a hidden picture! No guessing is needed — every puzzle can be solved through pure logic.',
 'product', 7),

-- Colossus Series specific
('colossus|200x200|giant|mega|huge|large|big',
 ARRAY['Tell me about the Colossus Series', 'How big are the 200x200 puzzles?', 'What is the Colossus Series?'],
 'Our Colossus Series features massive 200x200 grid puzzles — that''s 40,000 cells of pure logical deduction! Each puzzle in the nature & wildlife themed collection takes 10-25 hours to complete and reveals stunning high-fidelity artwork. They feature our signature "Titan Noir" deep-blue aesthetic and are optimized for A1/A2 printing. Designed for elite solvers who want a true marathon challenge!',
 'product', 10),

-- Pricing
('price|cost|how much|expensive|cheap|discount|sale|coupon',
 ARRAY['How much do these cost?', 'Do you have sales?', 'Any discount codes?'],
 'Our puzzles are competitively priced as digital downloads on Etsy. Please check our shop at etsy.com/shop/GrandGridStudio for current pricing. We occasionally run promotions — follow our shop to get notified!',
 'pricing', 6),

-- Refunds
('refund|return|money back|cancel|unhappy|dissatisfied',
 ARRAY['Can I get a refund?', 'What is your return policy?', 'I want my money back'],
 'Since our products are digital downloads, refunds follow Etsy''s standard digital goods policy. If you experience any issues with your download or the files, please reach out and we''ll do our best to help resolve the problem!',
 'purchase_support', 8),

-- Order status / download issues
('order|download|access|received|where|didn''t get|can''t find|missing',
 ARRAY['Where is my download?', 'I can''t access my file', 'I didn''t receive anything'],
 'After purchasing, you can access your download through your Etsy account: go to your Etsy Purchases page, find the order, and click "Download Files." If you''re having trouble, try logging out and back into Etsy, or using a different browser. Digital downloads are available immediately after payment clears.',
 'purchase_support', 9),

-- Solutions included
('solution|answer|key|check|correct',
 ARRAY['Are solutions included?', 'How do I check my answer?', 'Is there an answer key?'],
 'Yes! All our puzzle books include complete solutions so you can verify your work. Solutions are included at the end of each PDF.',
 'product', 7),

-- Custom puzzles
('custom|personalized|special|request|commission|make me',
 ARRAY['Can you make a custom puzzle?', 'Do you do custom orders?', 'Can I request a specific image?'],
 'Thanks for your interest in custom puzzles! Let me check with Yaniv on custom requests and get back to you.',
 'escalation', 10),

-- Bulk / wholesale
('bulk|wholesale|classroom|teacher|school|group|multiple|many copies',
 ARRAY['Do you offer bulk pricing?', 'I need puzzles for my classroom', 'Wholesale pricing?'],
 'Thanks for your interest in bulk orders! Let me flag this for Yaniv who handles wholesale and bulk inquiries personally.',
 'escalation', 10),

-- Collaboration / partnership
('collab|partner|work together|feature|sponsor|affiliate',
 ARRAY['Want to collaborate?', 'Partnership opportunity', 'Affiliate program?'],
 'Thanks for reaching out about a potential collaboration! Let me pass this along to Yaniv who handles partnerships personally.',
 'escalation', 10),

-- Shipping (common misconception for digital products)
('ship|shipping|delivery|mail|post|arrive|when will',
 ARRAY['When will it arrive?', 'How long is shipping?', 'Do you ship internationally?'],
 'Great news — all our products are instant digital downloads! There''s no shipping or waiting. After purchase, you can immediately download the PDF from your Etsy purchases page. Works worldwide!',
 'product', 9),

-- File issues / technical problems
('corrupt|broken|open|error|problem|issue|blank|wrong',
 ARRAY['The file won''t open', 'The PDF is corrupted', 'Something is wrong with my download'],
 'Sorry to hear you''re having trouble! Here are some quick fixes: 1) Try downloading the file again from your Etsy purchases page. 2) Make sure you''re using a PDF reader like Adobe Acrobat. 3) Try opening it on a different device. If the issue persists, please describe the problem in detail and we''ll get it sorted out for you!',
 'purchase_support', 9),

-- Multiple puzzles in book
('how many|number of|count|puzzles included|what''s included',
 ARRAY['How many puzzles are included?', 'What''s in the book?', 'How many pages?'],
 'The number of puzzles varies by collection — please check the specific listing description for details. Each listing clearly states the puzzle count, grid sizes, and theme. Our Colossus Series features 15 puzzles per volume, while other collections may include 30-200+ puzzles.',
 'product', 6),

-- Color vs black and white
('color|colour|black and white|monochrome|b&w',
 ARRAY['Are these in color?', 'Is it black and white?', 'Color puzzles?'],
 'Our nonogram puzzles use a classic black-and-white grid format, which is the traditional nonogram style. The Colossus Series features our signature "Titan Noir" deep-blue aesthetic. All files print beautifully in black and white on any standard printer!',
 'product', 5),

-- Tablet / digital solving
('tablet|ipad|goodnotes|remarkable|digital|app|screen',
 ARRAY['Can I solve these on my iPad?', 'Do these work with GoodNotes?', 'Compatible with Remarkable?'],
 'Yes! While our PDFs are optimized for printing, they also work great on tablets. You can import them into apps like GoodNotes, Notability, or use them on a reMarkable tablet. For the Colossus Series (200x200), we recommend printing for the best experience due to the grid size.',
 'technical', 7),

-- Thank you / positive feedback
('thank|love|great|amazing|awesome|wonderful|excellent|best',
 ARRAY['Thank you!', 'These are great!', 'Love your puzzles!'],
 'Thank you so much! We love hearing that you''re enjoying the puzzles. If you have a moment, we''d really appreciate a review on Etsy — it helps other puzzle lovers find us! Happy solving!',
 'faq', 3),

-- Newsletter / updates
('newsletter|updates|new|upcoming|notify|follow|subscribe',
 ARRAY['How do I get updates?', 'Do you have a newsletter?', 'When are new puzzles coming?'],
 'The best way to stay updated is to favorite our Etsy shop at etsy.com/shop/GrandGridStudio — you''ll get notified when we release new collections! We also share previews and updates on our social media channels.',
 'faq', 4);
