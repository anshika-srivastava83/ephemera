'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', ms = 4000) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      if (ms) setTimeout(() => dismiss(id), ms);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (m, ms) => push(m, 'success', ms),
      error: (m, ms) => push(m, 'error', ms ?? 6000),
      info: (m, ms) => push(m, 'info', ms),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className={`toast toast-${t.type}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="toast-close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // Outside a provider (e.g. guest pages) fall back to no-ops so callers never crash.
  return ctx || { success() {}, error() {}, info() {}, dismiss() {} };
}
