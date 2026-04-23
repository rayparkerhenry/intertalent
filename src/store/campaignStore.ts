import { create } from 'zustand'

type CampaignState = {
    contactName: string | null
    customerName: string | null
    department: string | null
    location: string | null
    isHydrated: boolean

    setCampaign: (data: Partial<CampaignState>) => void;
    setHydrated: (value: boolean) => void;
};

export const useCampaignStore = create<CampaignState>((set) => ({
    contactName: null,
    customerName: null,
    department: null,
    location: null,
    isHydrated: false,

    setCampaign: (data) => {
        // Save to sessionStorage (safe for client only)
      if (typeof window !== 'undefined') {
          sessionStorage.setItem('campaignData', JSON.stringify(data));
      }
      set ((state) => ({
        ...state,
        ...data
      }));
    },

    setHydrated: (value) => set({ isHydrated: value}),
}));