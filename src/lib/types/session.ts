export interface Session {
  id: string;
  user_id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

export interface SessionState {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}