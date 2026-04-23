'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { ClientDetail } from '@/types/admin';

function fileLabel(url: string | null): string {
  if (!url) return '';
  const parts = url.split('/');
  return parts[parts.length - 1] ?? url;
}

type ClientBrandingCardProps = {
  client: ClientDetail;
  onEdit: () => void;
  onDelete: () => void;
};

export function ClientBrandingCard({
  client,
  onEdit,
  onDelete,
}: ClientBrandingCardProps) {
  const router = useRouter();
  const portalHost = `${client.slug}.intertalent.intersolutions.com`;
  const logoName = fileLabel(client.logo_url);
  const heroName = fileLabel(client.hero_url);
  const nProps = client.properties.length;
  const nContacts = client.contacts.length;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          {client.name}
        </h1>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-md border border-orange-500 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50"
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-md border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            🗑 Delete
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-gray-300 bg-white shadow-md">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            🎨 Branding
          </h2>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Edit Branding
          </button>
        </div>

        <dl className="divide-y divide-gray-100">
          <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-sm text-gray-500">Client name</dt>
            <dd className="text-sm font-medium text-gray-900">{client.name}</dd>
          </div>
          <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-sm text-gray-500">URL slug</dt>
            <dd>
              <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900">
                {portalHost}
              </span>
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-sm text-gray-500">Primary color</dt>
            <dd className="flex items-center gap-2">
              <span
                className="h-[22px] w-[22px] shrink-0 rounded border border-gray-200"
                style={{
                  backgroundColor: client.primary_color ?? '#e5e7eb',
                }}
              />
              <span className="text-sm text-gray-900">
                {client.primary_color ?? '—'}
              </span>
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-sm text-gray-500">Secondary color</dt>
            <dd className="flex items-center gap-2">
              <span
                className="h-[22px] w-[22px] shrink-0 rounded border border-gray-200"
                style={{
                  backgroundColor: client.secondary_color ?? '#e5e7eb',
                }}
              />
              <span className="text-sm text-gray-900">
                {client.secondary_color ?? '—'}
              </span>
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-sm text-gray-500">Logo</dt>
            <dd>
              {client.logo_url ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900">
                  <span aria-hidden>✓</span> {logoName}
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                  No logo uploaded
                </span>
              )}
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px_1fr] sm:items-center">
            <dt className="text-sm text-gray-500">Hero banner</dt>
            <dd>
              {client.hero_url ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900">
                  <span aria-hidden>✓</span> {heroName}
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                  No hero image
                </span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Quick navigation
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              router.push(`/admin/properties/${client.id}`)
            }
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm transition-shadow hover:bg-gray-50 hover:shadow-sm"
          >
            <span className="font-semibold text-gray-900">
              📍 Manage Properties
            </span>
            <span className="shrink-0 whitespace-nowrap text-gray-600">
              {nProps} {nProps === 1 ? 'property' : 'properties'} →
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.push(`/admin/contacts/${client.id}`)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm transition-shadow hover:bg-gray-50 hover:shadow-sm"
          >
            <span className="font-semibold text-gray-900">
              👥 Support Team
            </span>
            <span className="shrink-0 whitespace-nowrap text-gray-600">
              {nContacts} {nContacts === 1 ? 'contact' : 'contacts'} →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
