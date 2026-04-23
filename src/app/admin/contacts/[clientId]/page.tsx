'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ClientSidebar } from '@/components/admin/ClientSidebar';
import { CreateClientModal } from '@/components/admin/CreateClientModal';
import { CreateContactModal } from '@/components/admin/CreateContactModal';
import { DeleteClientModal } from '@/components/admin/DeleteClientModal';
import { DeleteContactModal } from '@/components/admin/DeleteContactModal';
import { EditContactModal } from '@/components/admin/EditContactModal';
import { ToastProvider } from '@/components/admin/ToastContext';
import { useAdminClients } from '@/hooks/useAdminClients';
import type {
  ApiErrorResponse,
  Client,
  CombinedContact,
  CombinedContactListResponse,
} from '@/types/admin';

function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const a = parts[0][0];
  const b = parts[parts.length - 1][0];
  return `${a}${b}`.toUpperCase();
}

export default function AdminContactsPage() {
  const params = useParams();
  const router = useRouter();
  const rawParam = params.clientId;
  const clientId =
    typeof rawParam === 'string' ? Number.parseInt(rawParam, 10) : NaN;

  const {
    clients,
    isLoading: loadingList,
    addClient,
    removeClient,
  } = useAdminClients();
  const [contacts, setContacts] = useState<CombinedContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteContactModal, setShowDeleteContactModal] =
    useState(false);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [deleteClientTarget, setDeleteClientTarget] = useState<Client | null>(
    null
  );
  const [editContact, setEditContact] = useState<CombinedContact | null>(null);
  const [deleteContactTarget, setDeleteContactTarget] =
    useState<CombinedContact | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const clientIdValid = Number.isFinite(clientId);
  const selectedClient = useMemo(
    () => (clientIdValid ? clients.find((c) => c.id === clientId) : undefined),
    [clients, clientId, clientIdValid]
  );

  const fetchContacts = useCallback(async (cid: number) => {
    setLoadingContacts(true);
    setContactsError(null);
    try {
      const res = await fetch(`/api/admin/clients/${cid}/all-contacts`);
      const json = (await res.json()) as
        | CombinedContactListResponse
        | ApiErrorResponse;
      if (!json.success) {
        setContacts([]);
        if (json.error === 'CLIENT_NOT_FOUND') {
          setContactsError('CLIENT_NOT_FOUND');
        } else {
          setContactsError('LOAD_FAILED');
        }
        return;
      }
      setContacts(json.data);
    } catch {
      setContacts([]);
      setContactsError('LOAD_FAILED');
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (!clientIdValid) {
      setContacts([]);
      setLoadingContacts(false);
      setContactsError(null);
      return;
    }
    void fetchContacts(clientId);
  }, [clientId, clientIdValid, fetchContacts]);

  useEffect(() => {
    if (clients.length === 0) return;
    if (!clientIdValid) return;
    if (!selectedClient) {
      router.replace(`/admin/contacts/${clients[0].id}`);
    }
  }, [clients, clientIdValid, router, selectedClient]);

  const mainNoSearchMatches =
    searchQuery.trim().length > 0 && filteredClients.length === 0;

  const handleSelectClient = (id: number) => {
    router.push(`/admin/clients/${id}`);
  };

  const openDeleteClient = (id: number) => {
    const c = clients.find((x) => x.id === id);
    if (c) {
      setDeleteClientTarget(c);
      setShowDeleteClientModal(true);
    }
  };

  const renderMain = () => {
    if (loadingList) {
      return (
        <div className="animate-pulse p-6 md:p-8">
          <div className="mb-6 h-9 w-64 max-w-full rounded bg-gray-200" />
          <div className="h-64 rounded-lg border border-gray-200 bg-gray-100" />
        </div>
      );
    }

    if (clients.length === 0) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <p className="mb-4 max-w-md text-sm text-gray-600">
            Create a client portal first, then you can add support contacts.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateClientModal(true)}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            + New Client
          </button>
        </div>
      );
    }

    if (mainNoSearchMatches) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            No matching clients
          </h1>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            Clear search
          </button>
        </div>
      );
    }

    if (!clientIdValid) {
      return (
        <div className="p-6 md:p-8">
          <p className="text-sm text-gray-600">Invalid client in URL.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm text-gray-800 hover:underline"
          >
            ← Back to branding
          </Link>
        </div>
      );
    }

    if (contactsError === 'CLIENT_NOT_FOUND') {
      return (
        <div className="p-6 md:p-8">
          <p className="text-sm text-gray-600">This client was not found.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm text-gray-800 hover:underline"
          >
            ← Back to branding
          </Link>
        </div>
      );
    }

    return (
      <div className="p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={`/admin/clients/${clientId}`}
              className="mb-3 inline-block text-sm text-gray-800 hover:underline"
            >
              ← Branding & overview
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              👥 Support Team
              {selectedClient ? ` · ${selectedClient.name}` : ''}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Showing all client and property contacts
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateContactModal(true)}
              disabled={loadingContacts}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              + Add Contact
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Support contacts
              </h2>
              <span className="text-sm text-gray-500">
                {contacts.length}{' '}
                {contacts.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>

          {loadingContacts ? (
            <div className="divide-y divide-gray-100">
              {['s1', 's2'].map((k) => (
                <div
                  key={k}
                  className="flex animate-pulse items-center gap-3 px-4 py-3"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-40 max-w-full rounded bg-gray-200" />
                    <div className="h-3 w-56 max-w-full rounded bg-gray-200" />
                  </div>
                  <div className="ml-4 hidden shrink-0 gap-2 sm:flex">
                    <div className="h-8 w-16 rounded-md bg-gray-200" />
                    <div className="h-8 w-20 rounded-md bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : contactsError ? (
            <div className="p-8 text-center text-sm text-red-600">
              Could not load contacts. Please try again.
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <span className="mb-3 text-4xl" aria-hidden>
                👥
              </span>
              <p className="mb-1 text-sm font-semibold text-gray-900">
                No support contacts yet
              </p>
              <p className="mb-4 text-xs text-gray-500">
                Add team members to display on the client portal sidebar card.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateContactModal(true)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                + Add Contact
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <div
                  key={`${c.source}-${c.id}`}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-xs font-semibold text-sky-900">
                    {c.profile_image ? (
                      <img
                        src={c.profile_image}
                        alt={c.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      contactInitials(c.name)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {c.name}
                      </p>
                      {c.source === 'client' ? (
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Client Level
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                          {c.property_name ?? 'Property'}
                        </span>
                      )}
                    </div>
                    {c.title ? (
                      <p className="truncate text-xs text-gray-500 italic">
                        {c.title}
                      </p>
                    ) : null}
                  </div>

                  {c.mobile ? (
                    <div className="hidden shrink-0 items-center gap-1 text-xs text-gray-600 sm:flex">
                      📞
                      <span>{c.mobile}</span>
                    </div>
                  ) : null}

                  {c.email ? (
                    <div className="hidden shrink-0 items-center gap-1 text-xs text-gray-600 md:flex">
                      ✉️
                      <span className="max-w-[180px] truncate">
                        {c.email}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setEditContact(c);
                        setShowEditModal(true);
                      }}
                      className="rounded-md border border-orange-500 p-1.5 text-orange-600 hover:bg-orange-50"
                      aria-label={`Edit ${c.name}`}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteContactTarget(c);
                        setShowDeleteContactModal(true);
                      }}
                      className="rounded-md border border-red-500 p-1.5 text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${c.name}`}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <ToastProvider>
      <div className="admin-portal w-full">
        <AdminLayout
          sidebar={
            <ClientSidebar
              clients={clients}
              filteredClients={filteredClients}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              selectedClientId={clientIdValid ? clientId : null}
              onSelectClient={handleSelectClient}
              onNewClient={() => setShowCreateClientModal(true)}
              onRequestDelete={openDeleteClient}
              loading={loadingList}
            />
          }
        >
          {renderMain()}
        </AdminLayout>
      </div>

      <CreateClientModal
        isOpen={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        onSuccess={(newClient) => {
          addClient(newClient);
          router.push(`/admin/contacts/${newClient.id}`);
        }}
      />

      <CreateContactModal
        isOpen={showCreateContactModal}
        clientId={clientIdValid ? clientId : null}
        onClose={() => setShowCreateContactModal(false)}
        onSuccess={() => {
          if (clientIdValid) void fetchContacts(clientId);
        }}
      />

      <EditContactModal
        isOpen={showEditModal}
        clientId={clientIdValid ? clientId : null}
        contact={editContact}
        onClose={() => {
          setShowEditModal(false);
          setEditContact(null);
        }}
        onSuccess={() => {
          if (clientIdValid) void fetchContacts(clientId);
        }}
      />

      <DeleteContactModal
        isOpen={showDeleteContactModal}
        contact={deleteContactTarget}
        clientName={selectedClient?.name ?? ''}
        onClose={() => {
          setShowDeleteContactModal(false);
          setDeleteContactTarget(null);
        }}
        onSuccess={() => {
          if (clientIdValid) void fetchContacts(clientId);
        }}
      />

      <DeleteClientModal
        isOpen={showDeleteClientModal}
        client={deleteClientTarget}
        onClose={() => {
          setShowDeleteClientModal(false);
          setDeleteClientTarget(null);
        }}
        onSuccess={(deletedId) => {
          setShowDeleteClientModal(false);
          setDeleteClientTarget(null);
          removeClient(deletedId);
          const next = clients.filter((c) => c.id !== deletedId);
          if (deletedId === clientId) {
            if (next.length > 0) {
              router.push(`/admin/contacts/${next[0].id}`);
            } else {
              router.push('/admin');
            }
          }
        }}
      />
    </ToastProvider>
  );
}
