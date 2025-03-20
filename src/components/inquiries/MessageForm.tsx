import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface MessageFormProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageForm({ onSend, disabled = false }: MessageFormProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSend(message);
      setMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex space-x-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={disabled || isSubmitting}
          className="flex-1 min-h-[80px] rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={disabled || isSubmitting || !message.trim()}
          className="self-end inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4 mr-2" />
          Send
        </button>
      </div>
    </form>
  );
}