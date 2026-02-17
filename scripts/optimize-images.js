const imagemin = require('imagemin').default || require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg').default || require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant').default || require('imagemin-pngquant');

(async () => {
  try {
    const files = await imagemin(['frontend/img/*.{jpg,jpeg,png}'], {
      destination: 'frontend/img',
      plugins: [
        imageminMozjpeg({quality: 72}),
        imageminPngquant({quality: [0.6, 0.8]})
      ]
    });
    console.log(`Optimized ${files.length} files`);
  } catch (err) {
    console.error('Optimization failed:', err.message || err);
    process.exit(1);
  }
})();
