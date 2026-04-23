'use client';


import { useCampaignStore } from '@/store/campaignStore'

export default function WelcomeMessage() {

  const isHydrated = useCampaignStore((s) => s.isHydrated);


  const contactName = 
    useCampaignStore((s) => s.contactName) || 'Valued Partner';

  const propertyName =
    useCampaignStore((s) => s.department);

  const customerName = 
    useCampaignStore((s) => s.customerName);

  const location =
    useCampaignStore((s) => s.location);
    
  if (!isHydrated) return null;

    // Fallbacks
  const displayProperty = propertyName || 'your local properties';
  const displayLocation = location || 'areas across the U.S';
  

  // Only show "of customer" if BOTH exist
  const showCustomer = propertyName && customerName;

  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
        Hello {contactName},
      </h1>

      <p className="text-gray-600 mt-1">
        Welcome to the InterTalent Portal servicing{' '}
        <span className="font-medium">{displayProperty}</span>
        
        {/*conditional Insert */}
        {showCustomer && (
            <>
                {' '}of <span className="font-medium">{customerName}</span>
            </>
        )}

         {' '}in{' '} <span className="font-medium">{displayLocation}</span>.

         {' '}We’re excited to connect you with top talent in your area. 
         
         InterTalent is designed to make finding the right professionals simple and efficient.

         <br />
         <br />
 
         Start your search today and discover the talent that best fits your team.
      </p>
    </div>
  );
}