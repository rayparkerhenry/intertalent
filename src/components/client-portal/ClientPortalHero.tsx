'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useSearchStore } from '@/store/searchStore';
import type { ClientPortalProperty } from '@/types/client-portal';

function propertyOptionLabel(p: ClientPortalProperty): string {
  const cityState = [p.city, p.state].filter(Boolean).join(', ');
  return cityState ? `${p.name} - ${cityState}` : p.name;
}

function normalizedZipFive(zip: string | null | undefined): string | null {
  if (!zip) return null;
  const digits = zip.replace(/\D/g, '');
  if (digits.length >= 5) {
    const five = digits.slice(0, 5);
    return /^\d{5}$/.test(five) ? five : null;
  }
  return null;
}

function propertyIdFromSearchParams(
  properties: ClientPortalProperty[],
  sp: URLSearchParams
): string {
  const propertyIdParam = sp.get('propertyId')?.trim();
  if (propertyIdParam && /^\d+$/.test(propertyIdParam)) {
    const matched = properties.find(
      (p) => String(p.id) === propertyIdParam
    );
    if (matched) return String(matched.id);
  }
  const office = sp.get('office')?.trim();
  if (office) {
    const byOffice = properties.find((p) => p.name.trim() === office);
    if (byOffice) return String(byOffice.id);
  }
  const zip = sp.get('zip')?.trim();
  if (zip && /^\d{5}$/.test(zip)) {
    const byZip = properties.find((p) => normalizedZipFive(p.zip) === zip);
    if (byZip) return String(byZip.id);
  }
  const city = sp.get('city')?.trim().toLowerCase();
  const state = sp.get('state')?.trim().toLowerCase();
  if (city && state) {
    const byCityState = properties.find(
      (p) =>
        p.city?.trim().toLowerCase() === city &&
        p.state?.trim().toLowerCase() === state
    );
    if (byCityState) return String(byCityState.id);
  }
  return '';
}

export default function ClientPortalHero() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client, properties } = useClientPortal();

  const professionsList = useSearchStore((s) => s.professionsList);
  const professionsLoading = useSearchStore((s) => s.professionsLoading);
  const fetchProfessions = useSearchStore((s) => s.fetchProfessions);

  const getPortalBase = () => {
    if (typeof window === 'undefined') return '/';
    const hostname = window.location.hostname;
    const isSubdomain =
      hostname.includes('.') &&
      ![
        'localhost',
        'intertalent.intersolutions.com',
        'talenttesting.intersolutions.com',
      ].includes(hostname);

    if (isSubdomain) return '/';
    return `/client-portal/${client.slug}`;
  };

  const [selectedProfession, setSelectedProfession] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  useEffect(() => {
    void fetchProfessions();
  }, [fetchProfessions]);

  // Keep hero selects aligned with URL (SearchParamsSyncer updates the store; hero needs local select state)
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    const professionsParam = sp.get('professions') || '';
    const list = professionsParam
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (list.length === 1) {
      setSelectedProfession(list[0]);
    } else {
      setSelectedProfession('');
    }
    setSelectedPropertyId(propertyIdFromSearchParams(properties, sp));
  }, [searchParams, properties]);

  const selectedProperty =
    selectedPropertyId === ''
      ? null
      : properties.find((p) => String(p.id) === selectedPropertyId) ?? null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );

    if (selectedProfession) {
      params.set('professions', selectedProfession);
    } else {
      params.delete('professions');
    }

    if (selectedProperty) {
      params.delete('zip');
      params.delete('city');
      params.delete('state');
      params.delete('office');
      params.delete('zipCodes');

      const zip = normalizedZipFive(selectedProperty.zip);
      if (zip) {
        params.set('zip', zip);
      } else {
        const city = selectedProperty.city?.trim() ?? '';
        const st = selectedProperty.state?.trim() ?? '';
        if (city || st) {
          if (city) params.set('city', city);
          if (st) params.set('state', st);
        } else {
          params.set('office', selectedProperty.name.trim());
        }
      }

      const currentRadius = params.get('radius');

      if (!currentRadius) {
        params.set('radius', '15');
      }

      params.set('propertyId', String(selectedProperty.id));
    } else {
      params.delete('propertyId');
    }

    const next = params.toString();
    const current = typeof window !== 'undefined' ? window.location.search.slice(1) : '';

    if (next !== current) {
      const base = getPortalBase();
      router.push(next ? `${base}?${next}` : base);
    }
  };

  const communityPlaceholder = `All ${client.name} Properties`;

  return (
    <section className="relative bg-[var(--color-primary)] text-white overflow-hidden">
      <div
        className={`absolute inset-0 bg-cover bg-left bg-no-repeat sm:bg-top ${
          client.hero_url ? '' : 'bg-[var(--color-primary)]'
        }`}
        style={
          client.hero_url
            ? {
                backgroundImage: `url(${client.hero_url})`,
                backgroundColor: 'var(--color-primary)',
              }
            : undefined
        }
      />

      <div className="absolute inset-0 bg-black/50"></div>

      <div className="relative container mx-auto flex h-[600px] flex-col px-4 py-12 pt-24 md:pt-28">
        <div className="flex min-h-0 flex-1 flex-col justify-end">
          <div className="max-w-2xl text-left mb-8 md:mb-12">
            <p className="text-sm md:text-base text-gray-200 mb-2 tracking-wide">
              Discover Talent
            </p>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4">
              Search Candidates
            </h1>

            <p className="text-base md:text-lg text-gray-200">
              Find the right Professional to complete the job.
            </p>
          </div>

          <div className="flex justify-center w-full">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col md:flex-row gap-3 md:gap-2 items-stretch w-full max-w-3xl md:bg-white md:rounded-full md:shadow-2xl md:p-2"
            >
              <div className="flex-1 flex items-center px-4 py-3 min-w-0 bg-white rounded-full shadow-lg md:shadow-none">
                <svg
                  className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <select
                  value={selectedProfession}
                  onChange={(e) => setSelectedProfession(e.target.value)}
                  className="flex-1 outline-none text-gray-800 placeholder-gray-400 bg-transparent text-sm md:text-base min-w-0"
                  aria-label="Select profession"
                >
                  <option value="">Select Profession</option>
                  {(professionsLoading && professionsList.length === 0
                    ? []
                    : professionsList
                  ).map((prof) => (
                    <option key={prof} value={prof}>
                      {prof}
                    </option>
                  ))}
                </select>
              </div>

              <div className="hidden md:block w-px h-8 bg-gray-300 self-center"></div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center px-4 py-3 bg-white rounded-full md:rounded-none shadow-lg md:shadow-none">
                  <svg
                    className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedPropertyId(val);

                      if (val === '') {
                        const params = new URLSearchParams(
                          typeof window !== 'undefined'
                            ? window.location.search
                            : ''
                        );
                        params.delete('zip');
                        params.delete('city');
                        params.delete('state');
                        params.delete('office');
                        params.delete('zipCodes');
                        params.delete('propertyId');

                        const base = getPortalBase();
                        const qs = params.toString();
                        router.push(qs ? `${base}?${qs}` : base);
                      }
                    }}
                    className="flex-1 outline-none text-gray-800 placeholder-gray-400 bg-transparent text-sm md:text-base min-w-0"
                    aria-label={communityPlaceholder}
                  >
                    <option value="">{communityPlaceholder}</option>
                    {properties.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {propertyOptionLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="bg-[var(--color-primary)] hover:opacity-90 text-white font-semibold px-6 md:px-8 py-3 rounded-full transition-opacity text-sm md:text-base whitespace-nowrap shadow-lg md:shadow-none"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
