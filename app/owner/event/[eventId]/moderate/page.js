'use client';

import { useState,useEffect } from 'react';
import TinderCard from 'react-tinder-card';
import { supabasePublic } from '../../../../lib/supabaseClient';
import { compositePolaroid } from '../../../../lib/compositePolaroid';

export default function ModeratePage({ params }) {
  const { eventId } = params;
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState([]);
  const [unlocked, setUnlocked] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [lastSubmissionId, setLastSubmissionId] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [status, setStatus] = useState('');
  const [editingCaption, setEditingCaption] = useState('');
  const [editStatus, setEditStatus] = useState('');

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

  async function saveCaption(submission) {
    setEditStatus('Saving...');
    try {
      const polaroidBlob = await compositePolaroid(submission.photo_url, editingCaption);
      const path = `${eventId}/${Date.now()}-polaroid-edit.jpg`;
      const { error: uploadError } = await supabasePublic.storage
        .from('photos')
        .upload(path, polaroidBlob);
      if (uploadError) {
        setEditStatus(`Upload failed: ${uploadError.message}`);
        return;
      }
      const { data: urlData } = supabasePublic.storage.from('photos').getPublicUrl(path);

      const res = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: editingCaption,
          polaroidUrl: urlData.publicUrl,
          ownerPassword: password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditStatus(`Error: ${data.error}`);
        return;
      }

      setPending((prev) =>
        prev.map((s) => (s.id === submission.id ? { ...s, ...data.submission } : s))
      );
      setEditStatus('Saved.');
    } catch (err) {
      setEditStatus(`Error: ${err.message}`);
    }
  }

  const current = pending[0];

  useEffect(() => {
    if (current) setEditingCaption(current.caption);
  }, [current?.id]);

  return (
    <main style={{ maxWidth: 400, margin: '40px auto', padding: 16, textAlign: 'center' }}>
      <h1>Moderate</h1>

      {!unlocked && (
        <div>
          <input
            type="password"
            placeholder="Owner or collaborator password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={loadPending} disabled={!password}>
            Load submissions
          </button>
        </div>
      )}

      {unlocked && (
        <>
          {lastAction === 'approved' && <div style={{ fontSize: 40, color: 'limegreen' }}>✓</div>}
          {lastAction === 'rejected' && <div style={{ fontSize: 40, color: 'crimson' }}>✕</div>}

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
                  <img src={current.polaroid_url} alt={current.caption} draggable="false" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <input
                      value={editingCaption}
                      onChange={(e) => setEditingCaption(e.target.value)}
                      maxLength={120}
                      style={{ flex: 1 }}
                    />
                    <button onClick={() => saveCaption(current)} style={{ fontSize: 12 }}>
                      Save
                    </button>
                    {current.reuse_consent && (
                      <a
                        href={current.polaroid_url}
                        download
                        title="Download (reuse authorized)"
                        style={{ fontSize: 18 }}
                      >
                        ⬇
                      </a>
                    )}
                  </div>
                  {editStatus && <p style={{ fontSize: 11, opacity: 0.7 }}>{editStatus}</p>}
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
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 16 }}>
            Swipe left to approve, right to reject — or use the buttons.
          </p>
        </>
      )}

      {status && <p>{status}</p>}
    </main>
  );
}