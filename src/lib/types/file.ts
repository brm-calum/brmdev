export interface FileUrlCache {
  [key: string]: {
    url: string;
    expires: number;
  };
}

export type SortField = 'name' | 'label' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type?: string;
  label?: string | null;
  storage_path: string;
  uploader_id?: string;
  created_at: string;
}

export interface FileLabel {
  name: string;
  is_default: boolean;
  usage_count: number;
}