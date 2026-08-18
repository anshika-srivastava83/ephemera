'use client';

import { useState } from 'react';

export default function GalleryPage({ params }) {
  const { eventId } = params;
  const [password, setPassword] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [unlocked, setUnlocked] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [status, setStatus] = useState('');

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

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
      <h1>Gallery</h1>

      {!unlocked && (
        <div>
          <input
            type="password"
            placeholder="Owner password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && password && loadAll()}
          />
          <button onClick={loadAll} disabled={!password}>
            Load gallery
          </button>
        </div>
      )}

      {unlocked && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <label>
              <input
                type="checkbox"
                checked={selected.size === submissions.length && submissions.length > 0}
                onChange={toggleSelectAll}
              />{' '}
              Select all
            </label>
            <button onClick={disposeSelected} disabled={selected.size === 0}>
              Dispose selected ({selected.size})
            </button>
          </div>

          {submissions.length === 0 && <p>No photos.</p>}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {submissions.map((s) => (
              <div key={s.id} style={{ border: '1px solid #444', padding: 8 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                  />{' '}
                  {s.status}
                </label>
                <img src={s.polaroid_url} alt={s.caption} style={{ width: '100%' }} />
                <p style={{ fontSize: 12 }}>{s.caption}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <a href={s.photo_url} download style={{ fontSize: 12 }}>
                    Download raw
                  </a>
                  <a href={s.polaroid_url} download style={{ fontSize: 12 }}>
                    Download polaroid
                  </a>
                </div>
                <button onClick={() => disposeOne(s.id)} style={{ marginTop: 8, width: '100%' }}>
                  Dispose
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}