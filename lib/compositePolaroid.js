/**
 * Composites a photo onto a museum-grade vintage Polaroid frame
 * with authentic paper tones, inner shadow, and handwritten cursive ink.
 */
const CAPTION_FONT_FACE = '"Reenie Beanie", "Segoe Script", cursive';

export function compositePolaroid(source, caption = '') {
  return new Promise((resolve, reject) => {
    if (!source) {
      return reject(new Error('No image source provided for Polaroid compositing'));
    }

    const img = new Image();
    const isFile =
      (typeof File !== 'undefined' && source instanceof File) ||
      (typeof Blob !== 'undefined' && source instanceof Blob);
    const url = isFile ? URL.createObjectURL(source) : source;

    // IMPORTANT: Never set crossOrigin on blob: or data: URLs, or relative same-origin paths.
    // Setting crossOrigin on blob: URLs causes an immediate load error or canvas taint.
    if (
      !isFile &&
      typeof source === 'string' &&
      !source.startsWith('data:') &&
      !source.startsWith('blob:') &&
      /^https?:\/\//i.test(source)
    ) {
      if (typeof window !== 'undefined' && !source.startsWith(window.location.origin)) {
        img.crossOrigin = 'anonymous';
      }
    }

    img.onload = async () => {
      // Make sure the handwritten font is downloaded before canvas draws text.
      // Cap font wait to 350ms so canvas rendering never stalls or freezes.
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        try {
          const fontPromise = Promise.all([
            document.fonts.load(`28px ${CAPTION_FONT_FACE}`),
            document.fonts.ready,
          ]);
          await Promise.race([
            fontPromise,
            new Promise((r) => setTimeout(r, 350)),
          ]);
        } catch {
          // Font API not available or load failed: fall through and draw anyway.
        }
      }

      // 2x Retina resolution for sharp display and print
      const scale = 2;
      const width = 440 * scale;
      const photoSize = 380 * scale;
      const sidePadding = 30 * scale;
      const topPadding = 32 * scale;
      const captionSection = 110 * scale;
      const totalHeight = topPadding + photoSize + captionSection;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      // 1. Warm archival paper base (soft ivory with slight warm tone)
      ctx.fillStyle = '#FAF7F0';
      ctx.fillRect(0, 0, width, totalHeight);

      // Subtle paper edge border
      ctx.strokeStyle = '#E8E2D3';
      ctx.lineWidth = 1 * scale;
      ctx.strokeRect(1, 1, width - 2, totalHeight - 2);

      // 2. Photo square with square crop
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;

      // Draw photo
      ctx.save();
      // Slight photo recess border
      ctx.fillStyle = '#1A1815';
      ctx.fillRect(sidePadding - 1, topPadding - 1, photoSize + 2, photoSize + 2);
      ctx.drawImage(img, sx, sy, side, side, sidePadding, topPadding, photoSize, photoSize);
      ctx.restore();

      // 3. Handwritten caption
      if (caption && caption.trim()) {
        ctx.font = `${32 * scale}px ${CAPTION_FONT_FACE}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#261F18'; // Deep warm charcoal-sepia ink
        ctx.shadowColor = 'rgba(74, 47, 24, 0.25)';
        ctx.shadowBlur = 1 * scale;
        ctx.shadowOffsetX = 0.5 * scale;
        ctx.shadowOffsetY = 0.5 * scale;

        const maxCaptionWidth = photoSize - 20 * scale;
        const centerX = width / 2;
        const startY = topPadding + photoSize + 48 * scale;
        wrapText(ctx, caption.trim(), centerX, startY, maxCaptionWidth, 34 * scale);
      }

      // 4. Subtle studio brand watermark in bottom-right corner
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.font = `${10 * scale}px "Cinzel", "Playfair Display", serif`;
      ctx.fillStyle = 'rgba(74, 47, 24, 0.22)';
      ctx.textAlign = 'right';
      ctx.fillText('महफ़िल', width - sidePadding, totalHeight - 10 * scale);
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          if (isFile) URL.revokeObjectURL(url);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob generated an empty result'));
          }
        },
        'image/jpeg',
        0.85 // ~200KB; keeps free-tier storage going further
      );
    };

    img.onerror = (err) => {
      if (isFile) URL.revokeObjectURL(url);
      reject(new Error('Could not load source photo for Polaroid compositing'));
    };
    img.src = url;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Maximum 2 lines for the Polaroid strip
  const displayLines = lines.slice(0, 2);
  displayLines.forEach((l, i) => {
    ctx.fillText(l.trim(), x, y + i * lineHeight);
  });
}