export type InquiryStatus = 
  | 'draft'
  | 'submitted'
  | 'offer_pending'
  | 'offer_sent'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export interface SpaceRequest {
  space_type_id: string;
  size_m2: number;
}

export interface BookingInquiry {
  id: string;
  trader_id: string;
  space_requests: SpaceRequest[];
  start_date: string;
  end_date: string;
  status: InquiryStatus;
  notes?: string;
  estimated_cost_cents?: number;
  created_at: string;
  updated_at: string;
  warehouses?: BookingInquiryWarehouse[];
  services?: BookingInquiryService[];
  features?: BookingInquiryFeature[];
}

export interface BookingInquiryWarehouse {
  inquiry_id: string;
  warehouse_id: string;
  warehouse?: {
    id: string;
    name: string;
    city: string;
    country: string;
    spaces?: Array<{
      space_type_id: string;
      size_m2: number;
      price_per_m2_cents: number;
      space_type?: {
        name: string;
      };
    }>;
  };
}

export interface BookingInquiryService {
  inquiry_id: string;
  service_id: string;
  service?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface BookingInquiryFeature {
  inquiry_id: string;
  feature_id: string;
  feature?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface InquiryFormData {
  warehouse_ids: string[];
  service_ids: string[];
  feature_ids: string[];
  space_requests: SpaceRequest[];
  start_date: Date;
  end_date: Date;
  notes?: string;
}