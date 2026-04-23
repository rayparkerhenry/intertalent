import type React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getClientBySlug } from '@/lib/client-portal/get-client-by-slug';
import { ClientPortalProvider } from '@/contexts/ClientPortalContext';
import ClientPortalFooter from '@/components/client-portal/ClientPortalFooter';
import ClientPortalHeader from '@/components/client-portal/ClientPortalHeader';

const defaultIcons: Metadata['icons'] = {
  icon: [{ url: '/icon.png', type: 'image/png' }],
  shortcut: '/icon.png',
  apple: '/icon.png',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getClientBySlug(slug);

  if (!data) {
    return {
      title: 'InterSolutions Talent',
      description: 'Find the right Professional',
      icons: defaultIcons,
    };
  }

  const { client } = data;

  return {
    title: `${client.name} | InterSolutions Talent`,
    description: `Find talent for ${client.name} properties`,
    icons: defaultIcons,
    openGraph: {
      title: `${client.name} | InterSolutions`,
      description: `Find talent for ${client.name}`,
      ...(client.hero_url ? { images: [{ url: client.hero_url }] } : {}),
    },
  };
}

interface ClientPortalLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function ClientPortalLayout({
  children,
  params,
}: ClientPortalLayoutProps) {
  const { slug } = await params;
  const data = await getClientBySlug(slug);

  if (!data) {
    notFound();
  }

  const cssVars = {
    '--color-primary': data.client.primary_color ?? '#1A3C5E',
    '--color-secondary': data.client.secondary_color ?? '#F5A623',
  } as React.CSSProperties;

  return (
    <ClientPortalProvider value={data}>
      <div style={cssVars} className="min-h-screen bg-white text-gray-900">
        <ClientPortalHeader />
        <main>{children}</main>

        <ClientPortalFooter />
      </div>
    </ClientPortalProvider>
  );
}
