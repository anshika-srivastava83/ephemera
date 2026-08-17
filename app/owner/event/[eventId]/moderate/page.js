'use client';

import { useState } from 'react';
import TinderCard from 'react-tinder-card';
import { compositePolaroid } from '../../../../../lib/compositePolaroid';

export default function ModeratePage({ params }) {
  const { eventId } = params;
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [unlocked, setUnlocked] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [lastSubmissionId, setLastSubmissionId] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [status, setStatus] = useState('');

  async function loadAll() {
    setStatus('Loading...');
    const [pendingRes, approvedRes] = await Promise.all([
      fetch(`/api/events/${eventId}/pending-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerPassword: password }),
      }),
      fetch(`/api/events/${eventId}/approved-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerPassword: password }),
      }),
    ]);
    const pendingData = await pendingRes.json();
    const approvedData = await approvedRes.json();
    if (!pendingRes.ok) {
      setStatus(`Error: ${pendingData.error}`);
      return;
    }
    setPending(pendingData.submissions || []);
    setApproved(approvedData.submissions || []);
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
    if (direction === 'left') loadAll(); // refresh approved list too
  }

  async function undoLast() {
    if (!lastSubmissionId) return;
    await fetch(`/api/submissions/${lastSubmissionId}/pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: password }),
    });
    setCanUndo(false);
    loadAll();
  }

  async function editCaption(submission, isPendingList) {
    const newCaption = window.prompt(
      'Edit caption (leave blank to remove it):',
      submission.caption
    );
    if (newCaption === null) return; // cancelled
    if (newCaption.length > 120) {
      alert('Caption is too long (max 120 characters).');
      return;
    }

    setStatus('Updating caption...');
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

  const current = pending[0];

  return (
    <main style={{ maxWidth: 500, margin: '40px auto', padding: 16, textAlign: 'center' }}>
      <h1>Moderate</h1>

      {!unlocked && (
        <div>
          <input
            type="password"
            placeholder="Owner or collaborator password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={loadAll} disabled={!password}>
            Load submissions
          </button>
        </div>
      )}

      {unlocked && (
        <>
          {lastAction === 'approved' && <div style={{ fontSize: 40, color: 'limegreen' }}>✓</div>}
          {lastAction === 'rejected' && <div style={{ fontSize: 40, color: 'crimson' }}>✕</div>}

          <h2 style={{ fontSize: 16, marginTop: 24 }}>Pending</h2>
          <div style={{ position: 'relative', height: 420 }}>
            {!current && <p>No pending submissions right now.</p>}
            {current && (
              <TinderCard
                key={current.id}
                onSwipe={(dir) => decide(dir, current.id)}
                preventSwipe={['up', 'down']}
                swipeRequirementType="position"
                swipeThreshold={80}
              >
                <div className="polaroid" style={{ position: 'relative', margin: '0 auto', width: 260 }}>
                  <button
                    onClick={() => editCaption(current, true)}
                    style={{ position: 'absolute', top: 6, left: 6, fontSize: 12, zIndex: 2 }}
                  >
                    ✎ Edit
                  </button>
                  <img src={current.polaroid_url} alt={current.caption} draggable="false" />
                  {current.reuse_consent && (
                    <a
                      href={current.polaroid_url}
                      download
                      title="Download (reuse authorized)"
                      style={{ fontSize: 18, position: 'absolute', top: 6, right: 6 }}
                    >
                      ⬇
                    </a>
                  )}
                </div>
              </TinderCard>
            )}
          </div>

          {current && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
              <button onClick={() => decide('right', current.id)}>✕ Reject</button>
              <button onClick={() => decide('left', current.id)}>✓ Approve</button>
            </div>
          )}

          {canUndo && <button onClick={undoLast} style={{ marginTop: 12 }}>Undo last swipe</button>}

          <h2 style={{ fontSize: 16, marginTop: 40 }}>Already approved ({approved.length})</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginTop: 12 }}>
            {approved.map((s) => (
              <div key={s.id} className="polaroid" style={{ position: 'relative', width: 160 }}>
                <button
                  onClick={() => editCaption(s, false)}
                  style={{ position: 'absolute', top: 4, left: 4, fontSize: 10, zIndex: 2 }}
                >
                  ✎ Edit
                </button>
                <img src={s.polaroid_url} alt={s.caption} />
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 24 }}>
            Swipe left to approve, right to reject — or use the buttons.
          </p>
        </>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}