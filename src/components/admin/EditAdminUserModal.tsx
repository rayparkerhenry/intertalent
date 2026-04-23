'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/admin/ToastContext';
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal';
import type {
  AdminUser,
  AdminUserMutationResponse,
  ApiErrorResponse,
} from '@/types/admin';

type FieldKey = 'name' | 'email' | 'role' | 'general';
type FormErrors = Partial<Record<FieldKey, string>>;

type EditAdminUserModalProps = {
  isOpen: boolean;
  user: AdminUser | null;
  currentUserId: string | undefined;
  onClose: () => void;
  onSuccess: (user: AdminUser) => void;
};

export function EditAdminUserModal({
  isOpen,
  user,
  currentUserId,
  onClose,
  onSuccess,
}: EditAdminUserModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const isOwnUser =
    user != null &&
    currentUserId != null &&
    String(user.id) === String(currentUserId);

  const resetFromUser = useCallback(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setRole(user.role === 'super_admin' ? 'super_admin' : 'admin');
    setIsActive(user.is_active);
    setErrors({});
    setSubmitting(false);
    setShowPasswordModal(false);
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      resetFromUser();
    }
  }, [isOpen, user, resetFromUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setErrors({});
    setSubmitting(true);

    let bodyRole = role;
    let bodyActive = isActive;
    if (isOwnUser) {
      bodyRole = user.role === 'super_admin' ? 'super_admin' : 'admin';
      bodyActive = user.is_active;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role: bodyRole,
          is_active: bodyActive,
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
        } else if (err === 'USER_NOT_FOUND') {
          showToast('This user no longer exists.', 'warning');
          onClose();
        } else {
          showToast('Failed to save — please try again', 'error');
        }
        setSubmitting(false);
        return;
      }

      showToast('Admin user updated successfully', 'success');
      onSuccess(json.data);
      onClose();
    } catch {
      showToast('Failed to save — please try again', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !user) return null;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-admin-user-title"
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        >
          <h2
            id="edit-admin-user-title"
            className="mb-4 text-lg font-bold text-gray-900"
          >
            ✏️ Edit Admin User
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
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                disabled={isOwnUser}
                title={
                  isOwnUser
                    ? 'You cannot change your own role'
                    : undefined
                }
                onChange={(e) =>
                  setRole(e.target.value as 'admin' | 'super_admin')
                }
                className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70 ${
                  errors.role ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              {isOwnUser ? (
                <p className="mt-1 text-xs text-gray-500">
                  Your role cannot be changed here.
                </p>
              ) : null}
              {errors.role ? (
                <p className="mt-1 text-xs text-red-600">{errors.role}</p>
              ) : null}
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white hover:bg-gray-700'
                      : 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  disabled={isOwnUser}
                  title={
                    isOwnUser
                      ? 'You cannot deactivate your own account here'
                      : undefined
                  }
                  onClick={() => setIsActive(false)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    !isActive
                      ? 'bg-gray-900 text-white hover:bg-gray-700'
                      : 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Inactive
                </button>
              </div>
              {isOwnUser ? (
                <p className="mt-1 text-xs text-gray-500">
                  You cannot set your own account to inactive.
                </p>
              ) : null}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="text-sm font-medium text-gray-800 underline hover:text-gray-900"
              >
                🔑 Change Password
              </button>
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
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        user={user}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {}}
      />
    </>
  );
}
