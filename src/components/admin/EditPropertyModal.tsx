'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/admin/ToastContext';
import type {
  ApiErrorResponse,
  Property,
  PropertyMutationResponse,
} from '@/types/admin';

type FieldKey = 'name' | 'general';
type FormErrors = Partial<Record<FieldKey, string>>;

type EditPropertyModalProps = {
  isOpen: boolean;
  property: Property | null;
  onClose: () => void;
  onSuccess: (property: Property) => void;
};

export function EditPropertyModal({
  isOpen,
  property,
  onClose,
  onSuccess,
}: EditPropertyModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const resetFromProperty = useCallback(() => {
    if (!property) return;
    setName(property.name);
    setAddress(property.address);
    setCity(property.city);
    setState(property.state);
    setZip(property.zip);
    setErrors({});
    setSubmitting(false);
  }, [property]);

  useEffect(() => {
    if (isOpen && property) {
      resetFromProperty();
    }
  }, [isOpen, property, resetFromProperty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;

    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/properties/${property.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zip: zip.trim() || undefined,
        }),
      });

      const json = (await res.json()) as
        | PropertyMutationResponse
        | ApiErrorResponse;

      if (!json.success) {
        if (json.error === 'PROPERTY_NAME_EXISTS') {
          setErrors({
            name: 'Another property with this name already exists for this client.',
          });
        } else if (
          json.error === 'MISSING_NAME' ||
          json.error === 'INVALID_STATE' ||
          json.error === 'INVALID_ZIP' ||
          json.error === 'FIELD_TOO_LONG'
        ) {
          const messages: Record<string, string> = {
            MISSING_NAME: 'Property name is required.',
            INVALID_STATE: 'State must be 2 letters (e.g. TX).',
            INVALID_ZIP: 'ZIP must be exactly 5 digits.',
            FIELD_TOO_LONG: 'One or more fields exceed the maximum length.',
          };
          setErrors({ general: messages[json.error] ?? 'Invalid input.' });
        } else if (json.error === 'PROPERTY_NOT_FOUND') {
          showToast('This property no longer exists.', 'warning');
          onClose();
        } else {
          showToast('Failed to save — please try again', 'error');
        }
        setSubmitting(false);
        return;
      }

      showToast('Property updated successfully', 'success');
      onSuccess(json.data);
      onClose();
    } catch {
      showToast('Failed to save — please try again', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !property) return null;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-property-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="edit-property-title"
          className="mb-4 text-lg font-bold text-gray-900"
        >
          ✏️ Edit Property
        </h2>

        {hasErrors ? (
          <div className="mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900">
            Please fix the errors below before continuing.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
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
              Street address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) =>
                  setState(e.target.value.toUpperCase().slice(0, 2))
                }
                placeholder="TX"
                maxLength={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">2-letter code</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ZIP
            </label>
            <input
              type="text"
              value={zip}
              onChange={(e) =>
                setZip(e.target.value.replace(/\D/g, '').slice(0, 5))
              }
              placeholder="12345"
              maxLength={5}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">5 digits</p>
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
  );
}
