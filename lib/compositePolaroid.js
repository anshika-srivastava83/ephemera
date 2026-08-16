// Draws a photo onto a white polaroid frame with the caption baked in,
// entirely in the browser (canvas), and returns it as an image blob
// ready to upload.
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

      // White polaroid background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Crop the photo to a square and center it in the frame
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, padding, padding, photoSize, photoSize);

      // Caption, handwritten-style, wrapped to fit
      ctx.fillStyle = '#222222';
      ctx.font = '28px "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      wrapText(ctx, caption, canvas.width / 2, padding + photoSize + 45, width - 40, 32);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        },
        'image/jpeg',
        0.9
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
  lines = lines.slice(0, 2); // keep captions to 2 lines so they always fit
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l.trim(), x, startY + i * lineHeight));
}