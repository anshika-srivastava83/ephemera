'use client';

import { QRCodeSVG } from 'qrcode.react';
import { FlourishDivider } from './Ornament';

export function PrintableTableCard({ eventName, guestSubmitUrl, className = '' }) {
  return (
    <div
      id="printable-card"
      className={`bg-[#FAF7F0] border-2 border-sepia/30 rounded-2xl p-6 sm:p-7 text-center shadow-sm relative mx-auto max-w-xs ${className}`}
    >
      {/* Mehfil Calligraphy Logo */}
      <div className="flex justify-center mb-3">
        <img
          src="/logo.png"
          alt="Mehfil"
          className="h-10 sm:h-12 w-auto object-contain"
        />
      </div>

      <span className="eyebrow-ornate mb-3 text-[10px]">Scan & send your photo</span>
      <span className="font-editorial text-2xl block text-ink mb-2 truncate px-2 font-normal">
        {eventName || 'Our Celebration'}
      </span>
      <FlourishDivider className="mx-auto mb-4" width={150} />

      <div className="p-3 bg-white rounded-2xl inline-block shadow-sm border border-ink/10 mb-4 mx-auto">
        <QRCodeSVG
          value={guestSubmitUrl || ''}
          size={208}
          level="M"
          includeMargin
          bgColor="#ffffff"
          fgColor="#25231F"
          className="mx-auto block w-[208px] h-[208px] max-w-full"
        />
      </div>

      <p className="font-caption text-xl text-ink-muted leading-tight mb-3">
        Point your camera.<br />Your photo will show up on the big screen!
      </p>

      <div className="border-t border-sepia/20 pt-2.5 mt-2 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider text-sepia/80 font-medium">
        <span>Instant Live Wall</span>
        <span>•</span>
        <span>No App Needed</span>
      </div>
    </div>
  );
}
