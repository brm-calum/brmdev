import React, { useState, useRef } from 'react';
import { Upload, X, Tag, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FileLabel } from '../../lib/types/file';

interface FileWithLabel extends File {
  label?: string;
  preview?: string;
}

interface FileUploadDialogProps {
  onUpload: (files: FileWithLabel[]) => void;
  onClose: () => void;
  maxFiles?: number;
  maxSize?: number;
}

interface FilePreviewData {
  file: FileWithLabel;
  preview?: string;
  label?: string;
}

export function FileUploadDialog({
  onUpload,
  onClose,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024 // 10MB
}: FileUploadDialogProps) {
  const [files, setFiles] = useState<FilePreviewData[]>([]);
  const [currentFile, setCurrentFile] = useState<FilePreviewData | null>(null);
  const [label, setLabel] = useState('');
  const [labelSuggestions, setLabelSuggestions] = useState<FileLabel[]>([]);
  const [defaultLabels, setDefaultLabels] = useState<FileLabel[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch default labels on mount
  useEffect(() => {
    const fetchDefaultLabels = async () => {
      try {
        const { data, error } = await supabase.rpc('get_default_labels');
        if (error) throw error;
        setDefaultLabels(data || []);
        setLabelSuggestions(data || []);
      } catch (err) {
        console.error('Failed to fetch default labels:', err);
      }
    };
    fetchDefaultLabels();
  }, []);

  const fetchLabelSuggestions = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setLabelSuggestions(defaultLabels);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_label_suggestions', {
          search_term: searchTerm,
          limit_count: 5
        });

      if (error) throw error;
      setLabelSuggestions(data || []);
    } catch (err) {
      console.error('Failed to fetch label suggestions:', err);
      setLabelSuggestions([]);
    }
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLabel(value);
    fetchLabelSuggestions(value);
  };

  const handleSuggestionClick = (suggestion: FileLabelSuggestion) => {
    setLabel(suggestion.name);
    setLabelSuggestions([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file count
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files`);
      return;
    }

    // Validate file sizes
    const invalidFiles = selectedFiles.filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
      alert(`Some files exceed the ${maxSize / 1024 / 1024}MB size limit`);
      return;
    }

    // Create preview URLs for images
    const newFiles = selectedFiles.map(file => ({
      file: file as FileWithLabel,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    // Show label dialog for first file
    if (newFiles.length > 0) {
      setCurrentFile(newFiles[0]);
      setLabel('');
    }

    setFiles(prev => [...prev, ...newFiles.slice(1)]);
  };

  const handleLabelSave = () => {
    if (currentFile) {
      currentFile.file.label = label
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      setFiles(prev => [...prev, currentFile]);
      setCurrentFile(null);
      setLabel('');
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => {
      const file = prev[index];
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = () => {
    onUpload(files.map(f => f.file));
    onClose();
  };

  // Clean up preview URLs
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  if (currentFile) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Add Label</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              {currentFile.preview ? (
                <img 
                  src={currentFile.preview} 
                  alt={currentFile.file.name}
                  className="h-16 w-16 object-cover rounded-lg"
                />
              ) : (
                <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{currentFile.file.name}</p>
                <p className="text-sm text-gray-500">
                  {(currentFile.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                  Label (optional)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="label"
                    value={label}
                    onChange={handleLabelChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                    placeholder="Choose or type a label..."
                  />
                  {(labelSuggestions.length > 0 || defaultLabels.length > 0) && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
                      <ul className="py-1">
                        {labelSuggestions.map((suggestion) => (
                          <li
                            key={suggestion.name}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <span className="flex items-center">
                              <Tag className="h-4 w-4 mr-2 text-gray-400" />
                              {suggestion.name}
                            </span>
                            {suggestion.is_default && (
                              <span className="text-xs text-gray-500">Default</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCurrentFile(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleLabelSave}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Add File
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Upload Files</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {files.length < maxFiles && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 transition-colors"
            >
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                Click to select files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleFileSelect}
                accept="image/*,application/pdf,.doc,.docx"
              />
            </div>
          )}

          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {file.preview ? (
                  <img 
                    src={file.preview} 
                    alt={file.file.name}
                    className="h-12 w-12 object-cover rounded"
                  />
                ) : (
                  <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{file.file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.file.size / 1024).toFixed(1)} KB
                  </p>
                  {file.file.label && (
                    <div className="mt-1 flex items-center">
                      <Tag className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">{file.file.label}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemoveFile(index)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {files.length > 0 && (
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                Upload and Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}