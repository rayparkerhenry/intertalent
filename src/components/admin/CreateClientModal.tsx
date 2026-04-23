'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ColorPickerInput } from '@/components/admin/ColorPickerInput';
import { useToast } from '@/components/admin/ToastContext';
import type {
  ApiErrorResponse,
  Client,
  ClientMutationResponse,
} from '@/types/admin';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
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

type FieldKey =
  | 'name'
  | 'slug'
  | 'logo'
  | 'hero'
  | 'general';

type FormErrors = Partial<Record<FieldKey, string>>;

type CreateClientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newClient: Client) => void;
};

export function CreateClientModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateClientModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1A3C5E');
  const [secondaryColor, setSecondaryColor] = useState('#F5A623');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [logoKey, setLogoKey] = useState(0);
  const [heroKey, setHeroKey] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setSlug('');
    setPrimaryColor('#1A3C5E');
    setSecondaryColor('#F5A623');
    setLogoFile(null);
    setHeroFile(null);
    setLogoKey((k) => k + 1);
    setHeroKey((k) => k + 1);
    setErrors({});
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const validateAll = (): FormErrors => {
    const next: FormErrors = {};
    if (!name.trim()) {
      next.name = 'Client name is required';
    }
    if (!slug.trim()) {
      next.slug = 'URL slug is required';
    } else if (!SLUG_REGEX.test(slug.trim())) {
      next.slug =
        'Slug must be lowercase letters, numbers, and hyphens only';
    }
    if (logoFile) {
      const err = validateImageFile(logoFile);
      if (err) next.logo = err;
    }
    if (heroFile) {
      const err = validateImageFile(heroFile);
      if (err) next.hero = err;
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateAll();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    setErrors({});

    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('slug', slug.trim());
    fd.append('primary_color', primaryColor);
    fd.append('secondary_color', secondaryColor);
    if (logoFile) fd.append('logo', logoFile);
    if (heroFile) fd.append('hero', heroFile);

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        body: fd,
      });
      const json = (await res.json()) as ClientMutationResponse | ApiErrorResponse;

      if (!json.success) {
        if (json.error === 'SLUG_ALREADY_EXISTS') {
          setErrors({
            slug:
              'This slug is already taken — please choose a different one',
          });
        } else if (json.error === 'MISSING_REQUIRED_FIELDS') {
          setErrors({ general: 'Please fill all required fields.' });
        } else if (json.error === 'INVALID_SLUG_FORMAT') {
          setErrors({
            slug:
              'Slug must be lowercase letters, numbers, and hyphens only',
          });
        } else if (json.error === 'FILE_TOO_LARGE') {
          const e: FormErrors = {};
          if (logoFile) e.logo = 'File too large — maximum size is 5 MB';
          if (heroFile) e.hero = 'File too large — maximum size is 5 MB';
          setErrors(e);
        } else if (json.error === 'UNSUPPORTED_FILE_TYPE') {
          const e: FormErrors = {};
          if (logoFile) {
            e.logo =
              'Unsupported file type — use .jpg, .png, or .webp';
          }
          if (heroFile) {
            e.hero =
              'Unsupported file type — use .jpg, .png, or .webp';
          }
          setErrors(e);
        } else {
          showToast('Failed to save — please try again', 'error');
        }
        setSubmitting(false);
        return;
      }

      showToast('Client portal created successfully', 'success');
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
        aria-labelledby="create-client-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="create-client-title"
          className="mb-4 text-lg font-bold text-gray-900"
        >
          ✨ Create New Client Portal
        </h2>

        {hasErrors ? (
          <div className="mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900">
            Please fix the errors below before continuing.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Greystar Real Estate"
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
              URL Slug (subdomain) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
              }
              placeholder="greystar (lowercase, hyphens only)"
              className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 ${
                errors.slug ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.slug ? (
              <p className="mt-1 text-xs text-red-600">{errors.slug}</p>
            ) : null}
            <div className="mt-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700">
              Portal URL:{' '}
              <span className="font-semibold text-sky-800">
                {slug.trim() ? slug.trim() : '{slug}'}
              </span>
              .intertalent.intersolutions.com
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ColorPickerInput
              label="Primary Color"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorPickerInput
              label="Secondary Color"
              value={secondaryColor}
              onChange={setSecondaryColor}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Client Logo (image file)
            </label>
            <input
              key={logoKey}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setLogoFile(f ?? null);
                if (f) {
                  const err = validateImageFile(f);
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (err) next.logo = err;
                    else delete next.logo;
                    return next;
                  });
                } else {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.logo;
                    return next;
                  });
                }
              }}
              className={`w-full cursor-pointer rounded-md border bg-[#F5F5F0] px-2 py-2 text-sm text-gray-900 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700 ${
                errors.logo ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500">
              .jpg .png .webp - max 5 MB
              {logoFile ? (
                <span className="ml-2 text-gray-700">
                  {logoFile.name} (
                  {(logoFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PNG with transparent background recommended. Horizontal: 200×80px
              · Square: 200×200px
            </p>
            {errors.logo ? (
              <p className="mt-1 text-xs text-red-600">{errors.logo}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hero Banner Image
            </label>
            <input
              key={heroKey}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setHeroFile(f ?? null);
                if (f) {
                  const err = validateImageFile(f);
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (err) next.hero = err;
                    else delete next.hero;
                    return next;
                  });
                } else {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.hero;
                    return next;
                  });
                }
              }}
              className={`w-full cursor-pointer rounded-md border bg-[#F5F5F0] px-2 py-2 text-sm text-gray-900 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700 ${
                errors.hero ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500">
              .jpg .png .webp - max 5 MB
              {heroFile ? (
                <span className="ml-2 text-gray-700">
                  {heroFile.name} (
                  {(heroFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Recommended: 1920×600px, JPG or WebP. Place main subject in center or
              left of image.
            </p>
            {errors.hero ? (
              <p className="mt-1 text-xs text-red-600">{errors.hero}</p>
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
              Create Portal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
