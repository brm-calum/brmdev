import React, { useState, useEffect, useCallback } from 'react';
import { useBookingMessages } from '../../hooks/useBookingMessages';
import { MessageList } from './MessageList';
import { MessageForm } from './MessageForm';
import { MessageSquare } from 'lucide-react';
import { useMessageSubscription } from '../../hooks/useMessageSubscription';

interface MessagingPanelProps {
  inquiryId: string;
}

export function MessagingPanel({ inquiryId }: MessagingPanelProps) {
  const { getMessages, sendMessage, markAsRead, isLoading } = useBookingMessages();
  const [messages, setMessages] = useState([]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await getMessages(inquiryId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, [inquiryId, getMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useMessageSubscription(inquiryId, loadMessages);

  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(inquiryId, message);
      await loadMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleMessagesRead = async (messageIds: string[]) => {
    try {
      await markAsRead(messageIds);
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center mb-6">
        <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
        <h3 className="text-lg font-medium text-gray-900">Messages</h3>
      </div>

      <div className="h-[400px] flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4">
          <MessageList 
            messages={messages}
            onRead={handleMessagesRead}
          />
        </div>
        <MessageForm onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}