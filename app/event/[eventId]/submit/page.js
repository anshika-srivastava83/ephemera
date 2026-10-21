'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Camera,
  Upload,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Download,
  RotateCcw,
  Mail,
  AlertCircle,
  Eye,
  Edit3,
  Image as ImageIcon,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import { Wordmark } from '../../../../components/brand/EditorialNav';
import { CustomCheckbox } from '../../../../components/ui/CustomCheckbox';
import { InputField } from '../../../../components/ui/InputField';
import { compositePolaroid } from '../../../../lib/compositePolaroid';
import { emailRegex } from '../../../../lib/validation';

const CAPTION_LIMIT = 120;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export default function GuestSubmitPage({ params }) {
  const { eventId } = params;
  const [event, setEvent] = useState(null);
  const [eventState, setEventState] = useState('loading'); // 'loading' | 'ready' | 'missing'
  const [progress, setProgress] = useState({ pct: 0, label: '' });

  // Flow steps: 'welcome' | 'email' | 'existing_review' | 'camera' | 'polaroid' | 'success'
  const [step, setStep] = useState('welcome');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [existing, setExisting] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [reuseConsent, setReuseConsent] = useState(true);

  const [isCompositing, setIsCompositing] = useState(false);
  const [compositedBlob, setCompositedBlob] = useState(null);
  const [compositedUrl, setCompositedUrl] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Load event metadata & check if token is present in URL
  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        const found = data.events?.find((e) => e.id === eventId);
        if (found) {
          setEvent(found);
          setEventState('ready');
        } else {
          setEventState('missing');
        }
      } catch (e) {
        console.error('Failed to load event', e);
        setEventState('ready');
      }
    }
    loadEvent();

    // Check for direct edit token in query params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (token) {
        fetch(`/api/submissions/by-token?token=${encodeURIComponent(token)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.submission) {
              setExisting(data.submission);
              if (data.submission.email) setEmail(data.submission.email);
              if (data.submission.caption) setCaption(data.submission.caption);
              if (data.submission.photo_url) setRawPreviewUrl(data.submission.photo_url);
              setStep('polaroid');
            }
          })
          .catch((err) => console.warn('Token submission lookup skipped:', err));
      }
    }
  }, [eventId]);

  // File selection with validation
  function handleFileSelected(file) {
    if (!file) return;

    setGeneralError('');
    // 1. MIME type validation
    if (!file.type || !file.type.startsWith('image/')) {
      setGeneralError('Please select a photographic image file (JPEG, PNG, HEIC).');
      return;
    }

    // 2. File size validation
    if (file.size > MAX_FILE_SIZE) {
      setGeneralError('Photograph is too large. Please choose an image under 15MB.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setRawPreviewUrl(url);
    setStep('polaroid');
  }

  // Validate email address & check for existing polaroids
  async function checkEmailAndProceed() {
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !emailRegex.test(cleaned)) {
      setEmailError('Please enter a valid email address (e.g. you@example.com).');
      return;
    }
    setEmailError('');
    setGeneralError('');
    setIsCheckingEmail(true);

    try {
      const res = await fetch(
        `/api/submissions?eventId=${eventId}&email=${encodeURIComponent(cleaned)}`
      );
      const data = await res.json();
      if (data.existing) {
        setExisting(data.existing);
        setCaption(data.existing.caption || '');
        setRawPreviewUrl(data.existing.photo_url);
        setReuseConsent(data.existing.reuse_consent ?? true);
        setStep('existing_review');
      } else {
        setExisting(null);
        setStep('camera');
      }
    } catch (e) {
      setStep('camera');
    } finally {
      setIsCheckingEmail(false);
    }
  }

  // Live Polaroid generation when photo or caption changes
  useEffect(() => {
    const source = selectedFile || rawPreviewUrl;
    if (!source) return;

    let cancelled = false;
    setIsCompositing(true);

    const timer = setTimeout(async () => {
      try {
        const blob = await compositePolaroid(source, caption);
        if (cancelled) return;
        setCompositedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCompositedUrl(url);
      } catch (err) {
        console.error('Failed compositing Polaroid:', err);
      } finally {
        if (!cancelled) setIsCompositing(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedFile, rawPreviewUrl, caption]);

  // Upload helper
  async function uploadImageFile(fileOrBlob, filename) {
    const formData = new FormData();
    formData.append('file', fileOrBlob, filename);
    formData.append('folder', eventId);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
  }

  // Final submission / update with email and Polaroid composite
  async function handleSubmit(e) {
    e.preventDefault();
    setGeneralError('');

    const source = selectedFile || rawPreviewUrl;
    if (!source) {
      setGeneralError('Please select or capture a photograph first.');
      return;
    }

    if (!email || !emailRegex.test(email.trim())) {
      setGeneralError('A valid email address is required to receive your keepsake.');
      setStep('email');
      return;
    }

    setIsSubmitting(true);
    setProgress({ pct: 10, label: existing ? 'Updating your memory…' : 'Sending your photograph…' });

    try {
      // 1. Upload raw photo if a new file was chosen, otherwise keep existing photo_url
      let photoUrl = existing?.photo_url || '';
      if (selectedFile) {
        photoUrl = await uploadImageFile(selectedFile, selectedFile.name || 'guest-photo.jpg');
      }
      setProgress({ pct: 50, label: 'Developing your Polaroid…' });

      // 2. Upload composited Polaroid
      let polaroidUrl = existing?.polaroid_url || '';
      if (compositedBlob) {
        polaroidUrl = await uploadImageFile(compositedBlob, `polaroid-${Date.now()}.jpg`);
      }
      setProgress({ pct: 85, label: 'Placing it on the living wall…' });

      // 3. Save submission record
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          email: email.trim(),
          caption: caption.trim(),
          photoUrl,
          polaroidUrl,
          reuseConsent,
          isEdit: !!existing,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission could not be completed.');
      }

      setProgress({ pct: 100, label: 'Done' });
      setSubmittedData({
        ...data.submission,
        photoUrl,
        polaroidUrl,
        emailSent: data.emailSent,
      });

      setExisting(data.submission);
      setStep('success');

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#8B6F55', '#C8A39B', '#F5F0E7', '#FAF7F0'],
        });
      } catch (e) {}
    } catch (err) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setGeneralError(
        offline || err instanceof TypeError
          ? 'We lost connection. Your photo and note are preserved — tap to try again.'
          : err.message || 'Submission failed.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const blocked = eventState === 'missing' ? 'missing' : event && event.status !== 'open' ? 'closed' : null;

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between p-3.5 sm:p-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] selection:bg-sepia selection:text-white">
      {/* Hidden inputs for camera & gallery */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />

      {/* Top Bar */}
      <header className="flex items-center justify-between pb-4 sm:pb-6 border-b border-ink/10">
        <Wordmark />
        {event && (
          <span className="text-xs uppercase tracking-wider text-ink-muted truncate max-w-[180px] font-medium">
            {event.name}
          </span>
        )}
      </header>

      {/* Main Flow Container */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-8">
        <div className="w-full max-w-md mx-auto">
          {generalError && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{generalError}</span>
            </div>
          )}

          {eventState === 'loading' && (
            <div className="text-center py-20 text-ink-muted" role="status">
              <Sparkles className="w-8 h-8 animate-spin mx-auto text-sepia mb-3" />
              <p className="font-editorial text-2xl">Setting the table…</p>
            </div>
          )}

          {blocked && (
            <div className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm text-center">
              <h1 className="font-editorial text-4xl font-normal text-ink mb-3">
                {blocked === 'closed' ? 'The table is closed.' : "We couldn't find this event."}
              </h1>
              <p className="text-sm text-ink-muted font-light leading-relaxed mb-6">
                {blocked === 'closed'
                  ? 'This event is no longer accepting photographs. You can still watch the living wall.'
                  : 'The link may be mistyped, or the event may have been removed. Check the QR code and try again.'}
              </p>
              {blocked === 'closed' && (
                <Link
                  href={`/wall/${eventId}`}
                  className="btn-editorial btn-editorial-primary px-5 py-3 text-sm justify-center"
                >
                  <Eye className="w-4 h-4" />
                  <span>Watch the Live Wall</span>
                </Link>
              )}
            </div>
          )}

          {eventState === 'ready' && !blocked && (
            <AnimatePresence mode="wait">
              {/* 1. Welcome Screen */}
              {step === 'welcome' && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-sepia/10 text-sepia flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6" />
                  </div>

                  {event?.name && (
                    <p className="text-[11px] uppercase tracking-[0.18em] text-sepia font-semibold mb-2">
                      {event.name}
                    </p>
                  )}
                  <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-ink mb-3 leading-tight">
                    You're part of tonight's story.
                  </h1>

                  <p className="text-ink-muted text-xs sm:text-sm font-light leading-relaxed mb-8">
                    Snap an honest candid moment and inscribe a handwritten note. Your photograph will
                    float onto the live wall across the room.
                  </p>

                  <button
                    onClick={() => setStep('email')}
                    className="btn-editorial btn-editorial-primary w-full py-4 text-base shadow-sm justify-center"
                  >
                    <span>Capture or Edit a Moment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* 2. Email Address Screen (replaces mobile number) */}
              {step === 'email' && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-sepia">
                      Step 1 of 2
                    </span>
                    <button
                      onClick={() => setStep('welcome')}
                      className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                  </div>

                  <h2 className="font-editorial text-3xl font-normal text-ink mb-2">
                    Your Keepsake Email
                  </h2>
                  <p className="text-xs text-ink-muted font-light leading-relaxed mb-6">
                    Enter your email to receive your Polaroid and a link to the complete celebration wall.
                    You can edit or replace your photo anytime while the event is open.
                  </p>

                  <div className="space-y-4">
                    <InputField
                      label="Email Address"
                      required
                      type="email"
                      icon={Mail}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      error={emailError}
                      placeholder="e.g. you@example.com"
                      onKeyDown={(e) => e.key === 'Enter' && checkEmailAndProceed()}
                    />

                    <button
                      onClick={checkEmailAndProceed}
                      disabled={!email || isCheckingEmail}
                      className="btn-editorial btn-editorial-primary w-full py-3.5 text-base justify-center disabled:opacity-50"
                    >
                      {isCheckingEmail ? (
                        <span>Checking…</span>
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 3. Existing Submission Review Screen */}
              {step === 'existing_review' && existing && (
                <motion.div
                  key="existing_review"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm text-center"
                >
                  <div className="flex items-center justify-between mb-3 text-left">
                    <span className="text-xs uppercase tracking-wider font-semibold text-sepia">
                      Memory Found
                    </span>
                    <button
                      onClick={() => setStep('email')}
                      className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Different email</span>
                    </button>
                  </div>

                  <h2 className="font-editorial text-3xl font-normal text-ink mb-2">
                    Your Polaroid on the Wall
                  </h2>
                  <p className="text-xs text-ink-muted font-light mb-6">
                    You already have a moment submitted. Would you like to edit your handwritten note,
                    change your photo, or view it live?
                  </p>

                  {/* Existing Polaroid Display */}
                  <div className="max-w-[220px] mx-auto my-4 -rotate-1 shadow-polaroid rounded bg-white p-2 border border-ink/10">
                    <img
                      src={existing.polaroid_url || existing.photo_url}
                      alt="Current submission"
                      className="w-full object-cover rounded"
                    />
                    {existing.caption && (
                      <p className="font-caption text-lg text-ink mt-2 px-1 text-center truncate">
                        {existing.caption}
                      </p>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="mb-6">
                    <span
                      role="status"
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        existing.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {existing.status === 'approved' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {existing.status === 'approved'
                          ? 'Approved & on the live wall'
                          : 'Awaiting host curation'}
                      </span>
                    </span>
                  </div>

                  {/* Action Choices */}
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setStep('polaroid');
                      }}
                      className="btn-editorial btn-editorial-primary w-full py-3.5 text-sm shadow-sm justify-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Note & Caption</span>
                    </button>

                    <button
                      onClick={() => {
                        cameraInputRef.current?.click();
                      }}
                      className="btn-editorial btn-editorial-secondary w-full py-3.5 text-sm justify-center gap-2"
                    >
                      <Camera className="w-4 h-4 text-sepia" />
                      <span>Take New Photo (Replace)</span>
                    </button>

                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                      className="btn-editorial btn-editorial-secondary w-full py-3 text-xs justify-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5 text-ink-muted" />
                      <span>Upload New Photo from Roll</span>
                    </button>

                    <div className="pt-3 border-t border-ink/5">
                      <Link
                        href={`/wall/${eventId}`}
                        target="_blank"
                        className="text-xs text-sepia font-medium hover:underline inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Watch Live Living Wall</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 4. Camera / File Selection Screen */}
              {step === 'camera' && (
                <motion.div
                  key="camera"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm text-center"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-sepia">
                      Step 2 of 2
                    </span>
                    <button
                      onClick={() => setStep('email')}
                      className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Change email</span>
                    </button>
                  </div>

                  <h2 className="font-editorial text-3xl font-normal text-ink mb-2">
                    Take Your Shot
                  </h2>
                  <p className="text-xs text-ink-muted font-light mb-8">
                    Capture spontaneous laughter, toasts, or quiet glances.
                  </p>

                  <div className="space-y-4">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="btn-editorial btn-editorial-primary w-full py-4 text-base shadow-sm justify-center"
                    >
                      <Camera className="w-5 h-5 text-sepia-light" />
                      <span>Open Instant Camera</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-editorial btn-editorial-secondary w-full py-3.5 text-sm justify-center"
                    >
                      <Upload className="w-4 h-4 text-ink-muted" />
                      <span>Choose from Photo Roll</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 5. The Polaroid Inscription & Editor Studio */}
              {step === 'polaroid' && rawPreviewUrl && (
                <motion.div
                  key="polaroid"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="bg-ivory border border-ink/10 rounded-2xl p-5 sm:p-8 shadow-md"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider font-semibold text-sepia">
                      {existing ? 'Edit Your Polaroid' : 'The Polaroid Inscription'}
                    </span>
                    <button
                      onClick={() => {
                        if (existing) {
                          setStep('existing_review');
                        } else {
                          setSelectedFile(null);
                          setStep('camera');
                        }
                      }}
                      className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                  </div>

                  {/* Photo Replacement Quick Actions */}
                  <div className="flex items-center justify-between bg-paper-light border border-ink/10 rounded-xl px-3 py-2 mb-3 text-xs">
                    <span className="text-ink-muted font-medium">Photo:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex items-center gap-1 text-sepia hover:text-sepia-dark font-medium"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Camera</span>
                      </button>
                      <span className="text-ink/20">•</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 text-ink-muted hover:text-ink font-medium"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Change Photo</span>
                      </button>
                    </div>
                  </div>

                  {/* Tactile Polaroid Live Preview */}
                  <div className="relative max-w-[270px] mx-auto my-4 -rotate-[1.5deg] motion-reduce:rotate-0">
                    <span aria-hidden className="polaroid-tape" />
                    <div className="polaroid-frame shadow-polaroid">
                      <div className="polaroid-photo-inner">
                        <img
                          src={rawPreviewUrl}
                          alt="Polaroid preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-h-[46px] flex items-center justify-center">
                        <p className="font-caption text-xl text-ink leading-tight text-center px-1">
                          {caption || (
                            <span className="text-ink-faint italic text-base">
                              write your note below...
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="caption-input"
                          className="text-xs uppercase tracking-wider font-semibold text-ink/80"
                        >
                          Handwritten Note
                        </label>
                        <span className="text-xs text-ink-faint">
                          {caption.length}/{CAPTION_LIMIT}
                        </span>
                      </div>
                      <textarea
                        id="caption-input"
                        value={caption}
                        maxLength={CAPTION_LIMIT}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="e.g. the night we finally got everyone together..."
                        rows={2}
                        className="input-editorial font-caption text-2xl resize-none py-2"
                      />
                    </div>

                    {/* Email badge indicator */}
                    <div className="flex items-center justify-between text-xs text-ink-muted bg-paper-light border border-ink/10 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-sepia shrink-0" />
                        <span className="truncate">{email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="text-sepia hover:underline shrink-0 ml-2 font-medium"
                      >
                        Change
                      </button>
                    </div>

                    {/* Custom Checkbox for reuse consent */}
                    <div className="pt-1">
                      <CustomCheckbox
                        checked={reuseConsent}
                        onChange={setReuseConsent}
                        label="Include in the Master Tapestry"
                        sublabel="Allow the host to incorporate your photo into the final celebration artwork."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || isCompositing}
                      className="btn-editorial btn-editorial-primary w-full py-4 text-base shadow-sm justify-center disabled:opacity-50 mt-2"
                    >
                      {isSubmitting ? (
                        <span>{progress.label || 'Saving your moment…'}</span>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-sepia-light" />
                          <span>
                            {existing
                              ? 'Update on the Living Wall'
                              : 'Place on the Living Wall'}
                          </span>
                        </>
                      )}
                    </button>
                    {isSubmitting && (
                      <div
                        className="h-1 rounded-full bg-ink/10 overflow-hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress.pct}
                        aria-label="Submission progress"
                      >
                        <div
                          className="h-full bg-sepia transition-[width] duration-500 ease-out"
                          style={{ width: `${progress.pct}%` }}
                        />
                      </div>
                    )}
                  </form>
                </motion.div>
              )}

              {/* 6. Success Keepsake Screen */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>

                  <h2 className="font-editorial text-4xl font-normal text-ink mb-2">
                    {submittedData?.id ? 'Your Polaroid is updated!' : 'Your moment is in.'}
                  </h2>
                  <p className="text-xs text-ink-muted font-light leading-relaxed mb-6">
                    {email ? (
                      <>
                        We've emailed your high-resolution Polaroid to <strong>{email}</strong>.
                        Look up at the live projection screen—it will settle onto the wall shortly!
                      </>
                    ) : (
                      'Your Polaroid has settled into the curation queue. Look up at the screen shortly!'
                    )}
                  </p>

                  {(compositedUrl || rawPreviewUrl) && (
                    <div className="max-w-[210px] mx-auto mb-6">
                      <img
                        src={compositedUrl || rawPreviewUrl}
                        alt="Your polaroid keepsake"
                        className="w-full rounded shadow-polaroid"
                      />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                    {(compositedUrl || submittedData?.polaroidUrl) && (
                      <a
                        href={compositedUrl || submittedData?.polaroidUrl}
                        download="my-ephemera-polaroid.jpg"
                        className="btn-editorial btn-editorial-secondary w-full sm:w-auto text-xs px-4 py-2.5"
                      >
                        <Download className="w-4 h-4 text-sepia" />
                        <span>Download Polaroid</span>
                      </a>
                    )}

                    <Link
                      href={`/wall/${eventId}`}
                      target="_blank"
                      className="btn-editorial btn-editorial-primary w-full sm:w-auto text-xs px-4 py-2.5"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Watch Live Wall</span>
                    </Link>
                  </div>

                  {/* Immediate Edit Option */}
                  <div className="pt-4 border-t border-ink/5 space-y-2">
                    <button
                      onClick={() => setStep('polaroid')}
                      className="btn-editorial btn-editorial-secondary w-full py-2.5 text-xs justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-sepia" />
                      <span>Edit Photo or Handwritten Note</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setRawPreviewUrl(null);
                        setCaption('');
                        setExisting(null);
                        setStep('camera');
                      }}
                      className="text-xs text-ink-muted hover:text-sepia inline-flex items-center gap-1 font-medium pt-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Submit another candid photo</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-ink-faint pt-4 border-t border-ink/5">
        <span>Ephemera • Made to be remembered, designed to let go.</span>
      </footer>
    </div>
  );
}