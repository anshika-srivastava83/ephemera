'use client';

import { useState } from 'react';

export default function DownloadButton({
  href,
  filename,
  onSave,
  label = 'Save',
  savedLabel = 'Saved',
  variant = 'owner',
}) {
  const [status, setStatus] = useState('idle'); // idle | loading | saved

  async function handleClick(e) {
    e.preventDefault();
    if (status !== 'idle') return;
    setStatus('loading');
    try {
      if (onSave) {
        await onSave();
      } else if (href) {
        const res = await fetch(href);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || '';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      setStatus('saved');
    } catch (err) {
      setStatus('idle');
      return;
    }
    setTimeout(() => setStatus('idle'), 1600);
  }

  return (
    <button
      className={`download-btn download-btn-${variant}`}
      onClick={handleClick}
      disabled={status === 'loading'}
      type="button"
    >
      {status === 'idle' && <span>{label}</span>}
      {status === 'loading' && (
        <svg className="download-btn-spinner" viewBox="0 0 26 26" width="16" height="16">
          <circle cx="13" cy="13" r="10" strokeWidth="3" fill="none" className="download-btn-spinner-track" />
          <path d="M13 3 A10 10 0 0 1 23 13" strokeWidth="3" strokeLinecap="round" fill="none" className="download-btn-spinner-arc" />
        </svg>
      )}
      {status === 'saved' && (
        <span className="download-btn-saved">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {savedLabel}
        </span>
      )}
    </button>
  );
}