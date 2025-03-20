export interface PlatformFeature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}