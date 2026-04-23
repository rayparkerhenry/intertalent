import React from 'react';

type AdminLayoutProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export function AdminLayout({ sidebar, children }: AdminLayoutProps) {
  return (
    <div className="flex w-full h-screen overflow-hidden">
      <aside className="w-[220px] shrink-0 h-full border-r border-neutral-200 bg-[#F9F8F3] shadow-[1px_0_0_0_#e5e7eb] overflow-hidden">
        {sidebar}
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto bg-white h-full">
        {children}
      </div>
    </div>
  );
}
