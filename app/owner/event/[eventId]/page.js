'use client';

import { useEffect, useState } from 'react';
import TinderCard from 'react-tinder-card';
import { supabasePublic } from '../../../../../lib/supabaseClient';

export default function ModeratePage({ params }) {
  const { eventId } = params;
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState([]);
  const [lastAction, setLastAction] = useState(null); // 'approved' | 'rejected'
  const [lastSubmissionId, setLastSubmissionId] = useState(null);
  const [canUndo, setCanUndo] = useState(false);

  async function loadPending() {
    const { data } = await supabasePublic
      .from('submissions')
      .select('id, polaroid_url, caption, reuse_consent')
      .eq('event_id', eventId)
      .eq('status', 'pending');
    setPending(data || []);
  }

  useEffect(() => {
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleSwipe(direction, submissionId) {
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

  return (
    <main style={{ maxWidth: 400, margin: '40px auto', padding: 16, textAlign: 'center' }}>
      <h1>Moderate</h1>
      <input
        type="password"
        placeholder="Owner or collaborator password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {lastAction === 'approved' && <div style={{ fontSize: 40, color: 'limegreen' }}>✓</div>}
      {lastAction === 'rejected' && <div style={{ fontSize: 40, color: 'crimson' }}>✕</div>}

      <div style={{ position: 'relative', height: 420 }}>
        {pending.length === 0 && <p>No pending submissions right now.</p>}
        {pending.map((s) => (
          <TinderCard
            key={s.id}
            onSwipe={(dir) => handleSwipe(dir, s.id)}
            preventSwipe={['up', 'down']}
          >
            <div className="polaroid" style={{ position: 'relative', margin: '0 auto', width: 260 }}>
              <img src={s.polaroid_url} alt={s.caption} />
              <div className="caption">{s.caption}</div>
              {s.reuse_consent && (
                <div style={{ fontSize: 10, color: '#4caf50', marginTop: 4 }}>Reuse OK</div>
              )}
            </div>
          </TinderCard>
        ))}
      </div>

      {canUndo && <button onClick={undoLast}>Undo last swipe</button>}

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        Swipe left to approve, swipe right to reject.
      </p>
    </main>
  );
}