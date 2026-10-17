'use client';

import { useId } from 'react';

export function InputField({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  error = '',
  helperText = '',
  icon: Icon = null,
  required = false,
  maxLength = undefined,
  className = '',
  inputClassName = '',
  disabled = false,
  ...props
}) {
  const autoId = useId();
  const id = props.id || autoId;
  const messageId = `${id}-msg`;

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={id} className="text-xs uppercase tracking-wider font-semibold text-ink/80">
            {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
          </label>
          {maxLength && (
            <span className="text-[11px] text-ink-faint">
              {String(value || '').length}/{maxLength}
            </span>
          )}
        </div>
      )}

      <div className="relative">
        {Icon && (
          <Icon className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <input
          id={id}
          type={type}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText ? messageId : undefined}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`input-editorial text-sm ${Icon ? 'pl-10' : ''} ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
              : 'border-ink/15 hover:border-ink/30 focus:border-sepia'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-100' : ''} ${inputClassName}`}
          {...props}
        />
      </div>

      {error ? (
        <p id={messageId} role="alert" className="text-xs text-red-600 mt-1 font-light">
          {error}
        </p>
      ) : helperText ? (
        <p id={messageId} className="text-[11px] text-ink-faint mt-1 font-light leading-relaxed">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
