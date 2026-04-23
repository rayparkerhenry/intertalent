'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import type { AdminUser, Client } from '@/types/admin';
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal';

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) {
    return <>{text}</>;
  }
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${esc})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-[#FFF3B0] text-inherit">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export type ClientSidebarProps = {
  clients: Client[];
  filteredClients: Client[];
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedClientId: number | null;
  onSelectClient: (id: number) => void;
  onNewClient: () => void;
  onRequestDelete: (id: number) => void;
  loading: boolean;
};

export function ClientSidebar({
  clients,
  filteredClients,
  searchQuery,
  onSearchQueryChange,
  selectedClientId,
  onSelectClient,
  onNewClient,
  onRequestDelete,
  loading,
}: ClientSidebarProps) {
  const { data: session } = useSession();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const isSuperAdmin = session?.user?.role === 'super_admin';

  const sessionAdminUser: AdminUser | null = session?.user
    ? {
        id: Number(session.user.id),
        name: session.user.name ?? '',
        email: session.user.email ?? '',
        role: session.user.role ?? '',
        is_active: true,
        created_at: '',
        updated_at: '',
      }
    : null;

  const searchActive = searchQuery.trim().length > 0;
  const noResults = searchActive && filteredClients.length === 0;
  const total = clients.length;
  const countLabel =
    total === 1 ? '1 CLIENT' : `${total} CLIENTS`;

  return (
    <>
    <div className="flex h-full flex-col px-3 py-4">
      <header className="mb-4 border-b border-neutral-200 pb-4">
        <div className="mb-0.5 flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gray-800" />
          <h2 className="text-base font-bold tracking-tight text-gray-900">
            InterTalent Admin
          </h2>
        </div>
        <p className="pl-3 text-xs text-gray-400">
          Multi-tenant portal manager
        </p>
      </header>

      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Client portals
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {countLabel}
        </span>
      </div>

      <div className="relative mb-2">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden
        >
          🔍
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          disabled={loading || clients.length === 0}
          placeholder="Search by name or slug"
          className={`w-full rounded-lg border py-2 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70 [&::-webkit-search-cancel-button]:appearance-none ${
            noResults
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-200 focus:border-gray-400 focus:ring-gray-400'
          }`}
        />
        {searchActive && !(loading || clients.length === 0) ? (
          <button
            type="button"
            onClick={() => onSearchQueryChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Clear search"
          >
            ✕
          </button>
        ) : null}
      </div>

      {searchActive && !loading && clients.length > 0 ? (
        <p className="mb-2 text-xs text-gray-600">
          {filteredClients.length} of {total} clients
        </p>
      ) : null}

      {noResults && !loading ? (
        <p className="mb-2 text-xs text-red-600">
          No results for &quot;{searchQuery.trim()}&quot;
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <ul className="flex flex-col gap-2">
            {['s1', 's2', 's3', 's4', 's5'].map((k) => (
              <li
                key={k}
                className="h-14 animate-pulse rounded-lg bg-gray-200/80"
              />
            ))}
          </ul>
        ) : noResults ? (
          <div className="flex flex-col items-center px-2 py-10 text-center">
            <span className="mb-2 text-2xl text-gray-400" aria-hidden>
              🔍
            </span>
            <p className="text-sm font-semibold text-gray-900">
              No clients found
            </p>
            <p className="mt-1 text-xs text-gray-600">
              No name or slug matches &apos;{searchQuery.trim()}&apos;
            </p>
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Clear search
            </button>
          </div>
        ) : clients.length === 0 ? (
          <p className="py-8 text-center text-sm italic text-gray-400">
            No clients yet
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {filteredClients.map((c) => {
              const selected = c.id === selectedClientId;
              return (
                <li key={c.id}>
                  <div
                    className={`flex items-stretch gap-1 rounded-lg border ${
                      selected
                        ? 'border-gray-300 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.08),0_1px_2px_-1px_rgb(0,0,0,0.06)]'
                        : 'border-transparent bg-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectClient(c.id)}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                    >
                      <div
                        className={`truncate text-sm ${
                          selected
                            ? 'font-bold text-gray-900'
                            : 'font-semibold text-gray-900'
                        }`}
                      >
                        <HighlightMatch text={c.name} query={searchQuery} />
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        <HighlightMatch text={c.slug} query={searchQuery} />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDelete(c.id);
                      }}
                      className="shrink-0 px-2 text-gray-400 hover:text-gray-600"
                      aria-label={`Delete ${c.name}`}
                    >
                      🗑
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onNewClient}
        disabled={loading}
        className="mt-3 w-full rounded-lg border border-dashed border-gray-400 bg-transparent py-2.5 text-sm font-medium text-gray-800 hover:bg-white/50 disabled:opacity-50"
      >
        + New Client
      </button>

      <hr className="my-4 border-gray-200" />

      <nav className="flex flex-col gap-2 text-sm text-gray-800">
        <Link
          href={
            selectedClientId != null
              ? `/admin/properties/${selectedClientId}`
              : '#'
          }
          onClick={(e) => {
            if (selectedClientId == null) e.preventDefault();
          }}
          className="hover:underline"
        >
          📍 Manage Properties
        </Link>
        <Link
          href={
            selectedClientId != null
              ? `/admin/contacts/${selectedClientId}`
              : '#'
          }
          onClick={(e) => {
            if (selectedClientId == null) e.preventDefault();
          }}
          className="hover:underline"
        >
          👥 Support Team
        </Link>
        {isSuperAdmin ? (
          <Link href="/admin/users" className="hover:underline">
            👤 Admin Users
          </Link>
        ) : null}
      </nav>

      <div className="mt-auto">
        <div className="border-t border-neutral-200 mt-4 pt-3">
          {session?.user ? (
            <div className="mb-2 px-1">
              <p className="truncate text-xs font-medium text-gray-900">
                {session.user.name}
              </p>
              <p className="truncate text-xs text-gray-500">
                {session.user.email}
              </p>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                🔑 Change Password
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: '/admin/login' })}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
    <ChangePasswordModal
      isOpen={showPasswordModal}
      user={sessionAdminUser}
      onClose={() => setShowPasswordModal(false)}
      onSuccess={() => {}}
    />
    </>
  );
}
