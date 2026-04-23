'use client';

//Created for the Request Talent Modal on 12/12/25 by MS 
import { useEffect, useState } from 'react';
import ClientPortalRequestTalentModal from '@/components/client-portal/ClientPortalRequestTalentModal';

interface ClientPortalInjectTalentModalProps {
  children: React.ReactNode;
  location?: string;
}


export default function ClientPortalInjectTalentModal({ children, location, }: ClientPortalInjectTalentModalProps) {
  const [open, setOpen] = useState(false);
  const [associateId, setAssociateId] = useState<string | undefined>(location);
  
  // 🔑 Deep-link support from email
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('associateId');

    if (idFromUrl) {
      setAssociateId(idFromUrl);
      setOpen(true);
    }
  }, []);

  return (
    <>
      {/* Existing EmptyState UI */}
      {children}

      {/* New Request Talent button under it */}
      <div className="text-center mt-1">
        <button
          onClick={() => setOpen(true)}
          className="inline-block bg-[var(--color-primary)] hover:opacity-90 text-white px-6 py-3 rounded-md font-semibold transition-opacity"
        >
          Request Talent
        </button>
      </div>

      {open && <ClientPortalRequestTalentModal 
      location={location} 
      onClose={() => setOpen(false)} />}
    </>
  );
}
