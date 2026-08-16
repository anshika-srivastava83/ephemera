// Draws a photo onto a vintage-style polaroid frame with a burned-in
// sepia caption, entirely in the browser (canvas), and returns it as an
// image blob ready to upload.
export function compositePolaroid(file, caption) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const width = 400;
      const photoSize = 340;
      const padding = 30;
      const captionHeight = 90;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = padding + photoSize + captionHeight;
      const ctx = canvas.getContext('2d');

      // Warm brown/tan vintage frame instead of plain white
      ctx.fillStyle = '#d9c2a3';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Slightly darker inner border around the photo for a worn-edge look
      ctx.fillStyle = '#c2a679';
      ctx.fillRect(padding - 4, padding - 4, photoSize + 8, photoSize + 8);

      // Crop the photo to a square and center it in the frame
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, padding, padding, photoSize, photoSize);

      // Burned-sepia caption: dark brown fill + a soft shadow for a
      // "burned into the paper" feel
      ctx.font = '28px "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(74, 47, 24, 0.5)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = '#4a2f18';
      wrapText(ctx, caption, canvas.width / 2, padding + photoSize + 45, width - 40, 32);

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
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l.trim(), x, startY + i * lineHeight));
}