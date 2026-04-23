'use client';

import React, { useEffect, useRef } from 'react';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

type ColorPickerInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function ColorPickerInput({
  label,
  value,
  onChange,
}: ColorPickerInputProps) {
  const lastValid = useRef<string>(
    HEX_RE.test(value) ? value : '#1A3C5E'
  );

  useEffect(() => {
    if (HEX_RE.test(value)) {
      lastValid.current = value;
    }
  }, [value]);

  const swatchColor = HEX_RE.test(value) ? value : lastValid.current;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative h-[34px] w-[34px] shrink-0">
          <div
            className="h-[34px] w-[34px] rounded-md border border-gray-300 shadow-inner"
            style={{ backgroundColor: swatchColor }}
            aria-hidden
          />
          <input
            type="color"
            value={swatchColor}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} picker`}
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          placeholder="#1A3C5E"
        />
      </div>
    </div>
  );
}
