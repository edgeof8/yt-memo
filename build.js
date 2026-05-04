const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

async function build() {
  const src = fs.readFileSync(path.join(__dirname, 'yt-memo.js'), 'utf8');

  const result = await minify(src, {
    compress: { passes: 2 },
    mangle: true,
  });

  if (!result.code) throw new Error('Minification produced no output');

  const bookmarklet = `javascript:${result.code}`;
  fs.writeFileSync(path.join(__dirname, 'yt-memo-bookmarklet.js'), bookmarklet, 'utf8');

  const bytes = Buffer.byteLength(bookmarklet, 'utf8');
  console.log(`✓  yt-memo-bookmarklet.js   ${(bytes / 1024).toFixed(1)} KB`);
  if (bytes > 4096) console.warn(`   ⚠  exceeds 4 KB target (${bytes} B)`);
}

build().catch(err => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
