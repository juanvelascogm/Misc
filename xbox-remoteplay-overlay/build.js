// Generates bookmarklet.txt and install.html from overlay.js. Run: node build.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'overlay.js'), 'utf8');
const body = src
  .replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n/, '')
  .split('\n').map((l) => l.replace(/^\s*\/\/ .*$/, '').trim()).filter(Boolean).join('\n');
const bookmarklet = 'javascript:' + encodeURIComponent(body);
fs.writeFileSync(path.join(dir, 'bookmarklet.txt'), bookmarklet);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
fs.writeFileSync(path.join(dir, 'install.html'), `<!doctype html><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>Xbox overlay bookmarklet</title>
<style>body{font:16px -apple-system,system-ui,sans-serif;margin:16px;max-width:560px}textarea{width:100%;height:120px;font:12px monospace}button{font-size:16px;padding:10px 16px}</style>
<h1>Xbox Remote Play overlay</h1>
<ol><li>Tap <b>Copy bookmarklet</b>.</li>
<li>In Safari, bookmark any page, then edit the bookmark: name it <i>Xbox Pad</i> and paste into the address field.</li>
<li>Open <a href="https://www.xbox.com/play">xbox.com/play</a> (or /remoteplay), start your console stream, then tap the bookmark from the address bar's Bookmarks (or Favorites).</li></ol>
<button id=c>Copy bookmarklet</button> <span id=m></span>
<textarea id=t readonly>${esc(bookmarklet)}</textarea>
<script>c.onclick=async()=>{t.select();try{await navigator.clipboard.writeText(t.value)}catch(e){document.execCommand('copy')}m.textContent='Copied'}</script>`);
console.log('bookmarklet bytes:', bookmarklet.length);
