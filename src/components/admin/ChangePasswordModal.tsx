'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/admin/ToastContext';
import type { AdminUser, ApiErrorResponse } from '@/types/admin';

type FieldKey = 'password' | 'confirm' | 'general';
type FormErrors = Partial<Record<FieldKey, string>>;

type ChangePasswordModalProps = {
  isOpen: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function ChangePasswordModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setPassword('');
    setConfirm('');
    setErrors({});
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setErrors({});
    const next: FormErrors = {};
    if (!password.trim()) {
      next.password = 'Password is required.';
    }
    if (!confirm.trim()) {
      next.confirm = 'Please confirm your password.';
    }
    if (password.length > 0 && password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (password && confirm && password !== confirm) {
      next.confirm = 'Passwords do not match.';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const json = (await res.json()) as
        | { success: true; message: string }
        | ApiErrorResponse;

      if (!json.success) {
        if (json.error === 'PASSWORD_TOO_SHORT') {
          setErrors({
            password: 'Password must be at least 8 characters.',
          });
        } else if (json.error === 'PASSWORD_TOO_LONG') {
          setErrors({ password: 'Password is too long.' });
        } else if (json.error === 'MISSING_PASSWORD') {
          setErrors({ password: 'Password is required.' });
        } else if (json.error === 'USER_NOT_FOUND') {
          showToast('User no longer exists.', 'warning');
          onClose();
        } else {
          showToast('Failed to update password — please try again', 'error');
        }
        setSubmitting(false);
        return;
      }

      showToast('Password updated successfully', 'success');
      onSuccess();
      onClose();
    } catch {
      showToast('Failed to update password — please try again', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !user) return null;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="change-password-title"
          className="mb-1 text-lg font-bold text-gray-900"
        >
          🔑 Change Password
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          For <span className="font-semibold text-gray-900">{user.name}</span>
        </p>

        {hasErrors ? (
          <div className="mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900">
            Please fix the errors below before continuing.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              New Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 ${
                errors.confirm ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.confirm ? (
              <p className="mt-1 text-xs text-red-600">{errors.confirm}</p>
            ) : null}
          </div>

          {errors.general ? (
            <p className="text-sm text-red-600">{errors.general}</p>
          ) : null}

          <hr className="border-gray-200" />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              ) : null}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
