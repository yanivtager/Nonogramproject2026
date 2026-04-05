// Upload extracted puzzle images to Supabase Storage
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node upload-images.mjs

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = 'marketing-images';
const BASE_DIR = join(import.meta.dirname, '..', '..', 'extracted_images');

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    console.log(`Created bucket: ${BUCKET}`);
  } else {
    console.log(`Bucket ${BUCKET} already exists`);
  }
}

async function uploadFolder(folder) {
  const dir = join(BASE_DIR, folder);
  const files = await readdir(dir);
  const pngs = files.filter(f => f.endsWith('.png'));

  console.log(`\nUploading ${pngs.length} files from ${folder}/`);
  const urls = [];

  for (const file of pngs) {
    const filePath = join(dir, file);
    const buffer = await readFile(filePath);
    const storagePath = `${folder}/${file}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.error(`  FAIL: ${file} - ${error.message}`);
    } else {
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);
      urls.push({ file, url: urlData.publicUrl });
      console.log(`  OK: ${file}`);
    }
  }
  return urls;
}

async function main() {
  await ensureBucket();
  const coverUrls = await uploadFolder('covers');
  const solutionUrls = await uploadFolder('solutions');

  console.log(`\n=== SUMMARY ===`);
  console.log(`Covers uploaded: ${coverUrls.length}`);
  console.log(`Solutions uploaded: ${solutionUrls.length}`);
  console.log(`Total: ${coverUrls.length + solutionUrls.length}`);

  // Write URL manifest for later use
  const manifest = { covers: coverUrls, solutions: solutionUrls };
  const { writeFile } = await import('fs/promises');
  await writeFile(
    join(BASE_DIR, 'image_manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\nManifest saved to extracted_images/image_manifest.json`);
}

main().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
