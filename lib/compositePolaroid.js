// Draws a photo onto a white polaroid frame (main branch style) with a
// burned/sepia caption, left-aligned, sitting in the bottom white strip.
// No tan mat border — just the white frame + photo + styled caption.
export function compositePolaroid(file, caption) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const width = 400;
      const photoSize = 340;
      const padding = 30;
      const captionHeight = 55;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = padding + photoSize + captionHeight;
      const ctx = canvas.getContext('2d');

      // White polaroid frame
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Crop the photo to a square and center it in the frame
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, padding, padding, photoSize, photoSize);

      // Burned/sepia caption, left-aligned — font is a placeholder for now,
      // to be swapped during the UI/UX pass before deployment.
      ctx.font = '26px "Comic Sans MS", cursive';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(74, 47, 24, 0.5)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = '#4a2f18';
      wrapText(ctx, caption, padding, padding + photoSize + 32, width - padding * 2, 28);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = reject;
    img.src = url;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
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
  lines = lines.slice(0, 2);
  lines.forEach((l, i) => ctx.fillText(l.trim(), x, y + i * lineHeight));
}