export interface UserWithProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  roles: string[];
  created_at: string;
  updated_at: string;
}