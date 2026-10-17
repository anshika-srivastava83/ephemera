'use client';

import { useEffect, useState } from 'react';

// Resolves the signed-in user's host role ('owner' | 'collaborator' | null).
// `loaded` flips true once the server has answered.
export function useHostRole() {
  const [state, setState] = useState({ role: null, loaded: false });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => !cancelled && setState({ role: d.role || null, loaded: true }))
      .catch(() => !cancelled && setState({ role: null, loaded: true }));
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
