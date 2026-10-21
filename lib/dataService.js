import { query } from './db.js';
import { removeUploadedFiles, removeEventFolderIfEmpty } from './storage.js';
import { hashEmail } from './hashPhone.js';
import crypto from 'crypto';

export async function getEvents(role) {
  const eventsResult = await query(
    'SELECT id, name, status, location, scheduled_at, max_submissions, chosen_layout_id, final_wall_image_url, created_at FROM events ORDER BY created_at DESC'
  );
  const events = eventsResult.rows;

  if (events.length === 0) {
    // Automatically seed an initial showcase event so the user sees something stunning
    await seedDemoEvent();
    const seeded = await query(
      'SELECT id, name, status, location, scheduled_at, max_submissions, chosen_layout_id, final_wall_image_url, created_at FROM events ORDER BY created_at DESC'
    );
    return enrichWithCounts(seeded.rows);
  }

  return enrichWithCounts(events);
}

async function enrichWithCounts(events) {
  if (events.length === 0) return [];
  const eventIds = events.map((e) => e.id);
  const countsResult = await query(
    'SELECT event_id, status, COUNT(*)::int as count FROM submissions WHERE event_id = ANY($1::uuid[]) GROUP BY event_id, status',
    [eventIds]
  );

  const countsMap = {};
  for (const row of countsResult.rows) {
    if (!countsMap[row.event_id]) countsMap[row.event_id] = { pending: 0, approved: 0, rejected: 0 };
    countsMap[row.event_id][row.status] = row.count;
  }

  return events.map((ev) => ({
    ...ev,
    pendingCount: countsMap[ev.id]?.pending || 0,
    approvedCount: countsMap[ev.id]?.approved || 0,
    rejectedCount: countsMap[ev.id]?.rejected || 0,
  }));
}

export async function getPublicLatestEvent() {
  const result = await query(
    "SELECT id, name, location, scheduled_at, status, chosen_layout_id, final_wall_image_url FROM events WHERE status = 'open' ORDER BY created_at DESC LIMIT 1"
  );
  if (result.rows.length === 0) {
    // Check if there are any events at all
    const any = await query('SELECT id, name, location, scheduled_at, status, chosen_layout_id, final_wall_image_url FROM events ORDER BY created_at DESC LIMIT 1');
    if (any.rows.length === 0) {
      await seedDemoEvent();
      const seeded = await query('SELECT id, name, location, scheduled_at, status, chosen_layout_id, final_wall_image_url FROM events ORDER BY created_at DESC LIMIT 1');
      return seeded.rows[0] || null;
    }
    return any.rows[0];
  }
  return result.rows[0];
}

