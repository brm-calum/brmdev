export interface Profile {
  id: string;
  user_id: string;
  contact_email: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  vat_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileFormData {
  first_name: string;
  last_name: string;
  contact_email: string;
  company_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  vat_number?: string;
}