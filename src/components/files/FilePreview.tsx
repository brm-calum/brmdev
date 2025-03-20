import React, { useState } from 'react';
import { File, X, Tag, Check } from 'lucide-react';

interface FilePreviewProps {
  file: File;
  preview?: string;
  onRemove: () => void;
  onLabelChange?: (label: string) => void;
}

export function FilePreview({ file, preview, onRemove, onLabelChange }: FilePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState((file as any).label || '');

  const handleLabelSave = () => {
    if (onLabelChange) {
      onLabelChange(label);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center space-x-3">
        {preview ? (
          <img src={preview} alt={file.name} className="h-12 w-12 object-cover rounded" />
        ) : (
          <File className="h-5 w-5 text-gray-400" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">
            {(file.size / 1024).toFixed(1)} KB
          </p>
          {!isEditing && onLabelChange && (
            <button
              onClick={() => setIsEditing(true)}
              className="mt-2 inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
            >
              <Tag className="h-3 w-3 mr-1" />
              {label || 'Add label'}
            </button>
          )}
          {isEditing && (
            <div className="mt-2 flex items-center space-x-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter label"
                autoFocus
              />
              <button
                onClick={handleLabelSave}
                className="inline-flex items-center px-2 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="p-1 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}