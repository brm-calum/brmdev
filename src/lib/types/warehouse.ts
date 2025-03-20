export interface WarehouseLocation {
  latitude: number;
  longitude: number;
}

export interface Warehouse {
  id: string;
  owner_id: string;
  type_id: string;
  name: string;
  description: string | null;
  size_m2: number;
  price_per_m2_cents: number;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  operating_hours: OperatingHours;
  custom_hours?: CustomHours;
  features: WarehouseFeature[];
  services: WarehouseService[];
  type?: WarehouseType;
  images?: WarehouseImage[];
}