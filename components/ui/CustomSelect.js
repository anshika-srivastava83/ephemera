'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  label = '',
  error = '',
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard accessibility
  function handleKeyDown(e) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => (typeof opt === 'string' ? opt : opt.value) === value);
        if (currentIndex < options.length - 1) {
          const next = options[currentIndex + 1];
          onChange(typeof next === 'string' ? next : next.value);
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        const currentIndex = options.findIndex((opt) => (typeof opt === 'string' ? opt : opt.value) === value);
        if (currentIndex > 0) {
          const prev = options[currentIndex - 1];
          onChange(typeof prev === 'string' ? prev : prev.value);
        }
      }
    }
  }

  const selectedOption = options.find((opt) => (typeof opt === 'string' ? opt : opt.value) === value);
  const displayLabel = selectedOption
    ? typeof selectedOption === 'string'
      ? selectedOption
      : selectedOption.label
    : placeholder;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs uppercase tracking-wider font-semibold text-ink/80 mb-1.5">
          {label}
        </label>
      )}

      {/* Select trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm bg-ivory border transition-all text-left outline-none ${
          error
            ? 'border-red-400 focus:ring-2 focus:ring-red-200'
            : isOpen
            ? 'border-sepia shadow-sm ring-2 ring-sepia/15'
            : 'border-ink/15 hover:border-ink/30 focus:border-sepia focus:ring-2 focus:ring-sepia/15'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-100' : 'cursor-pointer'}`}
      >
        <span className={value ? 'text-ink font-medium' : 'text-ink-faint'}>
          {displayLabel}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sepia' : ''
          }`}
        />
      </button>

      {/* Custom Dropdown Menu */}
      {isOpen && (
        <ul
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-auto rounded-xl bg-ivory border border-ink/15 shadow-xl py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150"
        >
          {options.map((opt, i) => {
            const optVal = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            const isSelected = optVal === value;

            return (
              <li
                key={i}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(optVal);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-sepia/10 text-sepia-dark font-medium'
                    : 'text-ink hover:bg-paper-light'
                }`}
              >
                <span>{optLabel}</span>
                {isSelected && <Check className="w-4 h-4 text-sepia" />}
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-xs text-red-600 mt-1 font-light">{error}</p>}
    </div>
  );
}
