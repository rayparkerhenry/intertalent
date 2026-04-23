'use client';

import { SessionProvider } from 'next-auth/react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="w-full min-h-screen min-w-[768px]">{children}</div>
    </SessionProvider>
  );
}
