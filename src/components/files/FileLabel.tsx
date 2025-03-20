import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface FileLabelProps {
  id: string;
  label: string | null;
  onSave: (id: string, label: string) => Promise<void>;
  onCancel: () => void;
}

export function FileLabel({ id, label, onSave, onCancel }: FileLabelProps) {
  const [value, setValue] = useState(label || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await onSave(id, value);
      onCancel();
    } catch (err) {
      console.error('Failed to save label:', err);
      setError('Failed to save label');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`block w-full rounded-md shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        placeholder="Add a label..."
        disabled={isLoading}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center p-1.5 border border-transparent rounded-full text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        className="inline-flex items-center p-1.5 border border-gray-300 rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}