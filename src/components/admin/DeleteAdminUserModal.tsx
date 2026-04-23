'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/admin/ToastContext';
import type { AdminUser, ApiErrorResponse, DeleteAdminUserResponse } from '@/types/admin';

type DeleteAdminUserModalProps = {
  isOpen: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: (userId: number) => void;
};

export function DeleteAdminUserModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: DeleteAdminUserModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as
        | DeleteAdminUserResponse
        | ApiErrorResponse;

      if (!json.success) {
        if (json.error === 'CANNOT_DELETE_LAST_SUPER_ADMIN') {
          showToast(
            'Cannot delete the last super admin account',
            'error'
          );
        } else {
          showToast('Failed to delete — please try again', 'error');
        }
        setSubmitting(false);
        return;
      }

      showToast('Admin user deleted successfully', 'success');
      onSuccess(user.id);
      onClose();
    } catch {
      showToast('Failed to delete — please try again', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-admin-user-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl text-gray-600">
            🗑
          </div>
        </div>
        <h2
          id="delete-admin-user-title"
          className="mb-2 text-center text-lg font-bold text-gray-900"
        >
          Delete Admin User?
        </h2>
        <p className="mb-4 text-center text-sm text-gray-600">
          You are about to delete{' '}
          <span className="font-semibold text-gray-900">{user.name}</span>.
        </p>
        <div className="mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900">
          This will permanently remove their access to the admin portal.
        </div>
        <hr className="mb-4 border-gray-200" />
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
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            ) : null}
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}
