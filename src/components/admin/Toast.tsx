'use client';

import React, { useEffect, useState } from 'react';

export type ToastItem = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
};

type ToastProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

const STYLES: Record<
  ToastItem['type'],
  { box: string; icon: string; symbol: string }
> = {
  success: {
    box: 'border-green-600 bg-green-50 text-green-900',
    icon: 'text-green-800',
    symbol: '✓',
  },
  error: {
    box: 'border-red-600 bg-red-50 text-red-900',
    icon: 'text-red-800',
    symbol: '✕',
  },
  warning: {
    box: 'border-orange-600 bg-orange-50 text-orange-900',
    icon: 'text-orange-800',
    symbol: '⚠',
  },
  info: {
    box: 'border-blue-600 bg-blue-50 text-blue-900',
    icon: 'text-blue-800',
    symbol: 'i',
  },
};

function ToastRow({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [phase, setPhase] = useState<'visible' | 'exiting'>('visible');
  const style = STYLES[item.type];

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase('exiting'), 2700);
    const removeTimer = window.setTimeout(() => onDismiss(item.id), 3000);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [item.id, onDismiss]);

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border p-4 shadow-sm transition-opacity duration-300 ease-out ${
        style.box
      } ${phase === 'exiting' ? 'opacity-0' : 'opacity-100'}`}
    >
      <span
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center text-sm font-semibold ${style.icon}`}
        aria-hidden
      >
        {item.type === 'info' ? (
          <span className="font-bold">i</span>
        ) : (
          style.symbol
        )}
      </span>
      <p className="text-sm leading-snug">{item.message}</p>
    </div>
  );
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2">
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastRow item={item} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
