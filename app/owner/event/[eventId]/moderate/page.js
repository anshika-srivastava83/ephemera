'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TinderCard from 'react-tinder-card';
import QRCode from 'qrcode.react';

const ICONS = {
  back: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  qr: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <line x1="14" y1="14" x2="14" y2="21" />
      <line x1="21" y1="14" x2="21" y2="21" />
      <line x1="14" y1="17.5" x2="21" y2="17.5" />
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
    </svg>
  ),
  gallery: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  style: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  finalize: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  wall: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
  trash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  trashDanger: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="9" y1="10" x2="15" y2="16" />
      <line x1="15" y1="10" x2="9" y2="16" />
    </svg>
  ),
};

export default function ModeratePage({ params }) {
  const { eventId } = params;
  const searchParams = useSearchParams();
  const queryPassword = searchParams.get('password') || '';
  const queryRole = searchParams.get('role') || '';
  const queryName = searchParams.get('name') || 'Event';

  const [password, setPassword] = useState(queryPassword);
  const [role] = useState(queryRole);
  const [pending, setPending] = useState([]);
  const [unlocked, setUnlocked] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [lastSubmissionId, setLastSubmissionId] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [status, setStatus] = useState('');
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (queryPassword) loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPending() {
    setStatus('Loading...');
    const res = await fetch(`/api/events/${eventId}/pending-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setPending(data.submissions || []);
    setUnlocked(true);
    setStatus('');
  }

  async function decide(direction, submissionId) {
    const endpoint = direction === 'left' ? 'approve' : 'reject';
    setLastAction(direction === 'left' ? 'approved' : 'rejected');
    setLastSubmissionId(submissionId);
    setCanUndo(true);

    await fetch(`/api/submissions/${submissionId}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });

    setPending((prev) => prev.filter((s) => s.id !== submissionId));
    setTimeout(() => setLastAction(null), 500);
  }

  async function undoLast() {
    if (!lastSubmissionId) return;
    await fetch(`/api/submissions/${lastSubmissionId}/pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    setCanUndo(false);
    loadPending();
  }

  async function closeQr() {
    await fetch(`/api/events/${eventId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    setStatus('QR closed. No more submissions will be accepted.');
  }

  async function disposePhotos() {
    if (!confirm('This will permanently delete all photos for this event. Continue?')) return;
    setStatus('Disposing photos...');
    const res = await fetch(`/api/events/${eventId}/dispose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setStatus('Photos disposed.');
  }

  async function deleteWallEvent() {
    if (!confirm('This will permanently delete this event and its wall. This cannot be undone. Continue?')) return;
    setStatus('Deleting wall...');
    const res = await fetch(`/api/events/${eventId}/delete-wall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
      return;
    }
    setStatus('Wall deleted. Redirecting...');
    window.location.href = '/owner/dashboard';
  }

  const submitUrl = typeof window !== 'undefined' ? `${window.location.origin}/event/${eventId}/submit` : '';
  const current = pending[0];

  return (
    <main className="owner-page">
      <div className="owner-card" style={{ maxWidth: 560 }}>
        {unlocked && (
          <div className="mod-topbar">
            <a href="/owner/dashboard" className="mod-icon-btn" title="Back to events">
              {ICONS.back}
            </a>
            <h1 className="owner-heading" style={{ fontSize: 20, margin: 0, flex: 1 }}>{queryName}</h1>
            <button className="mod-icon-btn" title="Show QR code" onClick={() => setShowQr((s) => !s)}>
              {ICONS.qr}
            </button>
            <a className="mod-icon-btn" title="Gallery" href={`/owner/event/${eventId}/gallery?password=${encodeURIComponent(password)}&role=${role}`}>
              {ICONS.gallery}
            </a>
            <a className="mod-icon-btn" title="Wall style" href={`/owner/event/${eventId}/select-style?password=${encodeURIComponent(password)}&role=${role}`}>
              {ICONS.style}
            </a>
            <a className="mod-icon-btn" title="Finalize" href={`/owner/event/${eventId}/finalize?password=${encodeURIComponent(password)}&role=${role}`}>
              {ICONS.finalize}
            </a>
            <a className="mod-icon-btn" title="View public wall" href={`/event/${eventId}/wall`} target="_blank" rel="noopener noreferrer">
              {ICONS.wall}
            </a>
            {role === 'owner' && (
              <button className="mod-icon-btn" title="Close QR (stop submissions)" onClick={closeQr}>
                {ICONS.close}
              </button>
            )}
            {role === 'owner' && (
              <button className="mod-icon-btn mod-icon-btn-danger" title="Dispose photos" onClick={disposePhotos}>
                {ICONS.trash}
              </button>
            )}
            {role === 'owner' && (
              <button className="mod-icon-btn mod-icon-btn-danger" title="Delete wall" onClick={deleteWallEvent}>
                {ICONS.trashDanger}
              </button>
            )}
          </div>
        )}

        {showQr && unlocked && (
          <div className="mod-qr-panel">
            <div style={{ background: '#fff', display: 'inline-block', padding: 12, borderRadius: 12 }}>
              <QRCode value={submitUrl} size={180} />
            </div>
            <p className="owner-empty-text" style={{ wordBreak: 'break-all', marginTop: 8 }}>{submitUrl}</p>
          </div>
        )}

        {!unlocked && <h1 className="owner-heading">Moderate</h1>}

        {!unlocked && (
          <div>
            <input
              type="password"
              className="owner-input owner-input-block"
              placeholder="Owner or collaborator password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && password && loadPending()}
            />
            <button className="owner-button" onClick={loadPending} disabled={!password}>
              Load submissions
            </button>
          </div>
        )}

        {unlocked && (
          <>
            {lastAction === 'approved' && <div style={{ fontSize: 40, color: 'limegreen', textAlign: 'center' }}>✓</div>}
            {lastAction === 'rejected' && <div style={{ fontSize: 40, color: 'crimson', textAlign: 'center' }}>✕</div>}

            <p className="owner-subheading" style={{ textAlign: 'center' }}>Pending</p>
            <div style={{ position: 'relative', height: 420, textAlign: 'center' }}>
              {!current && <p className="owner-empty-text">No pending submissions right now.</p>}
              {current && (
                <TinderCard
                  key={current.id}
                  onSwipe={(dir) => decide(dir, current.id)}
                  preventSwipe={['up', 'down']}
                  swipeRequirementType="position"
                  swipeThreshold={80}
                >
                  <div className="polaroid" style={{ position: 'relative', margin: '0 auto', width: 260 }}>
                    <img src={current.polaroid_url} alt={current.caption} draggable="false" />
                  </div>
                </TinderCard>
              )}
            </div>

            {current && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
                <button className="owner-button-secondary" onClick={() => decide('right', current.id)}>✕ Reject</button>
                <button className="owner-button" style={{ marginTop: 0 }} onClick={() => decide('left', current.id)}>✓ Approve</button>
              </div>
            )}

            {canUndo && (
              <div style={{ textAlign: 'center' }}>
                <button className="owner-button-secondary" onClick={undoLast} style={{ marginTop: 12 }}>Undo last swipe</button>
              </div>
            )}

            <p className="owner-empty-text" style={{ textAlign: 'center', marginTop: 24 }}>
              Swipe left to approve, right to reject — or use the buttons. Approved photos and caption edits live in the Gallery.
            </p>
          </>
        )}

        {status && <p className="owner-empty-text" style={{ marginTop: 12, textAlign: 'center' }}>{status}</p>}
      </div>
    </main>
  );
}