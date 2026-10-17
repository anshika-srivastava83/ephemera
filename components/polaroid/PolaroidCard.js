'use client';

export function PolaroidCard({
  photoUrl,
  polaroidUrl,
  caption = '',
  rotation = 0,
  scale = 1,
  className = '',
  style = {},
  onClick = null,
  priority = false,
  darkroom = false,
  showPin = false,
}) {
  const displayImage = polaroidUrl || photoUrl;
  // Guest submissions store a fully composed Polaroid (frame + caption baked in).
  // Show those as-is; only raw photos get the CSS frame and live caption.
  const isComposed = Boolean(polaroidUrl) && polaroidUrl !== photoUrl;

  if (isComposed) {
    return (
      <div
        onClick={onClick}
        className={`polaroid-print select-none transition-transform duration-300 ${
          darkroom ? 'darkroom-polaroid' : ''
        } ${onClick ? 'cursor-pointer hover:z-30' : ''} ${className}`}
        style={{ transform: `rotate(${rotation}deg) scale(${scale})`, ...style }}
      >
        {showPin && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-sepia shadow-sm border border-amber-200/40 z-20" />
        )}
        <img
          src={polaroidUrl}
          alt={caption || 'Polaroid photograph'}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable="false"
          className="w-full h-full object-cover block"
        />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`polaroid-frame select-none transition-transform duration-300 ${
        darkroom ? 'darkroom-polaroid' : ''
      } ${onClick ? 'cursor-pointer hover:z-30' : ''} ${className}`}
      style={{
        transform: `rotate(${rotation}deg) scale(${scale})`,
        ...style,
      }}
    >
      {/* Decorative brass pushpin for physical feeling */}
      {showPin && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-sepia shadow-sm border border-amber-200/40 z-20" />
      )}

      {/* If we already have a pre-composited Polaroid image, we can render it directly or show the frame structure */}
      <div className="polaroid-photo-inner">
        {displayImage ? (
          <img
            src={displayImage}
            alt={caption || 'Polaroid photograph'}
            loading={priority ? 'eager' : 'lazy'}
            draggable="false"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-900 text-stone-500 text-xs">
            Awaiting light...
          </div>
        )}
      </div>

      {caption && (
        <p className="polaroid-caption-text">
          {caption}
        </p>
      )}
    </div>
  );
}
