import React from 'react';
import { FileIcon, Tag } from 'lucide-react';

interface FileInfo {
  id: string;
  name: string;
  size: number;
  label?: string;
}

interface FileListProps {
  files: FileInfo[];
  className?: string;
}

export function FileList({ files, className = '' }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center p-2 rounded-full bg-white shadow-sm border border-gray-200"
        >
          <FileIcon className="h-4 w-4 text-gray-400 mr-2" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          </div>
          {file.label && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Tag className="h-3 w-3 mr-1" />
              {file.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}