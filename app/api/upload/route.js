import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit
const ALLOWED_MIME_PREFIX = 'image/';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = (formData.get('folder') || 'general').replace(/[^a-zA-Z0-9_-]/g, '');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No image file was provided' }, { status: 400 });
    }

    // Verify MIME type
    if (file.type && !file.type.startsWith(ALLOWED_MIME_PREFIX)) {
      return NextResponse.json(
        { error: `Invalid file type (${file.type}). Only photographic images are accepted.` },
        { status: 400 }
      );
    }

    // Verify file size limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Photo is too large. Maximum allowed size is 15MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    // Target upload directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', folder);
    await mkdir(uploadsDir, { recursive: true });

    const isPng = file.name && file.name.endsWith('.png');
    let outputBuffer;
    let extension = '.jpg';

    try {
      if (isPng) {
        // Preserve PNG for master tapestries
        outputBuffer = await sharp(inputBuffer)
          .rotate()
          .png({ quality: 95, compressionLevel: 8 })
          .toBuffer();
        extension = '.png';
      } else {
        // Optimize photographic uploads
        outputBuffer = await sharp(inputBuffer)
          .rotate() // auto-orient based on EXIF
          .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
        extension = '.jpg';
      }
    } catch (sharpError) {
      console.warn('Sharp optimization fallback:', sharpError.message);
      outputBuffer = inputBuffer;
      extension = path.extname(file.name || '.jpg') || '.jpg';
    }

    const cleanBase = path.basename(file.name || 'photo', path.extname(file.name || ''))
      .replace(/[^a-zA-Z0-9_-]/g, '') || 'snap';
    const filename = `${Date.now()}-${cleanBase}${extension}`;
    const filePath = path.join(uploadsDir, filename);

    await writeFile(filePath, outputBuffer);

    const publicUrl = `/uploads/${folder}/${filename}`;
    return NextResponse.json({
      url: publicUrl,
      filename,
      sizeBytes: outputBuffer.length,
      success: true,
    });
  } catch (error) {
    console.error('Server upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload processing failed' }, { status: 500 });
  }
}
