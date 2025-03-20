import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/utils/files';
import { useAuth } from '../contexts/AuthContext';
import { handleError } from '../lib/utils/errors';

interface FileWithLabel extends File {
  label?: string;
}

export function useFiles() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadFiles = async (
    files: FileWithLabel[],
    inquiryId: string,
    responseId?: string
  ): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    if (!files.length) return;

    setIsLoading(true);
    setError(null);

    try {
      const uploadPromises = files.map(async (file) => {
        const storagePath = await uploadFile(file, user.id);

        const { error: insertError } = await supabase
          .from('conversation_files')
          .insert({
            inquiry_id: inquiryId,
            response_id: responseId,
            uploader_id: user.id,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: storagePath,
            label: file.label
          });

        if (insertError) throw insertError;
      });

      await Promise.all(uploadPromises);
    } catch (err) {
      setError(handleError(err, 'uploadFiles'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateFileLabel = async (fileId: string, label: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { error: updateError } = await supabase
        .from('conversation_files')
        .update({ label })
        .eq('id', fileId)
        .eq('uploader_id', user.id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(handleError(err, 'updateFileLabel'));
      throw err;
    }
  };

  return {
    uploadFiles,
    updateFileLabel,
    isLoading,
    error
  };
}