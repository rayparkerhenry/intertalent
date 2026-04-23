export interface ClientPortalClient {
  id: number;
  name: string;
  slug: string;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  hero_url: string | null;
}

export interface ClientPortalProperty {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface ClientPortalContact {
  id: number;
  source: 'client' | 'property';
  property_id: number | null;
  name: string;
  title: string | null;
  mobile: string | null;
  email: string | null;
  profile_image: string | null;
}

export interface ClientPortalData {
  client: ClientPortalClient;
  properties: ClientPortalProperty[];
  contacts: ClientPortalContact[];
}
