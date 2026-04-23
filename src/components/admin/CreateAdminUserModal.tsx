'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/admin/ToastContext';
import type {
  AdminUser,
  AdminUserMutationResponse,
  ApiErrorResponse,
} from '@/types/admin';

type FieldKey = 'name' | 'email' | 'password' | 'role' | 'general';
type FormErrors = Partial<Record<FieldKey, string>>;

type CreateAdminUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AdminUser) => void;
};

export function CreateAdminUserModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAdminUserModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('admin');
    setErrors({});
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const json = (await res.json()) as
        | AdminUserMutationResponse
        | ApiErrorResponse;

      if (!json.success) {
        const err = json.error;
        if (err === 'MISSING_NAME') {
          setErrors({ name: 'Full name is required.' });
        } else if (err === 'MISSING_EMAIL') {
          setErrors({ email: 'Email address is required.' });
        } else if (err === 'INVALID_EMAIL') {
          setErrors({ email: 'Please enter a valid email address.' });
        } else if (err === 'MISSING_PASSWORD') {
          setErrors({ password: 'Password is required.' });
        } else if (err === 'PASSWORD_TOO_SHORT') {
          setErrors({
            password: 'Password must be at least 8 characters.',
          });
        } else if (err === 'PASSWORD_TOO_LONG') {
          setErrors({ password: 'Password is too long.' });
        } else if (err === 'EMAIL_ALREADY_EXISTS') {
          setErrors({
            email: 'An admin with this email already exists.',
          });
        } else if (err === 'FIELD_TOO_LONG') {
          setErrors({
            general: 'One or more fields exceed the maximum length.',
          });
        } else if (err === 'INVALID_ROLE') {
          setErrors({ general: 'Invalid role selected.' });
        } else if (err === 'INVALID_JSON') {
          setErrors({ general: 'Invalid request. Please try again.' });
        } else {
          showToast('Failed to save — please try again', 'error');
        }
        setSubmitting(false);
        return;
      }

      showToast('Admin user created successfully', 'success');
      onSuccess(json.data);
      onClose();
    } catch {
      showToast('Failed to save — please try again', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-admin-user-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="create-admin-user-title"
          className="mb-4 text-lg font-bold text-gray-900"
        >
          👤 Add Admin User
        </h2>

        {hasErrors ? (
          <div className="mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900">
            Please fix the errors below before continuing.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>
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
            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as 'admin' | 'super_admin')
              }
              className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 ${
                errors.role ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            {errors.role ? (
              <p className="mt-1 text-xs text-red-600">{errors.role}</p>
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
              Save User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
