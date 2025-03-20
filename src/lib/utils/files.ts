import { supabase } from '../supabase';

export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('conversation-files')
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) {
    console.error('Failed to get signed URL:', error);
    throw new Error('Failed to get file URL');
  }

  return data.signedUrl;
}

export async function uploadFile(file: File, userId: string): Promise<string> {
  // Validate file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/${Math.random()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('conversation-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error('Failed to upload file');
  }

  return filePath;
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from('conversation-files')
    .download(path);

  if (error) {
    console.error('Download error:', error);
    throw new Error('Failed to download file');
  }

  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}