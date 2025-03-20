import React from 'react';
import { FileIcon, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FileDisplayProps {
  file: {
    id: string;
    file_name: string;
    mime_type: string;
    storage_path: string;
    label?: string;
  };
  onDownload?: (path: string, name: string) => void;
  className?: string;
}

export function FileDisplay({ file, onDownload, className = '' }: FileDisplayProps) {
  return (
    <div className={`flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors ${className}`}>
      <div className="flex items-center min-w-0 flex-1">
        <div className="h-8 w-8 flex items-center justify-center bg-gray-100 rounded mr-2">
          <FileIcon className="h-5 w-5 text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file.file_name}
          </p>
          {file.label && (
            <p className="text-xs text-green-600">
              {file.label}
            </p>
          )}
        </div>
      </div>
      {onDownload && (
        <button
          onClick={() => onDownload(file.storage_path, file.file_name)}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <Download className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}