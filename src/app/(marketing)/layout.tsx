import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'InterSolutions - Talent Showcase',
  description: 'Find the right Professional for your organization',
};

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  if (h.get('x-client-portal-rewrite') === '1') {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
