'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/admin/ToastContext';
import type {
  ApiErrorResponse,
  PropertyContact,
  PropertyContactMutationResponse,
} from '@/types/admin';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

function validateImageFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return 'File too large — maximum size is 5 MB';
  }
  const lower = file.name.toLowerCase();
  const ok = ALLOWED_EXT.some((ext) => lower.endsWith(ext));
  if (!ok) {
    return 'Unsupported file type — use .jpg, .png, or .webp';
  }
  return null;
}

function fileNameFromPublicPath(path: string | null): string | null {
  if (!path) return null;
  const seg = path.split('/').filter(Boolean).pop();
  return seg ?? null;
}

type FieldKey = 'name' | 'email' | 'profile' | 'general';
type FormErrors = Partial<Record<FieldKey, string>>;

type EditPropertyContactModalProps = {
  isOpen: boolean;
  contact: PropertyContact | null;
  propertyName: string;
  onClose: () => void;
  onSuccess: (contact: PropertyContact) => void;
};

export function EditPropertyContactModal(
  props: EditPropertyContactModalProps
) {
  const { isOpen, contact, onClose, onSuccess } = props;
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profileKey, setProfileKey] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const resetFromContact = useCallback(() => {
    if (!contact) return;
    setName(contact.name);
    setMobile(contact.mobile ?? '');
    setTitle(contact.title ?? '');
    setEmail(contact.email ?? '');
    setProfileFile(null);
    setProfileKey((k) => k + 1);
    setErrors({});
    setSubmitting(false);
  }, [contact]);

  useEffect(() => {
    if (isOpen && contact) {
      resetFromContact();
    }
  }, [isOpen, contact, resetFromContact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;

    setErrors({});
    setSubmitting(true);

    if (profileFile) {
      const fileErr = validateImageFile(profileFile);
      if (fileErr) {
        setErrors({ profile: fileErr });
        setSubmitting(false);
        return;
      }
    }

    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('title', title.trim());
      fd.append('mobile', mobile.trim());
      fd.append('email', email.trim());
      if (profileFile) {
        fd.append('profile_image', profileFile);
      }

      const res = await fetch(`/api/admin/property-contacts/${contact.id}`, {
        method: 'PUT',
        body: fd,
      });

      const json = (await res.json()) as
        | PropertyContactMutationResponse
        | ApiErrorResponse;

      if (!json.success) {
        if (json.error === 'MISSING_NAME') {
          setErrors({ name: 'Full name is required.' });
        } else if (json.error === 'INVALID_EMAIL') {
          setErrors({ email: 'Please enter a valid email address.' });
        } else if (json.error === 'FIELD_TOO_LONG') {
          setErrors({
            general: 'One or more fields exceed the maximum length.',
          });
        } else if (json.error === 'FILE_TOO_LARGE') {
          setErrors({
            profile: 'File too large — maximum size is 5 MB',
          });
        } else if (json.error === 'UNSUPPORTED_FILE_TYPE') {
          setErrors({
            profile: 'Unsupported file type — use .jpg, .png, or .webp',
          });
        } else if (json.error === 'INVALID_FORM_DATA') {
          setErrors({ general: 'Invalid form data. Please try again.' });
        } else if (json.error === 'PROPERTY_CONTACT_NOT_FOUND') {
          showToast('This contact no longer exists.', 'warning');
          onClose();
        } else {
          showToast('Failed to save — please try again', 'error');
        }
        setSubmitting(false);
        return;
      }

      showToast('Contact updated successfully', 'success');
      onSuccess(json.data);
      onClose();
    } catch {
      showToast('Failed to save — please try again', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !contact) return null;

  const hasErrors = Object.keys(errors).length > 0;
  const currentFileLabel = fileNameFromPublicPath(contact.profile_image);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-property-contact-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="edit-property-contact-title"
          className="mb-4 text-lg font-bold text-gray-900"
        >
          ✏️ Edit Property Contact
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
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sales Associate"
              maxLength={100}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mobile Number
            </label>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email Address
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
              Profile Photo
            </label>
            {contact.profile_image ? (
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-xs font-semibold text-sky-900">
                  <img
                    src={contact.profile_image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  {currentFileLabel ? (
                    <span className="inline-block rounded-md bg-sky-100 px-2 py-1 text-xs font-medium text-sky-900">
                      Current: {currentFileLabel}
                    </span>
                  ) : null}
                  <p className="mt-1 text-xs text-gray-500">
                    Upload new to replace, or leave blank to keep
                  </p>
                </div>
              </div>
            ) : (
              <p className="mb-2 text-xs text-gray-500">
                Upload new to replace, or leave blank to keep
              </p>
            )}

            <input
              key={profileKey}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setProfileFile(f ?? null);
                if (f) {
                  const err = validateImageFile(f);
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (err) next.profile = err;
                    else delete next.profile;
                    return next;
                  });
                } else {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.profile;
                    return next;
                  });
                }
              }}
              className={`w-full cursor-pointer rounded-md border bg-[#F5F5F0] px-2 py-2 text-sm text-gray-900 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700 ${
                errors.profile ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500">
              .jpg .png .webp - max 5 MB
              {profileFile ? (
                <span className="ml-2 text-gray-700">{profileFile.name}</span>
              ) : null}
            </p>
            {errors.profile ? (
              <p className="mt-1 text-xs text-red-600">{errors.profile}</p>
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
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
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
  );
}
