import React, { useState } from 'react';
import { FileIcon, Download, ArrowUpDown, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { formatDate } from '../../lib/utils/dates';
import { downloadFile, getSignedUrl } from '../../lib/utils/files'; 
import { FileLabel } from './FileLabel';

import { FileInfo, FileUrlCache, SortField, SortDirection } from '../../lib/types/file';

interface SortableFileListProps {
  files: FileInfo[];
  customerId: string;
  onDownload?: (path: string, name: string) => void;
  onUpdateLabel?: (id: string, label: string) => Promise<void>;
  onToggleVisibility?: (id: string) => void;
  hiddenFiles?: Set<string>;
}

export function SortableFileList({ 
  files, 
  customerId,
  onDownload, 
  onUpdateLabel,
  onToggleVisibility,
  hiddenFiles = new Set()
}: SortableFileListProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [urlCache, setUrlCache] = useState<FileUrlCache>({});
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  const isCustomer = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    return file?.uploader_id ? customerId === file.uploader_id : false;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedFiles = [...files].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'label':
        comparison = (a.label || '').localeCompare(b.label || '');
        break;
      case 'created_at':
        try {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          if (isNaN(dateA) || isNaN(dateB)) {
            return 0;
          }
          comparison = dateA - dateB;
        } catch (err) {
          console.error('Error comparing dates:', err);
          return 0;
        }
        break;
     // case 'comments':
     //   comparison = (a.comments || 0) - (b.comments || 0);
     //   break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th 
      className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <ArrowUpDown className={`h-4 w-4 ${sortField === field ? 'text-green-600' : 'text-gray-400'}`} />
      </div>
    </th>
  );

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No files available
      </div>
    );
  }

  const getFileUrl = async (path: string): Promise<string> => {
    const now = Date.now();
    const cached = urlCache[path];
    
    if (cached && cached.expires > now) {
      return cached.url;
    }

    const signedUrl = await getSignedUrl(path);
    setUrlCache(prev => ({
      ...prev,
      [path]: {
        url: signedUrl,
        expires: now + 3500000 // Expire slightly before the actual signed URL (58 minutes)
      }
    }));

    return signedUrl;
  };

  const handleOpenFile = async (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const url = await getFileUrl(path);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr>
            <SortHeader field="name" label="Filename" />
            <SortHeader field="label" label="Label" />
            <SortHeader field="created_at" label="Upload Date" />
            <th className="px-4 py-3 w-32"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedFiles.map((file) => (
            <tr key={file.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center">
                  <FileIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{file.name}</div>
                    <div className="text-xs text-gray-500">{formatSize(file.size)}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {editingLabel === file.id ? (
                  <FileLabel
                    id={file.id}
                    label={file.label || ''}
                    onSave={onUpdateLabel!}
                    onCancel={() => setEditingLabel(null)}
                  />
                ) : (
                  <div 
                    className={`text-sm ${onUpdateLabel ? 'cursor-pointer hover:text-gray-700' : 'text-gray-500'}`}
                    onClick={() => onUpdateLabel && isCustomer(file.id) && setEditingLabel(file.id)}
                  >
                    {file.label || 'Add label...'}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-gray-500">{formatDate(file.created_at)}</span>
              </td>

              <td className="px-4 py-3 text-right">
                <div className="flex items-center space-x-2">
                  {onToggleVisibility && (
                    <button
                      onClick={() => onToggleVisibility(file.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      title={hiddenFiles.has(file.id) ? "Show file" : "Hide file"}
                    >
                      {hiddenFiles.has(file.id) ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  <a
                    href="#"
                    onClick={(e) => handleOpenFile(file.storage_path, e)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    title="Open file"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {onDownload && (
                    <button
                      onClick={() => onDownload(file.storage_path, file.name)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}