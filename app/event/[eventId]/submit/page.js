'use client';

import { useState, useEffect } from 'react';
import { supabasePublic } from '../../../../lib/supabaseClient';
import { compositePolaroid } from '../../../../lib/compositePolaroid';

const CAPTION_LIMIT = 120;

export default function SubmitPage({ params }) {
  const { eventId } = params;
  const [phone, setPhone] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [reuseConsent, setReuseConsent] = useState(false);
  const [existing, setExisting] = useState(null);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState('');
  const [wrapped, setWrapped] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);

  async function checkPhone() {
    setStatus('Checking...');
    const res = await fetch(
      `/api/submissions?eventId=${eventId}&phone=${encodeURIComponent(phone)}`
    );
    const data = await res.json();
    setExisting(data.existing);
    setChecked(true);
    setStatus('');
  }

  // Live preview: regenerates automatically whenever the photo or caption changes.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setPreviewBlob(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const blob = await compositePolaroid(file, caption);
      if (cancelled) return;
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, caption]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || !previewBlob) {
      setStatus('Please add a photo.');
      return;
    }
    setStatus('Uploading photo...');

    const path = `${eventId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabasePublic.storage
      .from('photos')
      .upload(path, file);
    if (uploadError) {
      setStatus(`Upload failed: ${uploadError.message}`);
      return;
    }
    const { data: publicUrlData } = supabasePublic.storage.from('photos').getPublicUrl(path);
    const photoUrl = publicUrlData.publicUrl;

    setStatus('Uploading polaroid...');
    const polaroidPath = `${eventId}/${Date.now()}-polaroid.jpg`;
    const { error: polaroidUploadError } = await supabasePublic.storage
      .from('photos')
      .upload(polaroidPath, previewBlob);
    if (polaroidUploadError) {
      setStatus(`Polaroid upload failed: ${polaroidUploadError.message}`);
      return;
    }
    const { data: polaroidUrlData } = supabasePublic.storage
      .from('photos')
      .getPublicUrl(polaroidPath);
    const polaroidUrl = polaroidUrlData.publicUrl;

    setStatus('Saving...');
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, phone, caption, photoUrl, polaroidUrl, reuseConsent }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === 'This event is no longer accepting photos') {
        setWrapped(true);
      } else {
        setStatus(`Error: ${data.error}`);
      }
      return;
    }
    setStatus('Submitted! Your photo will appear once approved.');
  }

  if (wrapped) {
    return (
      <main style={{ maxWidth: 420, margin: '80px auto', padding: 16, textAlign: 'center' }}>
        <h1>This event has wrapped</h1>
        <p>Submissions are closed. Thanks for being part of it!</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
      <h1>Add your photo to the wall</h1>

      {!checked && (
        <div>
          <label>Phone number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your number"
            onKeyDown={(e) => e.key === 'Enter' && phone && checkPhone()}
          />
          <button onClick={checkPhone} disabled={!phone}>
            Continue
          </button>
        </div>
      )}

      {checked && existing && (
        <div>
          <p>You've already submitted a photo for this event:</p>
          <img src={existing.polaroid_url} alt="Your current submission" style={{ width: 160 }} />
          <p>{existing.caption}</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <a href={existing.photo_url} download>Download raw photo</a>
            <a href={existing.polaroid_url} download>Download polaroid</a>
          </div>
          <button onClick={() => setExisting(null)}>Replace it</button>
          <button onClick={() => setChecked(false)}>Cancel</button>
        </div>
      )}

      {checked && !existing && (
        <form onSubmit={handleSubmit}>
          <label>Photo</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <label>Comment ({caption.length}/{CAPTION_LIMIT})</label>
          <textarea
            value={caption}
            maxLength={CAPTION_LIMIT}
            onChange={(e) => setCaption(e.target.value)}
          />

          {previewUrl && (
            <div style={{ margin: '16px 0' }}>
              <p>Your polaroid:</p>
              <div style={{ display: 'inline-block' }}>
                <img src={previewUrl} alt="Your polaroid preview" style={{ width: 220, display: 'block' }} />
              </div>
              <div style={{ marginTop: 8 }}>
                <a href={previewUrl} download="my-polaroid.jpg" style={{ fontSize: 13 }}>
                  Download this preview
                </a>
              </div>
            </div>
          )}

          <label>
            <input
              type="checkbox"
              checked={reuseConsent}
              onChange={(e) => setReuseConsent(e.target.checked)}
            />
            The organiser may download and reuse my photo
          </label>

          <button type="submit" disabled={!previewBlob}>
            Add to the wall
          </button>
        </form>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}