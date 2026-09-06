'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function GalleryPage({ params }) {
  const { eventId } = params;
  const searchParams = useSearchParams();
  const queryPassword = searchParams.get('password') || '';
  const queryRole = searchParams.get('role') || '';

  const [password, setPassword] = useState(queryPassword);
  const [submissions, setSubmissions] = useState([]);
  const [unlocked, setUnlocked] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (queryPassword) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setStatus('Loading...');
    const res = await fetch(`/api/events/${eventId}/all-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setSubmissions(data.submissions || []);
    setUnlocked(true);
    setStatus('');
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === submissions.length ? new Set() : new Set(submissions.map((s) => s.id))
    );
  }

  async function disposeOne(id) {
    if (!confirm('Permanently delete this photo?')) return;
    await fetch(`/api/submissions/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function disposeSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} selected photo(s)?`)) return;
    setStatus('Deleting...');
    for (const id of selected) {
      await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerPassword: password }),
      });
    }
    setSubmissions((prev) => prev.filter((s) => !selected.has(s.id)));
    setSelected(new Set());
    setStatus('');
  }

    async function editCaption(submission) {
    const newCaption = window.prompt(
      'Edit caption (leave blank to remove it):',
      submission.caption
    );
    if (newCaption === null) return;
    if (newCaption.length > 120) {
      alert('Caption is too long (max 120 characters).');
      return;
    }

    setStatus('Updating caption...');
    const { compositePolaroid } = await import('../../../../../lib/compositePolaroid');
    const polaroidBlob = await compositePolaroid(submission.photo_url, newCaption);
    const polaroidPath = `${eventId}/${Date.now()}-polaroid-edited.jpg`;
    const { supabasePublic } = await import('../../../../../lib/supabaseClient');
    const { error: uploadError } = await supabasePublic.storage
      .from('photos')
      .upload(polaroidPath, polaroidBlob);
    if (uploadError) {
      setStatus(`Upload failed: ${uploadError.message}`);
      return;
    }
    const { data: urlData } = supabasePublic.storage.from('photos').getPublicUrl(polaroidPath);

    const res = await fetch(`/api/submissions/${submission.id}/update-caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password, caption: newCaption, polaroidUrl: urlData.publicUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setStatus('Caption updated.');
    loadAll();
  }

  return (
    <main className="owner-page">
      <div className="owner-card" style={{ maxWidth: 900 }}>
        <div className="mod-topbar">
          <a href={`/owner/event/${eventId}/moderate?password=${encodeURIComponent(password)}&role=${queryRole}`} className="mod-icon-btn" title="Back to moderate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </a>
          <h1 className="owner-heading" style={{ fontSize: 20, margin: 0, flex: 1 }}>Gallery</h1>
        </div>

        {!unlocked && (
          <div>
            <input
              type="password"
              className="owner-input owner-input-block"
              placeholder="Owner password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && password && loadAll()}
            />
            <button className="owner-button" onClick={loadAll} disabled={!password}>
              Load gallery
            </button>
          </div>
        )}

        {unlocked && (
          <>
            <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="owner-empty-text" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={selected.size === submissions.length && submissions.length > 0}
                  onChange={toggleSelectAll}
                />
                Select all
              </label>
              <button className="owner-button-danger" onClick={disposeSelected} disabled={selected.size === 0}>
                Dispose selected ({selected.size})
              </button>
            </div>

            {submissions.length === 0 && <p className="owner-empty-text">No photos.</p>}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {submissions.map((s) => (
                <div key={s.id} style={{ border: '1px solid #e5ddf5', borderRadius: 12, padding: 12, background: '#f8f5fc' }}>
                  <label className="owner-empty-text" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                    />
                    {s.status}
                  </label>
                                    <img src={s.polaroid_url} alt={s.caption} style={{ width: '100%', borderRadius: 6 }} />
                  <p style={{ fontSize: 12, color: 'var(--owner-text)', margin: '8px 0' }}>{s.caption}</p>
                  <button
                    className="owner-button-secondary"
                    onClick={() => editCaption(s)}
                    style={{ width: '100%', padding: '6px 0', fontSize: 12, marginBottom: 8 }}
                  >
                    ✎ Edit caption
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <a href={s.photo_url} download style={{ fontSize: 12, color: 'var(--owner-accent-dark)' }}>
                      Download raw
                    </a>
                    <a href={s.polaroid_url} download style={{ fontSize: 12, color: 'var(--owner-accent-dark)' }}>
                      Download polaroid
                    </a>
                  </div>
                  <button className="owner-button-danger" onClick={() => disposeOne(s.id)} style={{ marginTop: 10, width: '100%' }}>
                    Dispose
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {status && <p className="owner-empty-text" style={{ marginTop: 12 }}>{status}</p>}
      </div>
    </main>
  );
}