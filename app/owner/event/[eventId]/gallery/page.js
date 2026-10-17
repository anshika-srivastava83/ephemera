'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Trash2,
  Edit3,
  Download,
  ImageDown,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { compositePolaroid } from '../../../../../lib/compositePolaroid';
import { useHostRole } from '../../../../../lib/useHostRole';
import { AccessDenied } from '../../../../../components/brand/AccessDenied';
import { PolaroidCard } from '../../../../../components/polaroid/PolaroidCard';
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog';
import { useToast } from '../../../../../components/ui/Toast';

const CAPTION_LIMIT = 120;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'On the wall' },
  { id: 'pending', label: 'Awaiting' },
  { id: 'rejected', label: 'Passed' },
];

const STATUS_STYLE = {
  approved: { dot: 'bg-emerald-500', text: 'text-emerald-800', label: 'On the wall' },
  pending: { dot: 'bg-amber-500', text: 'text-amber-800', label: 'Awaiting' },
  rejected: { dot: 'bg-danger', text: 'text-danger', label: 'Passed' },
};

export default function GalleryPage({ params }) {
  const { eventId } = params;
  const { role, loaded: roleLoaded } = useHostRole();
  const isOwner = role === 'owner';
  const toast = useToast();

  const [submissions, setSubmissions] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());

  // Delete confirmation: array of ids being confirmed
  const [deleteIds, setDeleteIds] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Caption modal state
  const [editingSub, setEditingSub] = useState(null);
  const [newCaption, setNewCaption] = useState('');
  const [isUpdatingCaption, setIsUpdatingCaption] = useState(false);
  const [captionError, setCaptionError] = useState('');


  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoadState('loading');
    try {
      const res = await fetch(`/api/events/${eventId}/all-submissions`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || 'Could not load photographs.');
        setLoadState('error');
        return;
      }
      setSubmissions(data.submissions || []);
      setLoadState('ready');
    } catch (err) {
      setLoadError('Could not reach the server. Check your connection and try again.');
      setLoadState('error');
    }
  }

  const counts = useMemo(() => {
    const c = { all: submissions.length, approved: 0, pending: 0, rejected: 0 };
    submissions.forEach((s) => {
      if (c[s.status] !== undefined) c[s.status] += 1;
    });
    return c;
  }, [submissions]);

  const visible = useMemo(
    () => (filter === 'all' ? submissions : submissions.filter((s) => s.status === filter)),
    [submissions, filter]
  );

  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.id));

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((s) => next.delete(s.id));
      else visible.forEach((s) => next.add(s.id));
      return next;
    });
  }

  // Deletes each photograph on the server and only drops the ones that really succeeded.
  async function confirmDelete() {
    const ids = deleteIds || [];
    setDeleting(true);
    const deleted = [];
    const failed = [];
    let filesFailed = 0;

    for (const id of ids) {
      try {
        const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          deleted.push(id);
          filesFailed += data.files?.failed || 0;
        } else {
          failed.push(id);
        }
      } catch {
        failed.push(id);
      }
    }

    if (deleted.length) {
      const gone = new Set(deleted);
      setSubmissions((prev) => prev.filter((s) => !gone.has(s.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        deleted.forEach((id) => next.delete(id));
        return next;
      });
    }

    setDeleting(false);
    setDeleteIds(null);

    if (failed.length === 0 && filesFailed === 0) {
      toast.success(`${deleted.length} photograph${deleted.length === 1 ? '' : 's'} deleted.`);
    } else if (failed.length) {
      toast.error(
        `${failed.length} photograph${failed.length === 1 ? '' : 's'} could not be deleted` +
          (deleted.length ? ` (${deleted.length} were).` : '.') +
          ' They are still in the gallery.'
      );
    } else {
      toast.error(
        `Records deleted, but ${filesFailed} image file${filesFailed === 1 ? '' : 's'} could not be removed from storage.`
      );
    }
  }

  function openCaptionModal(sub) {
    setEditingSub(sub);
    setNewCaption(sub.caption || '');
    setCaptionError('');
  }

  async function saveCaption() {
    if (!editingSub) return;
    setIsUpdatingCaption(true);
    setCaptionError('');

    try {
      // Re-compose the Polaroid from the original photo with the new caption
      const blob = await compositePolaroid(editingSub.photo_url, newCaption);
      const formData = new FormData();
      formData.append('file', blob, `polaroid-${Date.now()}.jpg`);
      formData.append('folder', eventId);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Could not save the new Polaroid image.');

      const res = await fetch(`/api/submissions/${editingSub.id}/update-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: newCaption.trim(), polaroidUrl: uploadData.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Caption could not be saved.');

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === editingSub.id
            ? { ...s, caption: newCaption.trim(), polaroid_url: uploadData.url }
            : s
        )
      );
      setEditingSub(null);
      toast.success('Caption updated.');
    } catch (e) {
      setCaptionError(e.message || 'Caption update failed.');
    } finally {
      setIsUpdatingCaption(false);
    }
  }

  // Owner action: Final approve or pass photograph directly from archive
  async function handleStatusChange(id, newStatus) {
    if (!isOwner) return;
    try {
      const endpoint = newStatus === 'approved' ? 'approve' : newStatus === 'rejected' ? 'reject' : 'pending';
      const res = await fetch(`/api/submissions/${id}/${endpoint}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update photograph status.');
      }
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
      toast.success(
        newStatus === 'approved'
          ? 'Photograph approved to the live wall.'
          : newStatus === 'rejected'
          ? 'Photograph passed.'
          : 'Photograph returned to awaiting queue.'
      );
    } catch (err) {
      toast.error(err.message || 'Status update failed.');
    }
  }

  // Owner action: Bulk final approve all selected photographs to live wall
  async function handleBulkApprove() {
    if (!isOwner || selected.size === 0) return;
    const ids = [...selected];
    let approvedCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/submissions/${id}/approve`, { method: 'POST' });
        if (res.ok) approvedCount++;
      } catch {}
    }
    setSubmissions((prev) =>
      prev.map((s) => (selected.has(s.id) ? { ...s, status: 'approved' } : s))
    );
    setSelected(new Set());
    toast.success(`${approvedCount} photograph${approvedCount === 1 ? '' : 's'} approved to the wall.`);
  }

  if (roleLoaded && !role) return <AccessDenied />;

  const selectedCount = selected.size;

  return (
    <div className="min-h-screen flex flex-col selection:bg-sepia selection:text-white">
      <header className="px-6 py-4 glass-nav flex items-center justify-between border-b border-ink/10">
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}`}
            className="text-xs uppercase tracking-wider text-ink-muted hover:text-ink font-semibold flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </Link>
          <span className="text-xs text-ink-faint">•</span>
          <span className="font-editorial text-xl text-ink font-normal">Archive</span>
          {roleLoaded && role && (
            <span
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                isOwner
                  ? 'bg-sepia/10 text-sepia border-sepia/25'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {isOwner ? 'Owner' : 'Collaborator'}
            </span>
          )}
        </div>
      </header>


      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 pb-28">
        <div className="mb-6">
          <h1 className="font-editorial text-4xl font-normal text-ink">The archive</h1>
          <p className="text-sm text-ink-muted font-light mt-1 max-w-xl">
            Every photograph guests have sent. Edit a caption, download the original or the Polaroid, or
            remove what shouldn’t be kept.
          </p>
        </div>

        {/* Filters + select */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filter === f.id
                    ? 'bg-sepia text-white border-sepia'
                    : 'bg-ivory text-ink-muted border-ink/10 hover:border-sepia/50 hover:text-ink'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${filter === f.id ? 'text-white/80' : 'text-ink-faint'}`}>
                  {counts[f.id]}
                </span>
              </button>
            ))}
          </div>

          {isOwner && visible.length > 0 && (
            <button
              onClick={toggleSelectVisible}
              className="btn-editorial btn-editorial-secondary text-xs px-3.5 py-1.5"
            >
              {allVisibleSelected ? 'Clear selection' : `Select all ${visible.length}`}
            </button>
          )}
        </div>

        {loadState === 'loading' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-7" aria-busy="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-sm bg-paper-dark/70 animate-pulse"
                style={{ aspectRatio: '880 / 1044' }}
              />
            ))}
          </div>
        )}

        {loadState === 'error' && (
          <div role="alert" className="text-center py-20 bg-ivory border border-red-200 rounded-2xl">
            <p className="font-editorial text-2xl text-ink mb-1">We couldn’t load the archive</p>
            <p className="text-sm text-ink-muted font-light mb-5">{loadError}</p>
            <button onClick={loadAll} className="btn-editorial btn-editorial-primary text-xs px-4 py-2">
              Try again
            </button>
          </div>
        )}

        {loadState === 'ready' && visible.length === 0 && (
          <div className="text-center py-20 bg-ivory border border-dashed border-ink/20 rounded-2xl">
            <p className="font-editorial text-2xl text-ink mb-1">
              {submissions.length === 0 ? 'No photographs yet.' : 'Nothing in this view.'}
            </p>
            <p className="text-sm text-ink-muted font-light">
              {submissions.length === 0
                ? 'Photographs appear here as soon as guests submit them.'
                : 'Try another filter.'}
            </p>
          </div>
        )}

        {loadState === 'ready' && visible.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-7 items-start">
            {visible.map((sub) => {
              const isSelected = selected.has(sub.id);
              const st = STATUS_STYLE[sub.status] || STATUS_STYLE.pending;
              return (
                <li key={sub.id}>
                  <div
                    className={`group relative rounded-sm transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-sepia ring-offset-4 ring-offset-paper' : ''
                    }`}
                  >
                    <PolaroidCard
                      photoUrl={sub.photo_url}
                      polaroidUrl={sub.polaroid_url}
                      caption={sub.caption}
                      className="w-full"
                    />

                    {/* Select (Owner only) */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => toggleSelect(sub.id)}
                        aria-pressed={isSelected}
                        aria-label={isSelected ? 'Deselect photograph' : 'Select photograph'}
                        className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-sepia border-sepia text-white scale-100'
                            : 'bg-white/90 border-ink/25 text-transparent hover:text-ink/40 opacity-90'
                        }`}
                      >
                        <Check className="w-4 h-4" strokeWidth={3} />
                      </button>
                    )}

                    {/* Status */}
                    <span
                      className={`absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/90 shadow-sm text-[10px] font-semibold uppercase tracking-wider ${st.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 px-0.5 text-xs">
                    {isOwner ? (
                      <button
                        onClick={() => openCaptionModal(sub)}
                        className="inline-flex items-center gap-1 text-sepia hover:underline py-1.5 pr-2"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Caption</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-ink-faint italic py-1.5">View only</span>
                    )}
                    <div className="flex items-center">
                      {isOwner && sub.status !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(sub.id, 'approved')}
                          className="p-2 text-emerald-700 hover:text-emerald-900"
                          title="Final approve to live wall"
                          aria-label="Final approve to live wall"
                        >
                          <Check className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      )}
                      {isOwner && sub.status === 'approved' && (
                        <button
                          onClick={() => handleStatusChange(sub.id, 'rejected')}
                          className="p-2 text-ink-muted hover:text-danger"
                          title="Pass / remove from wall"
                          aria-label="Pass / remove from wall"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={sub.polaroid_url || sub.photo_url}
                        download
                        className="p-2 text-ink-muted hover:text-ink"
                        title="Download Polaroid"
                        aria-label="Download Polaroid"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <a
                        href={sub.photo_url}
                        download
                        className="p-2 text-ink-muted hover:text-ink"
                        title="Download original photo"
                        aria-label="Download original photo"
                      >
                        <ImageDown className="w-4 h-4" />
                      </a>
                      {isOwner && (
                        <button
                          onClick={() => setDeleteIds([sub.id])}
                          className="p-2 text-danger hover:text-danger-dark"
                          title="Delete photograph"
                          aria-label="Delete photograph"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Bulk action bar (Owner only) */}
      {isOwner && selectedCount > 0 && (
        <div
          role="region"
          aria-label="Selection actions"
          className="fixed z-30 left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 flex items-center gap-3 pl-5 pr-2 py-2 rounded-full bg-ink text-paper-light shadow-2xl animate-fade-in"
        >
          <span className="text-sm">
            <strong>{selectedCount}</strong> selected
          </span>
          <button
            onClick={() => setSelected(new Set())}
            className="p-1.5 rounded-full hover:bg-white/10"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleBulkApprove}
            className="btn-editorial btn-editorial-primary text-xs px-3.5 py-1.5"
            title="Final approve selected photographs to live wall"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve to wall</span>
          </button>
          <button
            onClick={() => setDeleteIds([...selected])}
            className="btn-editorial btn-editorial-danger text-xs px-4 py-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete…</span>
          </button>
        </div>
      )}

      {isOwner && (
        <ConfirmDialog
          open={Boolean(deleteIds)}
          tone="danger"
          busy={deleting}
          title={
            deleteIds?.length === 1
              ? 'Delete this photograph?'
              : `Delete ${deleteIds?.length || 0} photographs?`
          }
          confirmLabel={deleting ? 'Deleting…' : 'Delete permanently'}
          onCancel={() => !deleting && setDeleteIds(null)}
          onConfirm={confirmDelete}
        >
          This removes the photograph, its Polaroid, and its caption from the event and deletes the image
          files from storage. If it is on the wall, it disappears from the wall. This cannot be undone.
        </ConfirmDialog>
      )}

      {/* Caption edit modal (Owner only) */}
      {isOwner && editingSub && (

        <div
          className="dialog-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && !isUpdatingCaption && setEditingSub(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !isUpdatingCaption) setEditingSub(null);
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveCaption();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="caption-modal-title"
            className="dialog-panel !max-w-lg"
          >
            <h2 id="caption-modal-title" className="font-editorial text-3xl font-normal text-ink mb-1">
              Edit caption
            </h2>
            <p className="text-xs text-ink-muted font-light mb-4">
              The Polaroid is redrawn from the original photograph with your new handwriting.
            </p>

            <div className="grid sm:grid-cols-[150px_1fr] gap-5">
              <div className="mx-auto w-[150px]">
                <PolaroidCard
                  photoUrl={editingSub.photo_url}
                  polaroidUrl={editingSub.photo_url}
                  caption={newCaption}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="gallery-caption" className="text-xs uppercase tracking-wider text-ink-muted font-semibold">
                    Handwritten note
                  </label>
                  <span className="text-xs text-ink-faint">
                    {newCaption.length}/{CAPTION_LIMIT}
                  </span>
                </div>
                <textarea
                  id="gallery-caption"
                  value={newCaption}
                  maxLength={CAPTION_LIMIT}
                  onChange={(e) => setNewCaption(e.target.value)}
                  rows={4}
                  placeholder="e.g. Under the olive trees at dusk…"
                  className="input-editorial font-caption text-2xl w-full resize-none"
                  autoFocus
                />
              </div>
            </div>

            {captionError && (
              <p role="alert" className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {captionError}
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingSub(null)}
                disabled={isUpdatingCaption}
                className="btn-editorial btn-editorial-secondary text-sm px-5 py-2.5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveCaption}
                disabled={isUpdatingCaption}
                className="btn-editorial btn-editorial-primary text-sm px-5 py-2.5 disabled:opacity-60"
              >
                {isUpdatingCaption && <Loader2 className="w-4 h-4 animate-spin" />}
                {isUpdatingCaption ? 'Redrawing Polaroid…' : 'Save caption'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
