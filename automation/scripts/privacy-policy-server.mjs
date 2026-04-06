#!/usr/bin/env node
// Temporary HTTP server to serve a privacy policy page
// Pinterest requires a publicly accessible privacy policy URL when creating an app.
// Run this on your VM: node automation/scripts/privacy-policy-server.mjs
// It serves on port 8085, accessible at http://178.104.137.140:8085/privacy

import { createServer } from 'http';

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

const server = createServer((req, res) => {
  if (req.url === '/privacy' || req.url === '/privacy/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(PRIVACY_HTML);
  } else {
    res.writeHead(302, { 'Location': '/privacy' });
    res.end();
  }
});

server.listen(8085, '0.0.0.0', () => {
  console.log('Privacy policy server running at http://0.0.0.0:8085/privacy');
  console.log('Press Ctrl+C to stop.');
});
