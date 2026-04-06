import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>GrandGridStudio</title>
<style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}h1{color:#222}a{color:#0066cc}</style>
</head>
<body>
<h1>GrandGridStudio</h1>
<p>Premium nonogram puzzle books — from beginner-friendly to extreme challenge.</p>
<p>Visit our shop: <a href="https://www.etsy.com/shop/GrandGridStudio">GrandGridStudio on Etsy</a></p>
<p><a href="?page=privacy">Privacy Policy</a></p>
</body></html>`;

const PRIVACY_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>GrandGridStudio - Privacy Policy</title>
<style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}h1{color:#222}</style>
</head>
<body>
<h1>GrandGridStudio Privacy Policy</h1>
<p><strong>Last updated:</strong> April 2026</p>
<p>GrandGridStudio ("we") operates a Pinterest integration to share nonogram puzzle content. This policy explains what data we handle.</p>
<h2>Data We Collect</h2>
<p>We access only our own Pinterest Business account data through the Pinterest API. We do not collect, store, or process any personal data from Pinterest users.</p>
<h2>How We Use Pinterest API</h2>
<ul>
<li>Creating pins with puzzle images on our own boards</li>
<li>Reading our own board and pin data</li>
</ul>
<h2>Data Storage</h2>
<p>API tokens are stored securely on our private server and are never shared with third parties.</p>
<h2>Third Parties</h2>
<p>We do not sell, share, or distribute any data to third parties.</p>
<h2>Contact</h2>
<p>For questions, contact us through our Etsy shop: <a href="https://www.etsy.com/shop/GrandGridStudio">GrandGridStudio on Etsy</a></p>
</body></html>`;

serve((req: Request) => {
  const url = new URL(req.url);
  const page = url.searchParams.get("page");

  const html = page === "privacy" ? PRIVACY_HTML : LANDING_HTML;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
