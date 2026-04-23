'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/admin/ToastContext';
import type {
  ApiErrorResponse,
  Client,
  DeleteClientResponse,
} from '@/types/admin';

type DeleteClientModalProps = {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onSuccess: (deletedId: number) => void;
};

export function DeleteClientModal({
  isOpen,
  client,
  onClose,
  onSuccess,
}: DeleteClientModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !client) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as DeleteClientResponse | ApiErrorResponse;

      if (!json.success) {
        showToast('Failed to save — please try again', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Client deleted successfully', 'success');
      onSuccess(client.id);
      onClose();
    } catch {
      showToast('Failed to save — please try again', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-client-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl text-gray-600">
            🗑
          </div>
        </div>
        <h2
          id="delete-client-title"
          className="mb-2 text-center text-lg font-bold text-gray-900"
        >
          Delete Client Portal?
        </h2>
        <p className="mb-4 text-center text-sm text-gray-600">
          You are about to delete{' '}
          <span className="font-semibold text-gray-900">{client.name}</span>.
        </p>
        <div className="mb-4 border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-900">
          This will permanently delete all associated properties, contacts,
          and uploaded image files. This action cannot be undone.
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
