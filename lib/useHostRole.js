'use client';

import { useEffect, useState } from 'react';

// Resolves the signed-in user's host role ('owner' | 'collaborator' | null).
// Takes an optional eventId so event-specific host/collaborator assignments are respected.
export function useHostRole(eventId) {
  const [state, setState] = useState({ role: null, loaded: false });

  useEffect(() => {
    let cancelled = false;
    const url = `/api/events?roleOnly=1${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ''}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => !cancelled && setState({ role: d.role || null, loaded: true }))
      .catch(() => !cancelled && setState({ role: null, loaded: true }));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return state;
}
