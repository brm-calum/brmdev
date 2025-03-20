import React, { useRef } from 'react';
import { Paperclip, Upload } from 'lucide-react';

interface FileWithLabel extends File {
  label?: string;
}

interface FileUploadButtonProps {
  onFileSelect: (files: FileWithLabel[]) => void;
  disabled?: boolean;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

export function FileUploadButton({ 
  onFileSelect, 
  disabled = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  accept = "image/*,application/pdf,.doc,.docx",
  multiple = true,
  className = ""
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const promptForLabel = async (file: File): Promise<FileWithLabel> => {
    const label = window.prompt(`Enter a label for ${file.name} (optional):`);
    return Object.assign(file, { label: label || undefined });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    // Validate files
    const validFiles = Array.from(files).filter((file: File) => {
      if (file.size > maxSize) {
        alert(`File "${file.name}" exceeds the ${maxSize / 1024 / 1024}MB size limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    // Prompt for labels
    Promise.all(validFiles.map(promptForLabel))
      .then(filesWithLabels => {
        onFileSelect(filesWithLabels);
      });
    
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 ${className}`}
      >
        <Upload className="h-4 w-4 mr-2" />
        Upload Files
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
      />
    </>
  );
}