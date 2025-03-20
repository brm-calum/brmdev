import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

interface InquiryResponseProps {
  inquiryId: string;
  onSubmit: (message: string) => Promise<void>;
}

export function InquiryResponse({ inquiryId, onSubmit }: InquiryResponseProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(message);
      setMessage('');
    } catch (err) {
      console.error('Failed to send response:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
        Send Response
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="mt-1">
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            placeholder="Type your response..."
            required
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Sending...' : 'Send Response'}
          </button>
        </div>
      </form>
    </div>
  );
}