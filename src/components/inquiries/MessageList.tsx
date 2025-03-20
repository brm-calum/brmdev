import React, { useState, useEffect } from 'react';
import { formatDate } from '../../lib/utils/dates';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  sender_info: {
    first_name: string;
    last_name: string;
    is_admin: boolean;
  };
}

interface MessageListProps {
  messages: Message[];
  onRead?: (messageIds: string[]) => void;
}

export function MessageList({ messages, onRead }: MessageListProps) {
  const { user } = useAuth();

  useEffect(() => {
    if (onRead) {
      // Get IDs of unread messages not sent by current user
      const unreadMessageIds = messages
        .filter(m => !m.is_read && m.sender_info.id !== user?.id)
        .map(m => m.id);
      
      if (unreadMessageIds.length > 0) {
        onRead(unreadMessageIds);
      }
    }
  }, [messages, user?.id]);

  if (!messages.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No messages yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.sender_info.id === user?.id;
        
        return (
          <div 
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`
              max-w-[70%] rounded-lg px-4 py-2
              ${isOwnMessage 
                ? 'bg-green-100 text-green-900' 
                : 'bg-gray-100 text-gray-900'}
            `}>
              <div className="flex items-center space-x-2 mb-1">
                <span className={`text-sm font-medium ${
                  message.sender_info.is_admin ? 'text-green-700' : 'text-gray-700'
                }`}>
                  {message.sender_info.first_name} {message.sender_info.last_name}
                  {message.sender_info.is_admin && ' (Admin)'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(message.created_at)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}