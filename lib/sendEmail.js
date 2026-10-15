import nodemailer from 'nodemailer';

export async function sendGuestLink({ to, link, eventName }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `Mehfil <${process.env.GMAIL_USER}>`,
    to,
    subject: `Your photo for ${eventName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #4a3520;">
        <h2>Thanks for adding your photo to ${eventName}!</h2>
        <p>Use this link to see if your photo was approved, view the wall, or download your polaroid:</p>
        <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#c8873a;color:#fff;border-radius:10px;text-decoration:none;">View my photo</a></p>
        <p style="font-size:13px;color:#8a7a60;">Keep this email. Anyone with this link can see your submission.</p>
      </div>
    `,
  });
}