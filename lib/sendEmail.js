import nodemailer from 'nodemailer';
import { isBlobUrl } from './storage.js';

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Creates and returns an active Nodemailer transport based on environment variables.
 * Supports standard SMTP (Resend, Brevo, SendGrid, Amazon SES, Postmark) or Gmail App Password.
 */
let cachedTransporter;
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = buildTransporter();
  return cachedTransporter;
}

function buildTransporter() {
  // 1. Standard custom SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 587;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      pool: true,
      maxConnections: 3,
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
  if (process.env.GMAIL_USER) return `Mehfil <${process.env.GMAIL_USER}>`;
  return `Mehfil <no-reply@ephemera.app>`;
}

/**
 * Attachments are fetched by nodemailer straight from Vercel Blob, so we only
 * accept URLs from our own Blob store (never arbitrary hosts: avoids SSRF).
 */
function resolveRemoteUrl(url) {
  return isBlobUrl(url) ? url : null;
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
      `[Mehfil Email] SMTP not configured. Skipped sending guest email to ${to}. Set GMAIL_USER + GMAIL_APP_PASSWORD or SMTP_* in .env.local to enable live delivery.`
    );
    return { sent: false, skipped: true, reason: 'SMTP credentials not configured' };
  }

  const attachments = [];
  let polaroidSectionHtml = '';
  let wallSectionHtml = '';

  // 1. Attach and embed Polaroid keepsake
  const localPolaroid = resolveRemoteUrl(polaroidUrl);
  if (localPolaroid) {
    attachments.push({
      filename: 'your-polaroid.png',
      path: localPolaroid,
      cid: 'polaroidImage',
    });
    polaroidSectionHtml = `
      <div style="background-color: #FFFFFF; border: 1px solid #E8E2D3; border-radius: 12px; padding: 20px 16px; margin: 20px 0; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A6D3B; font-weight: 700; margin-bottom: 14px;">1. Your Polaroid</span>
        <img src="cid:polaroidImage" alt="Your Polaroid" style="max-width: 270px; width: 100%; height: auto; border-radius: 4px; box-shadow: 0 4px 16px rgba(0,0,0,0.14);" />
        <p style="font-size: 12px; color: #8C827A; margin: 12px 0 0 0;">Attached as <strong>your-polaroid.png</strong></p>
      </div>
    `;
  }

  // Also attach raw candid photograph if available
  const localPhoto = resolveRemoteUrl(photoUrl);
  if (localPhoto && localPhoto !== localPolaroid) {
    attachments.push({
      filename: 'original-candid-photo.jpg',
      path: localPhoto,
    });
  }

  // 2. Attach and embed the Whole Living Wall Tapestry
  const localWall = resolveRemoteUrl(wallImageUrl);
  if (localWall) {
    attachments.push({
      filename: 'celebration-wall.png',
      path: localWall,
      cid: 'livingWallImage',
    });
    wallSectionHtml = `
      <div style="background-color: #FFFFFF; border: 1px solid #E8E2D3; border-radius: 12px; padding: 20px 16px; margin: 20px 0; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A6D3B; font-weight: 700; margin-bottom: 14px;">2. The Whole Photo Wall</span>
        <img src="cid:livingWallImage" alt="The whole photo wall" style="max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 4px 18px rgba(0,0,0,0.16);" />
        <p style="font-size: 12px; color: #8C827A; margin: 12px 0 0 0;">Attached as <strong>celebration-wall.png</strong></p>
      </div>
    `;
  } else {
    wallSectionHtml = `
      <div style="background-color: #FFFFFF; border: 1px solid #E8E2D3; border-radius: 12px; padding: 18px 16px; margin: 20px 0; text-align: center;">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A6D3B; font-weight: 700; margin-bottom: 6px;">The Photo Wall</span>
        <p style="font-size: 13px; color: #6E6259; margin: 0 0 12px 0;">The wall is live right now as guests add photos. Once the host wraps up, we'll email you the final collage here!</p>
        ${wallLink ? `<a href="${wallLink}" style="display: inline-block; padding: 9px 18px; background-color: #EDE8DF; color: #261F18; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">Watch the Live Wall</a>` : ''}
      </div>
    `;
  }

  const subject = isEdit
    ? `Your updated Polaroid & Wall for ${eventName}`
    : `Your Polaroid & the Photo Wall for ${eventName}`;

  const info = await transporter.sendMail({
    from: getSender(),
    to,
    subject,
    attachments,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background-color: #FAF7F0; border: 1px solid #E8E2D3; border-radius: 16px; padding: 32px 24px; color: #261F18;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8A6D3B; font-weight: 700;">MEHFIL</span>
          <h1 style="font-size: 26px; font-weight: 600; margin: 8px 0 4px 0; color: #261F18;">${escapeHtml(eventName)}</h1>
          <p style="font-size: 14px; color: #6E6259; margin: 0;">${isEdit ? 'Your updated Polaroid and the wall are ready.' : 'Thank you for sharing your photo tonight!'}</p>
        </div>

        ${polaroidSectionHtml}
        ${wallSectionHtml}

        <div style="text-align: center; margin: 24px 0 16px 0;">
          <a href="${link}" style="display: inline-block; padding: 12px 22px; background-color: #8A6D3B; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 6px;">View & Edit My Polaroid</a>
          ${wallLink ? `<a href="${wallLink}" style="display: inline-block; padding: 12px 22px; background-color: #EDE8DF; color: #261F18; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 6px;">Watch the Live Wall</a>` : ''}
        </div>

        <div style="border-top: 1px solid #E8E2D3; padding-top: 16px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
          <p style="margin: 0 0 6px 0;">Both images are attached to this email. Save them to your phone.</p>
          <p style="margin: 0;">You can change your photo or caption anytime while the event is open.</p>
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
      `[Mehfil Email] SMTP not configured. Skipped sending finalized wall email to ${to}. Set GMAIL_USER or SMTP_* in .env.local.`
    );
    return { sent: false, skipped: true, reason: 'SMTP credentials not configured' };
  }

  const attachments = [];
  let artworkImageHtml = '';
  let polaroidHtml = '';

  // 1. Final Wall image attachment
  const localWall = resolveRemoteUrl(finalImageUrl);
  if (localWall) {
    attachments.push({
      filename: 'celebration-wall.png',
      path: localWall,
      cid: 'wallArtwork',
    });
    artworkImageHtml = `
      <div style="background-color: #FFFFFF; border: 1px solid #E8E2D3; border-radius: 12px; padding: 20px 16px; margin: 20px 0; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A6D3B; font-weight: 700; margin-bottom: 14px;">The Final Collage</span>
        <img src="cid:wallArtwork" alt="Final photo collage" style="max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.18);" />
        <p style="font-size: 12px; color: #8C827A; margin: 12px 0 0 0;">Attached as <strong>celebration-wall.png</strong></p>
      </div>
    `;
  }

  // 2. Guest Polaroid attachment
  const localPolaroid = resolveRemoteUrl(polaroidUrl);
  if (localPolaroid) {
    attachments.push({
      filename: 'your-polaroid.png',
      path: localPolaroid,
      cid: 'polaroidImage',
    });
    polaroidHtml = `
      <div style="background-color: #FFFFFF; border: 1px solid #E8E2D3; border-radius: 12px; padding: 20px 16px; margin: 20px 0; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8A6D3B; font-weight: 700; margin-bottom: 14px;">Your Polaroid</span>
        <img src="cid:polaroidImage" alt="Your Polaroid" style="max-width: 260px; width: 100%; height: auto; border-radius: 4px; box-shadow: 0 4px 14px rgba(0,0,0,0.14);" />
        <p style="font-size: 12px; color: #8C827A; margin: 12px 0 0 0;">Attached as <strong>your-polaroid.png</strong></p>
      </div>
    `;
  }

  // Raw photo if available
  const localPhoto = resolveRemoteUrl(photoUrl);
  if (localPhoto && localPhoto !== localPolaroid) {
    attachments.push({
      filename: 'original-candid-photo.jpg',
      path: localPhoto,
    });
  }

  const info = await transporter.sendMail({
    from: getSender(),
    to,
    subject: `The photo wall for ${eventName} is ready!`,
    attachments,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #FAF7F0; border: 1px solid #E8E2D3; border-radius: 16px; padding: 32px 24px; color: #261F18;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8A6D3B; font-weight: 700;">MEHFIL</span>
          <h1 style="font-size: 26px; font-weight: 600; margin: 8px 0 4px 0; color: #261F18;">The Photo Wall is Ready</h1>
          <p style="font-size: 14px; color: #6E6259; margin: 0;">The memories from <strong>${escapeHtml(eventName)}</strong> are now together in one final collage.</p>
        </div>

        ${artworkImageHtml}
        ${polaroidHtml}

        <div style="text-align: center; margin: 28px 0 20px 0;">
          <a href="${wallUrl}" style="display: inline-block; padding: 13px 26px; background-color: #8A6D3B; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">See the Final Wall Online</a>
        </div>

        <div style="border-top: 1px solid #E8E2D3; padding-top: 16px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
          <p style="margin: 0;">Both files are attached so you can save them. Thank you for being part of the celebration!</p>
        </div>
      </div>
    `,
  });

  return { sent: true, messageId: info.messageId };
}