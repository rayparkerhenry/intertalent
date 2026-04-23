'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CreatePropertyContactModal } from '@/components/admin/CreatePropertyContactModal';
import { DeletePropertyContactModal } from '@/components/admin/DeletePropertyContactModal';
import { EditPropertyContactModal } from '@/components/admin/EditPropertyContactModal';
import type {
  ApiErrorResponse,
  PropertyContact,
  PropertyContactListResponse,
} from '@/types/admin';

function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type PropertyContactsSectionProps = {
  propertyId: number;
  propertyName: string;
};

export function PropertyContactsSection({
  propertyId,
  propertyName,
}: PropertyContactsSectionProps) {
  const [contacts, setContacts] = useState<PropertyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContact, setEditContact] = useState<PropertyContact | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PropertyContact | null>(
    null
  );

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/properties/${propertyId}/contacts`
      );
      const json = (await res.json()) as
        | PropertyContactListResponse
        | ApiErrorResponse;
      if (!json.success) {
        setContacts([]);
        return;
      }
      setContacts(json.data);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  return (
    <>
      <div className="border-t border-gray-100 bg-gray-50/30 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            👥 Contacts
            {contacts.length > 0 ? ` (${contacts.length})` : ''}
          </span>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            + Add
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            <div className="h-8 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-full animate-pulse rounded bg-gray-200" />
          </div>
        ) : contacts.length === 0 ? (
          <p className="py-1 text-xs italic text-gray-400">
            No contacts added yet
          </p>
        ) : (
          <div>
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 border-b border-gray-100 py-1.5 last:border-b-0"
              >
                {c.profile_image ? (
                  <img
                    src={c.profile_image}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-900"
                    aria-hidden
                  >
                    {contactInitials(c.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-900">
                    {c.name}
                  </p>
                  {c.title ? (
                    <p className="text-xs italic text-gray-500">{c.title}</p>
                  ) : null}
                  {c.mobile ? (
                    <p className="text-xs text-gray-600">{c.mobile}</p>
                  ) : null}
                  {c.email ? (
                    <p className="truncate text-xs text-gray-600">{c.email}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditContact(c);
                      setShowEditModal(true);
                    }}
                    className="rounded border border-orange-500 p-1 text-orange-600 hover:bg-orange-50"
                    aria-label="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(c);
                      setShowDeleteModal(true);
                    }}
                    className="rounded border border-red-500 p-1 text-red-600 hover:bg-red-50"
                    aria-label="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreatePropertyContactModal
        isOpen={showCreateModal}
        propertyId={propertyId}
        propertyName={propertyName}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(contact) => {
          setContacts((prev) =>
            [...prev, contact].sort((a, b) =>
              a.name.localeCompare(b.name, undefined, {
                sensitivity: 'base',
              })
            )
          );
        }}
      />

      <EditPropertyContactModal
        isOpen={showEditModal}
        contact={editContact}
        propertyName={propertyName}
        onClose={() => {
          setShowEditModal(false);
          setEditContact(null);
        }}
        onSuccess={(updated) => {
          setContacts((prev) =>
            prev
              .map((x) => (x.id === updated.id ? updated : x))
              .sort((a, b) =>
                a.name.localeCompare(b.name, undefined, {
                  sensitivity: 'base',
                })
              )
          );
        }}
      />

      <DeletePropertyContactModal
        isOpen={showDeleteModal}
        contact={deleteTarget}
        propertyName={propertyName}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onSuccess={(contactId) => {
          setContacts((prev) => prev.filter((x) => x.id !== contactId));
        }}
      />
    </>
  );
}
