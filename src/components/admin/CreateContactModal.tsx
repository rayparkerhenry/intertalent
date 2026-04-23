'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/admin/ToastContext';
import type {
  ApiErrorResponse,
  ContactMutationResponse,
  Property,
  PropertyContactMutationResponse,
  PropertyListResponse,
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

type FieldKey = 'name' | 'email' | 'profile' | 'general';
type FormErrors = Partial<Record<FieldKey, string>>;

type CreateContactModalProps = {
  isOpen: boolean;
  clientId: number | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreateContactModal({
  isOpen,
  clientId,
  onClose,
  onSuccess,
}: CreateContactModalProps) {
  const { showToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    null
  );
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profileKey, setProfileKey] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setSelectedPropertyId(null);
    setName('');
    setTitle('');
    setMobile('');
    setEmail('');
    setProfileFile(null);
    setProfileKey((k) => k + 1);
    setErrors({});
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen || clientId === null) {
      setProperties([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/properties`);
        const json = (await res.json()) as PropertyListResponse | ApiErrorResponse;
        if (cancelled) return;
        if (!json.success) {
          setProperties([]);
          return;
        }
        setProperties(json.data);
      } catch {
        if (!cancelled) setProperties([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientId === null) return;

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

      const url =
        selectedPropertyId === null
          ? `/api/admin/clients/${clientId}/contacts`
          : `/api/admin/properties/${selectedPropertyId}/contacts`;

      const res = await fetch(url, {
        method: 'POST',
        body: fd,
      });

      const json = (await res.json()) as
        | ContactMutationResponse
        | PropertyContactMutationResponse
        | ApiErrorResponse;

      if (!json.success) {
        if (json.error === 'CONTACT_NAME_EXISTS') {
          setErrors({
            name: 'A contact with this name already exists for this client.',
          });
        } else if (json.error === 'MISSING_NAME') {
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
        } else if (json.error === 'PROPERTY_NOT_FOUND') {
          showToast('This property was not found.', 'warning');
          onClose();
        } else {
          showToast('Failed to save — please try again', 'error');
        }
        setSubmitting(false);
        return;
      }

      showToast('Contact created successfully', 'success');
      onSuccess();
      onClose();
    } catch {
      showToast('Failed to save — please try again', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || clientId === null) return null;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-contact-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="create-contact-title"
          className="mb-4 text-lg font-bold text-gray-900"
        >
          👤 Add Support Contact
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
              placeholder="e.g. Sarah Johnson"
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
              Assign to
            </label>
            <select
              value={selectedPropertyId ?? ''}
              onChange={(e) =>
                setSelectedPropertyId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">Client Level (no property)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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
              placeholder="(555) 123-4567"
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
              placeholder="sarah.j@intersolutions.com"
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
              .jpg .png .webp - max 5 MB. If not uploaded, initials will be
              shown.
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
              Save Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