export async function getEventById(id) {
  const res = await query('SELECT * FROM events WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function createEvent({ name, location, scheduledAt, maxSubmissions, ownerId, creatorEmail }) {
  const id = crypto.randomUUID();
  const owner = ownerId || crypto.randomUUID();
  const res = await query(
    `INSERT INTO events (id, name, location, scheduled_at, owner_id, max_submissions, status, owner_email)
     VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
     RETURNING *`,
    [id, name, location || null, scheduledAt || null, owner, maxSubmissions || 500, creatorEmail || null]
  );

  if (creatorEmail) {
    try {
      await query(
        `INSERT INTO event_collaborators (event_id, email, role, added_by)
         VALUES ($1, $2, 'host', 'creator')
         ON CONFLICT (event_id, email) DO NOTHING`,
        [id, creatorEmail.trim().toLowerCase()]
      );
    } catch (e) {
      console.warn('Could not record creator in event_collaborators:', e.message);
    }
  }

  return res.rows[0];
}

export async function closeEvent(id) {
  const res = await query("UPDATE events SET status = 'closed' WHERE id = $1 RETURNING *", [id]);
  return res.rows[0] || null;
}

export async function reopenEvent(id) {
  const res = await query("UPDATE events SET status = 'open' WHERE id = $1 RETURNING *", [id]);
  return res.rows[0] || null;
}

export async function setEventLayout(id, layoutId) {
  const res = await query('UPDATE events SET chosen_layout_id = $1 WHERE id = $2 RETURNING *', [layoutId, id]);
  return res.rows[0] || null;
}

export async function toggleEventLayout(id, styleId) {
  const eventRes = await query('SELECT chosen_layout_ids FROM events WHERE id = $1', [id]);
  if (eventRes.rows.length === 0) throw new Error('Event not found');
  const current = eventRes.rows[0].chosen_layout_ids || [];
  const updated = current.includes(styleId)
    ? current.filter((s) => s !== styleId)
    : [...current, styleId];
  await query('UPDATE events SET chosen_layout_ids = $1 WHERE id = $2', [updated, id]);
  return updated;
}

export async function finalizeEvent(id, finalWallImageUrl, chosenLayoutId) {
  const prev = await query('SELECT final_wall_image_url FROM events WHERE id = $1', [id]);
  const previousUrl = prev.rows[0]?.final_wall_image_url;
  const res = await query(
    'UPDATE events SET final_wall_image_url = $1, chosen_layout_id = COALESCE($2, chosen_layout_id) WHERE id = $3 RETURNING *',
    [finalWallImageUrl, chosenLayoutId, id]
  );
  // Re-finalising replaces the artwork: don't leave the superseded image on disk
  if (res.rows[0] && previousUrl && previousUrl !== finalWallImageUrl) {
    await removeUploadedFiles([previousUrl]);
  }
  return res.rows[0] || null;
}

async function purgeSubmissionFiles(rows, keepUrl) {
  const urls = rows.flatMap((r) => [r.photo_url, r.polaroid_url]).filter((u) => u && u !== keepUrl);
  return removeUploadedFiles(urls);
}

export async function disposeEventPhotos(id) {
  // Remove guest photographs (files first, then records), preserving only the final wall image
  const ev = await query('SELECT final_wall_image_url FROM events WHERE id = $1', [id]);
  const keepUrl = ev.rows[0]?.final_wall_image_url || null;
  const subs = await query('SELECT photo_url, polaroid_url FROM submissions WHERE event_id = $1', [id]);
  const files = await purgeSubmissionFiles(subs.rows, keepUrl);
  await query('DELETE FROM submissions WHERE event_id = $1', [id]);
  await removeEventFolderIfEmpty(id);
  return { success: true, submissions: subs.rows.length, files };
}

export async function deleteEvent(id) {
  const ev = await query('SELECT final_wall_image_url FROM events WHERE id = $1', [id]);
  const subs = await query('SELECT photo_url, polaroid_url FROM submissions WHERE event_id = $1', [id]);
  const files = await removeUploadedFiles([
    ...subs.rows.flatMap((r) => [r.photo_url, r.polaroid_url]),
    ev.rows[0]?.final_wall_image_url,
  ]);
  await query('DELETE FROM events WHERE id = $1', [id]);
  await removeEventFolderIfEmpty(id);
  return { success: true, files };
}

export async function getApprovedSubmissions(eventId) {
  const res = await query(
    "SELECT id, event_id, caption, photo_url, polaroid_url, status, created_at FROM submissions WHERE event_id = $1 AND status = 'approved' ORDER BY created_at ASC",
    [eventId]
  );
  return res.rows;
}

export async function getPendingSubmissions(eventId) {
  const res = await query(
    "SELECT id, event_id, caption, photo_url, polaroid_url, status, created_at FROM submissions WHERE event_id = $1 AND status = 'pending' ORDER BY created_at ASC",
    [eventId]
  );
  return res.rows;
}

export async function getAllSubmissions(eventId) {
  const res = await query(
    'SELECT id, event_id, caption, photo_url, polaroid_url, status, reuse_consent, created_at FROM submissions WHERE event_id = $1 ORDER BY created_at DESC',
    [eventId]
  );
  return res.rows;
}

export async function getSubmissionByPhone(eventId, phoneHash) {
  const res = await query(
    `SELECT s.id, s.event_id, s.caption, s.photo_url, s.polaroid_url, s.status, s.reuse_consent,
            sc.email as contact_email, sc.access_token
     FROM submissions s
     LEFT JOIN submission_contacts sc ON sc.submission_id = s.id
     WHERE s.event_id = $1 AND s.phone_hash = $2
     LIMIT 1`,
    [eventId, phoneHash]
  );
  const row = res.rows[0];
  if (!row) return { existing: null, hasEmail: false, email: null, accessToken: null };

  return {
    existing: {
      id: row.id,
      event_id: row.event_id,
      caption: row.caption,
      photo_url: row.photo_url,
      polaroid_url: row.polaroid_url,
      status: row.status,
      reuse_consent: row.reuse_consent,
    },
    hasEmail: !!row.access_token,
    email: row.contact_email || null,
    accessToken: row.access_token || null,
  };
}

export async function getSubmissionByEmail(eventId, email) {
  if (!email || !email.trim()) return { existing: null, hasEmail: false, email: null, accessToken: null };
  const normalized = email.trim().toLowerCase();
  const emailHash = hashEmail(normalized);

  // Single fast joined query matching on either hash or contact email
  const res = await query(
    `SELECT s.id, s.event_id, s.caption, s.photo_url, s.polaroid_url, s.status, s.reuse_consent,
            sc.email as contact_email, sc.access_token
     FROM submissions s
     LEFT JOIN submission_contacts sc ON sc.submission_id = s.id
     WHERE s.event_id = $1 AND (s.phone_hash = $2 OR LOWER(sc.email) = $3)
     LIMIT 1`,
    [eventId, emailHash, normalized]
  );

  const row = res.rows[0];
  if (!row) return { existing: null, hasEmail: false, email: normalized, accessToken: null };

  return {
    existing: {
      id: row.id,
      event_id: row.event_id,
      caption: row.caption,
      photo_url: row.photo_url,
      polaroid_url: row.polaroid_url,
      status: row.status,
      reuse_consent: row.reuse_consent,
    },
    hasEmail: !!row.access_token,
    email: row.contact_email || normalized,
    accessToken: row.access_token || null,
  };
}

export async function getSubmissionByToken(token) {
  const res = await query(
    `SELECT s.id, s.event_id, s.caption, s.photo_url, s.polaroid_url, s.status, s.created_at,
            sc.email as guest_email,
            e.name as event_name, e.status as event_status, e.location as event_location
     FROM submission_contacts sc
     JOIN submissions s ON s.id = sc.submission_id
     JOIN events e ON e.id = s.event_id
     WHERE sc.access_token = $1`,
    [token]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    ...row,
    email: row.guest_email,
    events: {
      name: row.event_name,
      status: row.event_status,
      location: row.event_location,
    },
  };
}

export async function getEventSubmissionEmails(eventId) {
  const res = await query(
    `SELECT DISTINCT sc.email, sc.access_token, s.caption, s.polaroid_url, s.photo_url
     FROM submission_contacts sc
     JOIN submissions s ON s.id = sc.submission_id
     WHERE s.event_id = $1 AND sc.email IS NOT NULL AND sc.email != ''`,
    [eventId]
  );
  return res.rows;
}

export async function createOrUpdateSubmission({
  eventId,
  phoneHash,
  caption,
  photoUrl,
  polaroidUrl,
  reuseConsent,
  email,
}) {
  // Check if event is open
  const event = await getEventById(eventId);
  if (!event) throw new Error('Event not found');
  if (event.status !== 'open') throw new Error('This event is no longer accepting photos');

  const normalizedEmail = email ? email.trim().toLowerCase() : null;

  // Check if existing submission exists by phoneHash (email hash or phone hash)
  let existing = await query(
    'SELECT id FROM submissions WHERE event_id = $1 AND phone_hash = $2',
    [eventId, phoneHash]
  );

  let submissionId = existing.rows[0]?.id;

  // Also check if an existing submission matches via submission_contacts email
  if (!submissionId && normalizedEmail) {
    const emailCheck = await query(
      `SELECT s.id FROM submission_contacts sc
       JOIN submissions s ON s.id = sc.submission_id
       WHERE s.event_id = $1 AND LOWER(sc.email) = $2 LIMIT 1`,
      [eventId, normalizedEmail]
    );
    if (emailCheck.rows.length > 0) {
      submissionId = emailCheck.rows[0].id;
    }
  }

  if (submissionId) {
    await query(
      `UPDATE submissions
       SET caption = $1, photo_url = $2, polaroid_url = $3, reuse_consent = $4, phone_hash = $5, status = 'pending', updated_at = NOW()
       WHERE id = $6`,
      [caption, photoUrl, polaroidUrl, !!reuseConsent, phoneHash, submissionId]
    );
  } else {
    // Check count against max_submissions
    const countRes = await query('SELECT COUNT(*)::int as count FROM submissions WHERE event_id = $1', [eventId]);
    if (countRes.rows[0].count >= (event.max_submissions || 500)) {
      throw new Error('This event has reached its submission limit');
    }

    submissionId = crypto.randomUUID();
    await query(
      `INSERT INTO submissions (id, event_id, phone_hash, caption, photo_url, polaroid_url, reuse_consent, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [submissionId, eventId, phoneHash, caption, photoUrl, polaroidUrl, !!reuseConsent]
    );
  }

  let token = null;
  if (normalizedEmail) {
    const contactCheck = await query(
      'SELECT access_token FROM submission_contacts WHERE submission_id = $1',
      [submissionId]
    );
    if (contactCheck.rows.length > 0) {
      token = contactCheck.rows[0].access_token;
      await query(
        `UPDATE submission_contacts SET email = $1 WHERE submission_id = $2`,
        [normalizedEmail, submissionId]
      );
    } else {
      token = crypto.randomUUID();
      await query(
        `INSERT INTO submission_contacts (submission_id, email, access_token)
         VALUES ($1, $2, $3)
         ON CONFLICT (submission_id) DO UPDATE SET email = EXCLUDED.email`,
        [submissionId, normalizedEmail, token]
      );
    }
  }

  const updated = await query('SELECT * FROM submissions WHERE id = $1', [submissionId]);
  return { submission: updated.rows[0], accessToken: token };
}

export async function updateSubmissionStatus(id, status) {
  const res = await query('UPDATE submissions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [
    status,
    id,
  ]);
  return res.rows[0] || null;
}

export async function updateSubmissionCaption(id, caption, polaroidUrl) {
  const res = await query(
    'UPDATE submissions SET caption = $1, polaroid_url = COALESCE($2, polaroid_url), updated_at = NOW() WHERE id = $3 RETURNING *',
    [caption, polaroidUrl, id]
  );
  return res.rows[0] || null;
}

export async function deleteSubmission(id) {
  const res = await query('SELECT photo_url, polaroid_url FROM submissions WHERE id = $1', [id]);
  const files = await purgeSubmissionFiles(res.rows, null);
  await query('DELETE FROM submissions WHERE id = $1', [id]);
  return { success: true, files };
}

// Believable seed data for first-time launch
export async function seedDemoEvent() {
  const eventId = 'e0000000-0000-4000-8000-000000000001';
  const check = await query('SELECT id FROM events WHERE id = $1', [eventId]);
  if (check.rows.length > 0) return;

  await query(
    `INSERT INTO events (id, name, location, scheduled_at, owner_id, max_submissions, status, chosen_layout_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'open', 'scatter-loose')`,
    [
      eventId,
      'Elena & Marcus — Villa Solaria',
      'Ravello, Amalfi Coast',
      new Date().toISOString(),
      crypto.randomUUID(),
      500,
    ]
  );

  const demoPhotos = [
    {
      caption: 'under the olive trees with everyone we love',
      photoUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
      status: 'approved',
    },
    {
      caption: 'the impromptu toast that made everyone cry',
      photoUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80',
      status: 'approved',
    },
    {
      caption: 'dancing till the candles burned all the way down',
      photoUrl: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&auto=format&fit=crop&q=80',
      status: 'approved',
    },
    {
      caption: 'found them laughing by the courtyard fountain',
      photoUrl: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&auto=format&fit=crop&q=80',
      status: 'approved',
    },
    {
      caption: 'three generations, one quiet smile',
      photoUrl: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&auto=format&fit=crop&q=80',
      status: 'approved',
    },
    {
      caption: 'stole away for five minutes to watch the sunset',
      photoUrl: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&auto=format&fit=crop&q=80',
      status: 'pending',
    },
    {
      caption: 'the late night cannoli run',
      photoUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80',
      status: 'pending',
    },
  ];

  for (let i = 0; i < demoPhotos.length; i++) {
    const p = demoPhotos[i];
    const subId = crypto.randomUUID();
    const phoneHash = crypto.createHash('sha256').update(`seed-guest-${i}`).digest('hex');

    await query(
      `INSERT INTO submissions (id, event_id, phone_hash, caption, photo_url, polaroid_url, status, reuse_consent)
       VALUES ($1, $2, $3, $4, $5, $5, $6, true)
       ON CONFLICT (event_id, phone_hash) DO NOTHING`,
      [subId, eventId, phoneHash, p.caption, p.photoUrl, p.status]
    );
  }
}

export async function getEventMembers(eventId) {
  const res = await query(
    `SELECT id, event_id, email, role, added_at, added_by
     FROM event_collaborators
     WHERE event_id = $1
     ORDER BY added_at ASC`,
    [eventId]
  );
  return res.rows;
}

export async function addEventMember({ eventId, email, role = 'collaborator', addedBy = null }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  const cleanRole = role === 'host' ? 'host' : 'collaborator';

  const res = await query(
    `INSERT INTO event_collaborators (event_id, email, role, added_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (event_id, email)
     DO UPDATE SET role = EXCLUDED.role, added_at = now(), added_by = EXCLUDED.added_by
     RETURNING *`,
    [eventId, cleanEmail, cleanRole, addedBy]
  );
  return res.rows[0];
}

export async function updateEventMemberRole({ eventId, memberId, role }) {
  const cleanRole = role === 'host' ? 'host' : 'collaborator';
  const res = await query(
    `UPDATE event_collaborators
     SET role = $1
     WHERE id = $2 AND event_id = $3
     RETURNING *`,
    [cleanRole, memberId, eventId]
  );
  if (res.rows.length === 0) throw new Error('Member not found.');
  return res.rows[0];
}

export async function removeEventMember({ eventId, memberId }) {
  const res = await query(
    `DELETE FROM event_collaborators
     WHERE id = $1 AND event_id = $2
     RETURNING *`,
    [memberId, eventId]
  );
  if (res.rows.length === 0) throw new Error('Member not found.');
  return res.rows[0];
}

export async function getEventMemberRole(eventId, emails = []) {
  if (!eventId || !emails || emails.length === 0) return null;
  const cleanEmails = emails.map((e) => (e || '').trim().toLowerCase()).filter(Boolean);
  if (cleanEmails.length === 0) return null;

  const res = await query(
    `SELECT role FROM event_collaborators
     WHERE event_id = $1 AND lower(email) = ANY($2::text[])`,
    [eventId, cleanEmails]
  );
  if (res.rows.length === 0) return null;
  const hasHost = res.rows.some((r) => r.role === 'host');
  if (hasHost) return 'owner';
  return 'collaborator';
}

export async function getHighestRoleAcrossEvents(emails = []) {
  if (!emails || emails.length === 0) return null;
  const cleanEmails = emails.map((e) => (e || '').trim().toLowerCase()).filter(Boolean);
  if (cleanEmails.length === 0) return null;

  const res = await query(
    `SELECT role FROM event_collaborators
     WHERE lower(email) = ANY($1::text[])`,
    [cleanEmails]
  );
  if (res.rows.length === 0) return null;
  const hasHost = res.rows.some((r) => r.role === 'host');
  if (hasHost) return 'owner';
  return 'collaborator';
}

export async function getEventIdBySubmissionId(submissionId) {
  if (!submissionId) return null;
  const res = await query('SELECT event_id FROM submissions WHERE id = $1', [submissionId]);
  return res.rows[0]?.event_id || null;
}
