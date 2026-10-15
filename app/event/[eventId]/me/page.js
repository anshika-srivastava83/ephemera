'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const STATUS_TEXT = {
  pending: 'Waiting for approval',
  approved: "Approved. You're on the wall!",
  rejected: 'Not selected this time',
};

export default function MyPhotoPage({ params }) {
  const { eventId } = params;
  const token = useSearchParams().get('token') || '';
  const [sub, setSub] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/submissions/by-token?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Something went wrong.');
      else setSub(data.submission);
      setLoading(false);
    }
    if (token) {
      load();
    } else {
      setError('This link is incomplete.');
      setLoading(false);
    }
  }, [token]);

  return (
    <main className="guest-page">
      <div className="guest-card" style={{ textAlign: 'center' }}>
        {loading && (
          <div className="mod-spinner-wrap">
            <div className="mod-spinner" />
          </div>
        )}

        {!loading && error && (
          <>
            <h1 style={{ marginTop: 0, fontSize: 22 }}>Link not found</h1>
            <p>{error}</p>
          </>
        )}

        {!loading && sub && (
          <>
            <h1 style={{ marginTop: 0, fontSize: 22 }}>{sub.events?.name || 'Your photo'}</h1>
            <p style={{ fontWeight: 600 }}>{STATUS_TEXT[sub.status] || sub.status}</p>
            <img
              src={sub.polaroid_url}
              alt="Your polaroid"
              style={{ width: '100%', maxWidth: 220, display: 'block', margin: '0 auto 12px' }}
            />
            {sub.caption && <p>{sub.caption}</p>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20, fontSize: 14 }}>
              <a href={sub.photo_url} download style={{ color: 'var(--guest-accent-dark)' }}>
                Download raw
              </a>
              <a href={sub.polaroid_url} download style={{ color: 'var(--guest-accent-dark)' }}>
                Download polaroid
              </a>
            </div>
            <a href={`/event/${eventId}/wall`} className="guest-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginBottom: 12 }}>
              View the wall
            </a>
            {sub.events?.status === 'open' && (
              <a href={`/event/${eventId}/submit`} className="guest-button-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                Replace my photo
              </a>
            )}
          </>
        )}
      </div>
    </main>
  );
}