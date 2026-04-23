'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useSearchStore } from '@/store/searchStore';
import type { ClientPortalProperty } from '@/types/client-portal';

function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

function findMatchedProperty(
  properties: ClientPortalProperty[],
  officeParam: string | null,
  urlZip: string | null,
  storeZip: string,
  storeCity: string,
  storeState: string
): ClientPortalProperty | null {
  if (officeParam?.trim()) {
    const o = officeParam.trim().toLowerCase();
    const byName = properties.find(
      (p) => p.name.trim().toLowerCase() === o
    );
    if (byName) return byName;
  }

  const zip = normalizedZipFive(urlZip ?? storeZip);
  if (zip) {
    const matches = properties.filter(
      (p) => normalizedZipFive(p.zip) === zip
    );
    if (matches.length === 1) return matches[0];
  }

  const city = storeCity.trim().toLowerCase();
  const state = storeState.trim().toLowerCase();
  if (city && state) {
    const matches = properties.filter(
      (p) =>
        (p.city?.trim().toLowerCase() ?? '') === city &&
        (p.state?.trim().toLowerCase() ?? '') === state
    );
    if (matches.length === 1) return matches[0];
  }

  return null;
}

function ContactAvatar({
  name,
  profileImage,
}: {
  name: string;
  profileImage: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showInitials = !profileImage || imageFailed;

  if (showInitials) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-900">
        {contactInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={profileImage}
      alt={name}
      className="h-12 w-12 shrink-0 rounded-full object-cover"
      onError={() => setImageFailed(true)}
    />
  );
}

export default function ClientPortalContactCard() {
  const { client, properties, contacts } = useClientPortal();
  const searchParams = useSearchParams();
  const city = useSearchStore((s) => s.city);
  const state = useSearchStore((s) => s.state);
  const zipCode = useSearchStore((s) => s.zipCode);

  const officeParam = searchParams.get('office');
  const urlZip = searchParams.get('zip');

  const urlResolvedPropertyId = useMemo(() => {
    const raw = searchParams.get('propertyId')?.trim() ?? '';
    if (raw === '' || !/^\d+$/.test(raw)) return null;
    const parsed = Number.parseInt(raw, 10);
    if (
      !Number.isFinite(parsed) ||
      !properties.some((p) => p.id === parsed)
    ) {
      return null;
    }
    return parsed;
  }, [searchParams, properties]);

  const locationMatchedProperty = useMemo(
    () =>
      findMatchedProperty(
        properties,
        officeParam,
        urlZip,
        zipCode,
        city,
        state
      ),
    [properties, officeParam, urlZip, zipCode, city, state]
  );

  const displayContacts = useMemo(() => {
    if (urlResolvedPropertyId !== null) {
      return contacts.filter(
        (c) =>
          c.source === 'property' &&
          c.property_id === urlResolvedPropertyId
      );
    }

    if (!locationMatchedProperty) {
      return [];
    }

    const propertyContacts = contacts.filter(
      (c) =>
        c.source === 'property' &&
        c.property_id === locationMatchedProperty.id
    );

    if (propertyContacts.length === 0) {
      return [];
    }

    return propertyContacts;
  }, [contacts, urlResolvedPropertyId, locationMatchedProperty]);

  const atLabel = useMemo(() => {
    if (urlResolvedPropertyId !== null) {
      return (
        properties.find((p) => p.id === urlResolvedPropertyId)?.name ??
        client.name
      );
    }
    return locationMatchedProperty ? locationMatchedProperty.name : client.name;
  }, [
    properties,
    urlResolvedPropertyId,
    locationMatchedProperty,
    client.name,
  ]);

  if (displayContacts.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-l-4 border-gray-100 border-l-[var(--color-secondary)] px-4 py-3 text-sm font-semibold text-gray-900">
        Your InterSolutions Team @ {atLabel}
      </div>

      {displayContacts.map((contact) => (
        <div
          key={`${contact.source}-${contact.id}`}
          className="flex items-start gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
        >
          <ContactAvatar
            name={contact.name}
            profileImage={contact.profile_image}
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
            {contact.title ? (
              <p className="text-xs italic text-gray-500">{contact.title}</p>
            ) : null}
            {contact.mobile ? (
              <a
                href={`tel:${contact.mobile.replace(/\s/g, '')}`}
                className="mt-1 block text-xs text-gray-600 hover:underline"
              >
                📞 {contact.mobile}
              </a>
            ) : null}
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="mt-1 block truncate text-xs text-gray-600 hover:underline"
              >
                ✉️ {contact.email}
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
