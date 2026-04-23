'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal';
import { ClientSidebar } from '@/components/admin/ClientSidebar';
import { CreateAdminUserModal } from '@/components/admin/CreateAdminUserModal';
import { CreateClientModal } from '@/components/admin/CreateClientModal';
import { DeleteAdminUserModal } from '@/components/admin/DeleteAdminUserModal';
import { DeleteClientModal } from '@/components/admin/DeleteClientModal';
import { EditAdminUserModal } from '@/components/admin/EditAdminUserModal';
import { ToastProvider } from '@/components/admin/ToastContext';
import { useAdminClients } from '@/hooks/useAdminClients';
import type {
  AdminUser,
  AdminUserListResponse,
  ApiErrorResponse,
  Client,
} from '@/types/admin';

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const a = parts[0][0];
  const b = parts[parts.length - 1][0];
  return `${a}${b}`.toUpperCase();
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const {
    clients,
    isLoading: loadingList,
    addClient,
    removeClient,
  } = useAdminClients();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [deleteClientTarget, setDeleteClientTarget] = useState<Client | null>(
    null
  );
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUser | null>(
    null
  );
  const [showOwnPasswordModal, setShowOwnPasswordModal] = useState(false);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError(false);
    try {
      const res = await fetch('/api/admin/users');
      const json = (await res.json()) as AdminUserListResponse | ApiErrorResponse;
      if (!json.success) {
        setUsers([]);
        setUsersError(true);
        return;
      }
      setUsers(json.data);
    } catch {
      setUsers([]);
      setUsersError(true);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

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

  const isSelf = (u: AdminUser) =>
    currentUserId != null && String(u.id) === String(currentUserId);

  const currentSessionAdmin = useMemo(
    () =>
      users.find(
        (x) =>
          currentUserId != null && String(x.id) === String(currentUserId)
      ) ?? null,
    [users, currentUserId]
  );

  const renderMain = () => {
    if (loadingList) {
      return (
        <div className="animate-pulse p-6 md:p-8">
          <div className="mb-6 h-9 w-64 max-w-full rounded bg-gray-200" />
          <div className="h-64 rounded-lg border border-gray-200 bg-gray-100" />
        </div>
      );
    }

    return (
      <div className="p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-block text-sm text-gray-800 hover:underline"
            >
              ← Back to dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              👤 Admin Users
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {currentSessionAdmin ? (
              <button
                type="button"
                onClick={() => setShowOwnPasswordModal(true)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                🔑 My password
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowCreateUserModal(true)}
              disabled={loadingUsers}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              + Add Admin User
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Admin users
              </h2>
              <span className="text-sm text-gray-500">
                {users.length}{' '}
                {users.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>

          {loadingUsers ? (
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
          ) : usersError ? (
            <div className="p-8 text-center text-sm text-red-600">
              Could not load admin users. Please try again.
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <span className="mb-3 text-4xl" aria-hidden>
                👤
              </span>
              <p className="mb-1 text-sm font-semibold text-gray-900">
                No admin users yet
              </p>
              <p className="mb-4 text-xs text-gray-500">
                Add administrators who can sign in to this portal.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(true)}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                + Add Admin User
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((u) => {
                const self = isSelf(u);
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    {/* Left: Avatar + Name + Email */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-900"
                        aria-hidden
                      >
                        {userInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {u.name}
                          </p>
                          {self ? (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                              You
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-gray-500">
                          {u.email}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Role + Status */}
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={
                          u.role === 'super_admin'
                            ? 'rounded-full bg-gray-900 px-2 py-0.5 text-xs font-medium text-white'
                            : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700'
                        }
                      >
                        {u.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
                      </span>
                      <span
                        className={
                          u.is_active
                            ? 'text-xs font-medium text-green-700'
                            : 'text-xs font-medium text-gray-400'
                        }
                      >
                        {u.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>

                    {/* Right: Action buttons */}
                    <div className="flex shrink-0 items-center gap-2">
                      {!self ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditUser(u);
                              setShowEditModal(true);
                            }}
                            className="rounded-md border border-orange-500 p-1.5 text-orange-600 hover:bg-orange-50"
                            aria-label={`Edit ${u.name}`}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteUserTarget(u);
                              setShowDeleteUserModal(true);
                            }}
                            className="rounded-md border border-red-500 p-1.5 text-red-600 hover:bg-red-50"
                            aria-label={`Delete ${u.name}`}
                          >
                            🗑
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
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
              selectedClientId={null}
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
          router.push(`/admin/clients/${newClient.id}`);
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
        }}
      />

      <CreateAdminUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={(_user: AdminUser) => {
          void fetchUsers();
        }}
      />

      <EditAdminUserModal
        isOpen={showEditModal}
        user={editUser}
        currentUserId={currentUserId}
        onClose={() => {
          setShowEditModal(false);
          setEditUser(null);
        }}
        onSuccess={(_user: AdminUser) => {
          void fetchUsers();
        }}
      />

      <DeleteAdminUserModal
        isOpen={showDeleteUserModal}
        user={deleteUserTarget}
        onClose={() => {
          setShowDeleteUserModal(false);
          setDeleteUserTarget(null);
        }}
        onSuccess={(_userId: number) => {
          void fetchUsers();
        }}
      />

      <ChangePasswordModal
        isOpen={showOwnPasswordModal}
        user={currentSessionAdmin}
        onClose={() => setShowOwnPasswordModal(false)}
        onSuccess={() => {}}
      />
    </ToastProvider>
  );
}
