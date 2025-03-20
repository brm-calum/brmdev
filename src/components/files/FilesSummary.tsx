import { Files, Eye } from 'lucide-react';
import { SortableFileList } from '../files/SortableFileList';
import { downloadFile } from '../../lib/utils/files';
import { useState } from 'react';

interface FilesSummaryProps {
  inquiry: any;
  customerId: string;
}

export function FilesSummary({ inquiry, customerId }: FilesSummaryProps) {
  const [hiddenFiles, setHiddenFiles] = useState<Set<string>>(new Set());

  // Collect all files from the inquiry and responses
  const allFiles = [
    ...(Array.isArray(inquiry.files) ? inquiry.files : []),
    ...(Array.isArray(inquiry.responses) ? 
      inquiry.responses.flatMap((r: any) => r.files || []) : 
      []
    )
  ].filter(file => !hiddenFiles.has(file.id)).map(file => ({
    id: file.id,
    name: file.file_name,
    size: file.file_size,
    storage_path: file.storage_path,
    uploader_id: file.uploader_id,
    label: file.label,
    created_at: file.created_at,
  }));

  const handleToggleVisibility = (fileId: string) => {
    setHiddenFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  if (allFiles.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <Files className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>No files have been shared in this conversation</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <SortableFileList
          files={allFiles}
          customerId={inquiry.inquirer_id}
          onDownload={downloadFile}
          onToggleVisibility={handleToggleVisibility}
          hiddenFiles={hiddenFiles}
        />
      </div>
      {hiddenFiles.size > 0 && (
        <div className="text-center">
          <button
            onClick={() => setHiddenFiles(new Set())}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Eye className="h-4 w-4 mr-2" />
            Show all hidden files ({hiddenFiles.size})
          </button>
        </div>
      )}
    </div>
  );
}