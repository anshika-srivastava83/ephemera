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
  Smartphone,
  Mail,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Wordmark } from '../../../../components/brand/EditorialNav';
import { CustomCheckbox } from '../../../../components/ui/CustomCheckbox';
import { InputField } from '../../../../components/ui/InputField';
import { compositePolaroid } from '../../../../lib/compositePolaroid';
import { emailRegex, phoneRegex } from '../../../../lib/validation';

const CAPTION_LIMIT = 120;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export default function GuestSubmitPage({ params }) {
  const { eventId } = params;
  const [event, setEvent] = useState(null);
  const [eventState, setEventState] = useState('loading'); // 'loading' | 'ready' | 'missing'
  const [progress, setProgress] = useState({ pct: 0, label: '' });
  const [step, setStep] = useState('welcome'); // 'welcome' | 'phone' | 'camera' | 'polaroid' | 'success'

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [existing, setExisting] = useState(null);
  const [hasEmail, setHasEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

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

  // Load event metadata
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
        // Offline or flaky network: let the guest continue; the server re-checks on submit.
        setEventState('ready');
      }
    }
    loadEvent();
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

  // Validate phone number
  async function checkPhone() {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (!cleaned || cleaned.length < 5) {
      setPhoneError('Please enter a valid phone number (at least 5 digits).');
      return;
    }
    setPhoneError('');
    setGeneralError('');

    try {
      const res = await fetch(
        `/api/submissions?eventId=${eventId}&phone=${encodeURIComponent(cleaned)}`
      );
      const data = await res.json();
      if (data.existing) {
        setExisting(data.existing);
      }
      setHasEmail(!!data.hasEmail);
      setStep('camera');
    } catch (e) {
      setStep('camera');
    }
  }

  // Live Polaroid generation when photo or caption changes
  useEffect(() => {
    if (!selectedFile) return;

    let cancelled = false;
    setIsCompositing(true);

    const timer = setTimeout(async () => {
      try {
        const blob = await compositePolaroid(selectedFile, caption);
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
  }, [selectedFile, caption]);

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

  // Final submission with full validation
  async function handleSubmit(e) {
    e.preventDefault();
    setGeneralError('');
    setEmailError('');

    if (!selectedFile || !compositedBlob) {
      setGeneralError('Please capture or choose a photo first.');
      return;
    }

    if (email && email.trim() && !emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address format.');
      return;
    }

    setIsSubmitting(true);
    setProgress({ pct: 8, label: 'Sending your photograph…' });

    try {
      // 1. Upload raw photo
      const rawUrl = await uploadImageFile(selectedFile, selectedFile.name || 'guest-photo.jpg');
      setProgress({ pct: 45, label: 'Developing your Polaroid…' });

      // 2. Upload composited Polaroid
      const polaroidUrl = await uploadImageFile(compositedBlob, `polaroid-${Date.now()}.jpg`);
      setProgress({ pct: 80, label: 'Placing it in the queue…' });

      // 3. Save submission record
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          phone: phone.trim(),
          caption: caption.trim(),
          photoUrl: rawUrl,
          polaroidUrl: polaroidUrl,
          reuseConsent,
          email: hasEmail ? undefined : (email.trim() || undefined),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission could not be completed.');
      }

      setProgress({ pct: 100, label: 'Done' });
      setSubmittedData({
        ...data.submission,
        rawUrl,
        polaroidUrl,
        emailSent: data.emailSent,
      });

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
          ? 'We lost the connection. Your photo and note are still here — tap the button to try again.'
          : err.message || 'Submission failed.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const blocked = eventState === 'missing' ? 'missing' : event && event.status !== 'open' ? 'closed' : null;

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 selection:bg-sepia selection:text-white">
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
                  ? 'This event is no longer accepting photographs. You can still watch the wall.'
                  : 'The link may be mistyped, or the event may have been removed. Check the QR card and try again.'}
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
                  Snap an honest candid moment and inscribe a short note. Your photograph will
                  float onto the live wall across the room.
                </p>

                <button
                  onClick={() => setStep('phone')}
                  className="btn-editorial btn-editorial-primary w-full py-4 text-base shadow-sm justify-center"
                >
                  <span>Capture a Moment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* 2. Phone Verification Screen */}
            {step === 'phone' && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm"
              >
                <span className="text-xs uppercase tracking-wider font-semibold text-sepia block mb-1">
                  Step 1 of 2
                </span>
                <h2 className="font-editorial text-3xl font-normal text-ink mb-2">
                  Welcome to the Gathering
                </h2>
                <p className="text-xs text-ink-muted font-light leading-relaxed mb-6">
                  Enter your number so you can replace your photo later. Your number is hashed
                  with cryptographic SHA-256 and never stored as plain text.
                </p>

                <div className="space-y-4">
                  <InputField
                    label="Mobile Number"
                    required
                    type="tel"
                    icon={Smartphone}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError('');
                    }}
                    error={phoneError}
                    placeholder="e.g. 555-234-5678"
                    onKeyDown={(e) => e.key === 'Enter' && checkPhone()}
                  />

                  <button
                    onClick={checkPhone}
                    disabled={!phone}
                    className="btn-editorial btn-editorial-primary w-full py-3.5 text-base justify-center disabled:opacity-50"
                  >
                    <span>Continue to Camera</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3. Camera / File Selection Screen */}
            {step === 'camera' && (
              <motion.div
                key="camera"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="bg-ivory border border-ink/10 rounded-2xl p-6 sm:p-8 shadow-sm text-center"
              >
                {existing && (
                  <div className="mb-6 p-4 rounded-xl bg-paper-light border border-ink/10 text-left">
                    <p className="text-xs font-semibold text-sepia uppercase tracking-wider mb-2">
                      Your active photo on the wall:
                    </p>
                    <div className="flex items-center gap-3">
                      <img
                        src={existing.polaroid_url}
                        alt="Existing submission"
                        className="w-16 h-16 object-cover rounded shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-caption text-xl text-ink truncate">
                          {existing.caption || 'No caption'}
                        </p>
                        <span className="text-[11px] text-ink-faint">
                          Submitting a new photo will update this memory.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <h2 className="font-editorial text-3xl font-normal text-ink mb-2">
                  Take Your Shot
                </h2>
                <p className="text-xs text-ink-muted font-light mb-8">
                  Capture spontaneous laughter, toasts, or quiet glances.
                </p>

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

            {/* 4. The Polaroid Inscription Editor */}
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
                    The Polaroid Inscription
                  </span>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setStep('camera');
                    }}
                    className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake</span>
                  </button>
                </div>

                {/* Tactile Polaroid Preview */}
                <div className="relative max-w-[270px] mx-auto my-5 -rotate-[1.5deg] motion-reduce:rotate-0">
                  <span aria-hidden className="polaroid-tape" />
                  <div className="polaroid-frame shadow-polaroid">
                    <div className="polaroid-photo-inner">
                      <img
                        src={rawPreviewUrl}
                        alt="Guest capture"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-h-[46px] flex items-center justify-center">
                      <p className="font-caption text-xl text-ink leading-tight text-center px-1">
                        {caption || <span className="text-ink-faint italic text-base">write your note below...</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="caption-input" className="text-xs uppercase tracking-wider font-semibold text-ink/80">
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

                  {!hasEmail && (
                    <InputField
                      label="Your Email (Optional Keepsake)"
                      type="email"
                      icon={Mail}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      error={emailError}
                      placeholder="you@example.com"
                      helperText="We'll email you a private download link to keep your Polaroid."
                    />
                  )}

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
                      <span>{progress.label || 'Adding to the wall…'}</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-sepia-light" />
                        <span>Place on the Living Wall</span>
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

            {/* 5. Success Keepsake Screen */}
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
                  Your moment is in.
                </h2>
                <p className="text-xs text-ink-muted font-light leading-relaxed mb-6">
                  Your Polaroid has been delivered to the curation queue.
                  Look up at the projection screen—it will settle onto the wall shortly!
                </p>

                {compositedUrl && (
                  <div className="max-w-[210px] mx-auto mb-6">
                    <img
                      src={compositedUrl}
                      alt="Your polaroid keepsake"
                      className="w-full rounded shadow-polaroid"
                    />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                  {compositedUrl && (
                    <a
                      href={compositedUrl}
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

                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setRawPreviewUrl(null);
                    setCaption('');
                    setStep('camera');
                  }}
                  className="text-xs text-sepia hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Submit another candid photo</span>
                </button>
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