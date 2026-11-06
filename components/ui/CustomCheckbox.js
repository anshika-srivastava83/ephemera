'use client';

import { Check } from 'lucide-react';

export function CustomCheckbox({
  checked,
  onChange,
  label,
  sublabel = '',
  disabled = false,
  className = '',
  id,
}) {
  const inputId = id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <label
      htmlFor={inputId}
      className={`inline-flex items-start gap-3 select-none cursor-pointer group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
            checked
              ? 'bg-sepia border-sepia text-white shadow-xs'
              : 'bg-ivory border-ink/20 group-hover:border-sepia/60'
          } ${disabled ? 'bg-stone-200' : ''}`}
        >
          {checked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </div>
      </div>

      <div className="flex flex-col">
        {label && <span className="text-xs text-ink font-medium leading-tight">{label}</span>}
        {sublabel && (
          <span className="text-[11px] text-ink-muted font-light leading-snug mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </label>
  );
}
