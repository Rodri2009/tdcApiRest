const imagemin = require('imagemin').default || require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg').default || require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant').default || require('imagemin-pngquant');

(async () => {
  try {
    // Pass 1: lighter compression for all images
    const all = await imagemin(['frontend/img/*.{jpg,jpeg,png}'], {
      destination: 'frontend/img',
      plugins: [
        imageminMozjpeg({quality: 72}),
        imageminPngquant({quality: [0.6, 0.8]})
      ]
    });

    // Pass 2: target remaining files > 1MB and compress more aggressively
    const fs = require('fs');
    const path = require('path');
    const bigFiles = [];
    for (const f of fs.readdirSync('frontend/img')) {
      const p = path.join('frontend/img', f);
      try {
        const st = fs.statSync(p);
        if (st.isFile() && st.size > 1024 * 1024) bigFiles.push(p);
      } catch (e) { /* ignore */ }
    }

    let bigOptimized = [];
    if (bigFiles.length) {
      bigOptimized = await imagemin(bigFiles, {
        destination: 'frontend/img',
        plugins: [
          imageminMozjpeg({quality: 60}),
          imageminPngquant({quality: [0.5, 0.7]})
        ]
      });
    }

    console.log(`Optimized ${all.length + bigOptimized.length} files (${all.length} + ${bigOptimized.length} extra passes)`);
  } catch (err) {
    console.error('Optimization failed:', err.message || err);
    process.exit(1);
  }
})();
