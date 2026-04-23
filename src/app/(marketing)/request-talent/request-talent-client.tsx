'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RequestTalentModal from '@/components/modals/RequestTalentModal';

export default function RequestTalentClient() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  const mode =
    params.get('mode') || searchParams.get('mode');

  const associateId =
    params.get('associateId') || searchParams.get('associateId');

  const contactEmail =
    params.get('contactEmail') || searchParams.get('contactEmail');

  if (mode || associateId || contactEmail) {
    setOpen(true);
  }
}, [searchParams]);


  // ✅ Decode ref → personId
  const refCode = searchParams.get('ref');

  const personId =
    refCode && refCode.startsWith('TTE-')
      ? refCode.replace('TTE-', '')
      : undefined;

  
  return (
    <>
      {open && (
        <RequestTalentModal
          onClose={() => setOpen(false)}

          // existing
          location={searchParams.get('location') ?? undefined}
          associateId={searchParams.get('associateId') ?? undefined}
          associateName={searchParams.get('associateName') ?? undefined}

          // NEW: prefills
          contactName={searchParams.get('contactName') ?? undefined}
          contactEmail={searchParams.get('contactEmail') ?? undefined}
          contactPhone={searchParams.get('contactPhone') ?? undefined}
          personId={personId}

          campaign={
            searchParams.get('campaign') === 'TalentTuesday'
              ? 'TalentTuesday'
              : 'Generic'
          }

          requestMode={
            searchParams.get('mode') === 'ASSOCIATE'
              ? 'ASSOCIATE'
              : searchParams.get('mode') === 'UNAVAILABLE'
              ? 'UNAVAILABLE'
              : 'GENERIC'
          }
        />
      )}
    </>
  );
}
