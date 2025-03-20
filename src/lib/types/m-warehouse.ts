export interface MSpaceType {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MWarehouseSpace {
  id: string;
  warehouse_id: string;
  space_type_id: string;
  space_type?: MSpaceType;
  size_m2: number;
  price_per_m2_cents: number;
  created_at: string;
  updated_at: string;
}

export interface MWarehouseImage {
  id: string;
  warehouse_id: string;
  url: string;
  order: number;
  created_at: string;
}

export interface MWarehouse {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  spaces: MWarehouseSpace[];
  images: MWarehouseImage[];
  features: {
    id: string;
    name: string;
    type: string;
    icon?: string;
    custom_value?: string;
  }[];
  services: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    pricing_type: 'hourly_rate' | 'per_unit' | 'ask_quote';
    hourly_rate_cents?: number;
    unit_rate_cents?: number;
    unit_type?: string;
    notes?: string;
  }[];
}

export interface MWarehouseFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  spaces: {
    space_type_id: string;
    size_m2: number;
    price_per_m2_cents: number;
  }[];
  images: {
    url: string;
    order: number;
  }[];
  features: {
    id: string;
    custom_value?: string;
  }[];
  services: {
    id: string;
    pricing_type: 'hourly_rate' | 'per_unit' | 'ask_quote';
    price_per_hour_cents?: number;
    price_per_unit_cents?: number;
    unit_type?: string;
    notes?: string;
  }[];
}

export interface MInquiry {
  id: string;
  warehouse_id: string;
  space_id: string;
  inquirer_id: string;
  message: string;
  status: 'pending' | 'responded' | 'closed';
  start_date: string;
  end_date: string;
  space_needed: number;
  created_at: string;
  updated_at: string;
  warehouse?: MWarehouse;
  space?: MWarehouseSpace;
}

export interface MInquiryFormData {
  warehouse_id: string;
  space_id: string;
  start_date: Date;
  end_date: Date;
  space_needed: number;
  message: string;
}