import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

/**
 * Creates and returns an active Nodemailer transport based on environment variables.
 * Supports standard SMTP (Resend, Brevo, SendGrid, Amazon SES, Postmark) or Gmail App Password.
 */
function getTransporter() {
  // 1. Standard custom SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 587;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // 2. Gmail App Password configuration
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER.trim(),
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
      },
    });
  }

  return null;
}

function getSender() {
  if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
  if (process.env.GMAIL_USER) return `Ephemera <${process.env.GMAIL_USER}>`;
  return `Ephemera <no-reply@ephemera.app>`;
}

/**
 * Helper to resolve uploaded local paths
 */
function resolveLocalPath(urlPath) {
  if (!urlPath || typeof urlPath !== 'string' || !urlPath.startsWith('/uploads/')) {
    return null;
  }
  const fullPath = path.join(process.cwd(), 'public', urlPath.replace(/^\//, ''));
  return fs.existsSync(fullPath) ? fullPath : null;
}

/**
 * Helper to find existing wall master artwork in an event folder if not set on event record
 */
function findWallArtworkPath(eventId, givenUrl) {
  const fromUrl = resolveLocalPath(givenUrl);
  if (fromUrl) return fromUrl;

  if (eventId) {
    const folder = path.join(process.cwd(), 'public', 'uploads', eventId);
    if (fs.existsSync(folder)) {
      const files = fs.readdirSync(folder);
      const wallFile = files.find((f) => f.includes('master-artwork') || f.includes('wall'));
      if (wallFile) {
        return path.join(folder, wallFile);
      }
    }
  }
  return null;
}

/**
 * Sends a guest email containing BOTH:
 * 1. Their uploaded Polaroid / photo
 * 2. The whole living wall image
 */
export async function sendGuestLink({
  to,
  link,
  wallLink,
  eventName,
  eventId,
  polaroidUrl,
  photoUrl,
  wallImageUrl,
  isEdit = false,
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      `[Ephemera Email] SMTP not configured. Skipped sending guest email to ${to}. Set GMAIL_USER + GMAIL_APP_PASSWORD or SMTP_* in .env.local to enable live delivery.`
    );
    return { sent: false, skipped: true, reason: 'SMTP credentials not configured' };
  }

  const attachments = [];
  let polaroidSectionHtml = '';
  let wallSectionHtml = '';

  // 1. Attach and embed Polaroid keepsake
  const localPolaroid = resolveLocalPath(polaroidUrl);
  if (localPolaroid) {
    attachments.push({
      filename: 'your-polaroid.png',
      path: localPolaroid,
      cid: 'polaroidImage',
    });
    polaroidSectionHtml = `
      <div style="background-color: #FFFFFF; border: 1px solid #E8E2D3; border-radius: 12px; padding: 20px 16px; margin: 20px 0; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A6D3B; font-weight: 700; margin-bottom: 14px;">1. Your Polaroid Keepsake</span>
        <img src="cid:polaroidImage" alt="Your Polaroid" style="max-width: 270px; width: 100%; height: auto; border-radius: 4px; box-shadow: 0 4px 16px rgba(0,0,0,0.14);" />
        <p style="font-size: 12px; color: #8C827A; margin: 12px 0 0 0;">Attached as <strong>your-polaroid.png</strong></p>
      </div>
    `;
  }

  // Also attach raw candid photograph if available
  const localPhoto = resolveLocalPath(photoUrl);
  if (localPhoto && localPhoto !== localPolaroid) {
    attachments.push({
      filename: 'original-candid-photo.jpg',
      path: localPhoto,
    });
  }

  // 2. Attach and embed the Whole Living Wall Tapestry
  const localWall = findWallArtworkPath(eventId, wallImageUrl);
  if (localWall) {
    attachments.push({
      filename: 'celebration-wall.png',
      path: localWall,
      cid: 'livingWallImage',
    });
    wallSectionHtml = `
      <div style="background-color: #FFFFFF; border: 1px solid #E8E2D3; border-radius: 12px; padding: 20px 16px; margin: 20px 0; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A6D3B; font-weight: 700; margin-bottom: 14px;">2. The Whole Celebration Wall Tapestry</span>
        <img src="cid:livingWallImage" alt="The Whole Living Wall" style="max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 4px 18px rgba(0,0,0,0.16);" />
        <p style="font-size: 12px; color: #8C827A; margin: 12px 0 0 0;">Attached as <strong>celebration-wall.png</strong></p>
      </div>
    `;
  } else {
    wallSectionHtml = `
      <div style="background-color: #FFFFFF; border: 1px solid #E8E2D3; border-radius: 12px; padding: 18px 16px; margin: 20px 0; text-align: center;">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A6D3B; font-weight: 700; margin-bottom: 6px;">The Whole Living Wall</span>
        <p style="font-size: 13px; color: #6E6259; margin: 0 0 12px 0;">The wall is live right now as guests add photos. Once the host wraps up, the finalized high-resolution wall tapestry will be emailed to you here!</p>
        ${wallLink ? `<a href="${wallLink}" style="display: inline-block; padding: 9px 18px; background-color: #EDE8DF; color: #261F18; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">Watch Live Wall Online</a>` : ''}
      </div>
    `;
  }

  const subject = isEdit
    ? `Your updated Polaroid & Wall for ${eventName}`
    : `Your Polaroid Keepsake & Wall for ${eventName}`;

  const info = await transporter.sendMail({
    from: getSender(),
    to,
    subject,
    attachments,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background-color: #FAF7F0; border: 1px solid #E8E2D3; border-radius: 16px; padding: 32px 24px; color: #261F18;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8A6D3B; font-weight: 700;">EPHEMERA GATHERING</span>
          <h1 style="font-size: 26px; font-weight: 600; margin: 8px 0 4px 0; color: #261F18;">${eventName}</h1>
          <p style="font-size: 14px; color: #6E6259; margin: 0;">${isEdit ? 'Your updated keepsake and wall are ready.' : 'Thank you for adding your candid moment to tonight’s living wall!'}</p>
        </div>

        ${polaroidSectionHtml}
        ${wallSectionHtml}

        <div style="text-align: center; margin: 24px 0 16px 0;">
          <a href="${link}" style="display: inline-block; padding: 12px 22px; background-color: #8A6D3B; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 6px;">View & Edit My Polaroid</a>
          ${wallLink ? `<a href="${wallLink}" style="display: inline-block; padding: 12px 22px; background-color: #EDE8DF; color: #261F18; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 6px;">Watch the Live Wall</a>` : ''}
        </div>

        <div style="border-top: 1px solid #E8E2D3; padding-top: 16px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
          <p style="margin: 0 0 6px 0;">Both image files are attached to this email so you can download and save them to your library.</p>
          <p style="margin: 0;">You can edit your photograph or handwritten note anytime while the event remains open.</p>
        </div>
      </div>
    `,
  });

  return { sent: true, messageId: info.messageId };
}

/**
 * Sends an email to all guests when the host finalizes the collective wall artwork.
 * Includes BOTH the final wall and their personal polaroid keepsake.
 */
export async function sendWallFinalizedEmail({
  to,
  eventName,
  eventId,
  wallUrl,
  finalImageUrl,
  polaroidUrl,
  photoUrl,
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      `[Ephemera Email] SMTP not configured. Skipped sending finalized wall email to ${to}. Set GMAIL_USER or SMTP_* in .env.local.`
    );
    return { sent: false, skipped: true, reason: 'SMTP credentials not configured' };
  }

  const attachments = [];
  let artworkImageHtml = '';
  let polaroidHtml = '';

  // 1. Final Wall image attachment
  const localWall = findWallArtworkPath(eventId, finalImageUrl);
  if (localWall) {
    attachments.push({
      filename: 'celebration-wall.png',
      path: localWall,
      cid: 'wallArtwork',
    });
    artworkImageHtml = `
      <div style="background-color: #FFFFFF; border: 1px solid #E8E2D3; border-radius: 12px; padding: 20px 16px; margin: 20px 0; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A6D3B; font-weight: 700; margin-bottom: 14px;">The Final Celebration Wall</span>
        <img src="cid:wallArtwork" alt="Celebration Wall Tapestry" style="max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.18);" />
        <p style="font-size: 12px; color: #8C827A; margin: 12px 0 0 0;">Attached as <strong>celebration-wall.png</strong></p>
      </div>
    `;
  }

  // 2. Guest Polaroid attachment
  const localPolaroid = resolveLocalPath(polaroidUrl);
  if (localPolaroid) {
    attachments.push({
      filename: 'your-polaroid.png',
      path: localPolaroid,
      cid: 'polaroidImage',
    });
    polaroidHtml = `
      <div style="background-color: #FFFFFF; border: 1px solid #E8E2D3; border-radius: 12px; padding: 20px 16px; margin: 20px 0; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A6D3B; font-weight: 700; margin-bottom: 14px;">Your Personal Keepsake</span>
        <img src="cid:polaroidImage" alt="Your Polaroid" style="max-width: 260px; width: 100%; height: auto; border-radius: 4px; box-shadow: 0 4px 14px rgba(0,0,0,0.14);" />
        <p style="font-size: 12px; color: #8C827A; margin: 12px 0 0 0;">Attached as <strong>your-polaroid.png</strong></p>
      </div>
    `;
  }

  // Raw photo if available
  const localPhoto = resolveLocalPath(photoUrl);
  if (localPhoto && localPhoto !== localPolaroid) {
    attachments.push({
      filename: 'original-candid-photo.jpg',
      path: localPhoto,
    });
  }

  const info = await transporter.sendMail({
    from: getSender(),
    to,
    subject: `The wall for ${eventName} is complete! (Wall & Polaroid attached)`,
    attachments,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #FAF7F0; border: 1px solid #E8E2D3; border-radius: 16px; padding: 32px 24px; color: #261F18;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8A6D3B; font-weight: 700;">EPHEMERA MEMORY</span>
          <h1 style="font-size: 26px; font-weight: 600; margin: 8px 0 4px 0; color: #261F18;">The Living Wall is Complete</h1>
          <p style="font-size: 14px; color: #6E6259; margin: 0;">The memories from <strong>${eventName}</strong> have been assembled into the master celebration tapestry.</p>
        </div>

        ${artworkImageHtml}
        ${polaroidHtml}

        <div style="text-align: center; margin: 28px 0 20px 0;">
          <a href="${wallUrl}" style="display: inline-block; padding: 13px 26px; background-color: #8A6D3B; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Explore the Finished Wall Online</a>
        </div>

        <div style="border-top: 1px solid #E8E2D3; padding-top: 16px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
          <p style="margin: 0;">Both files are attached to this email for you to save forever. Thank you for sharing your moments.</p>
        </div>
      </div>
    `,
  });

  return { sent: true, messageId: info.messageId };
}