'use client';

import { useState } from 'react';
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
  const [previewUrl, setPreviewUrl] = useState(null); // object URL of the composited preview
  const [previewBlob, setPreviewBlob] = useState(null); // the actual blob to upload on confirm

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

    // Step 1: build the polaroid locally (no upload yet) and show it for confirmation.
  async function handlePreview(e) {
    e.preventDefault();
    if (!file) {
      setStatus('Please add a photo.');
      return;
    }
    setStatus('Building preview...');
    const polaroidBlob = await compositePolaroid(file, caption);
    setPreviewBlob(polaroidBlob);
    setPreviewUrl(URL.createObjectURL(polaroidBlob));
    setStatus('');
  }

  function backToEdit() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
  }

  // Step 2: only now do we actually upload and save.
  async function confirmSubmit() {
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
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your number" />
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

            {checked && !existing && !previewUrl && (
        <form onSubmit={handlePreview}>
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

          <label>
            <input
              type="checkbox"
              checked={reuseConsent}
              onChange={(e) => setReuseConsent(e.target.checked)}
            />
            The organiser may download and reuse my photo
          </label>

          <button type="submit">Preview my polaroid</button>
        </form>
      )}

      {checked && !existing && previewUrl && (
        <div>
          <p>Here's your polaroid:</p>
          <img src={previewUrl} alt="Your polaroid preview" style={{ width: 220 }} className="polaroid" />
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button onClick={backToEdit}>Go back and redo</button>
            <button onClick={confirmSubmit}>Looks good — add to the wall</button>
          </div>
        </div>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}