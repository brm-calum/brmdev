import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '../components/auth/AuthGuard';
import { useInquiries } from '../hooks/useInquiries';
import { useBookingMessages } from '../hooks/useBookingMessages';
import { MessageList } from '../components/inquiries/MessageList';
import { MessageForm } from '../components/inquiries/MessageForm';
import { MessageSquare, Building2, Calendar } from 'lucide-react';
import { formatDate } from '../lib/utils/dates';
import { supabase } from '../lib/supabase';

export function MessagesPage() {
  const navigate = useNavigate();
  const { fetchInquiries } = useInquiries();
  const { getMessages, sendMessage } = useBookingMessages();
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadInquiries();
  }, []);

  useEffect(() => {
    if (selectedInquiry) {
      loadMessages(selectedInquiry.id);
      
      // Set up real-time subscription
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'booking_messages',
            filter: `inquiry_id=eq.${selectedInquiry.id}`
          },
          () => {
            loadMessages(selectedInquiry.id);
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [selectedInquiry?.id]);

  const loadInquiries = async () => {
    try {
      const data = await fetchInquiries();
      setInquiries(data);
      
      // Select first inquiry by default
      if (data.length > 0 && !selectedInquiry) {
        setSelectedInquiry(data[0]);
      }
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    }
  };

  const loadMessages = async (inquiryId: string) => {
    try {
      const data = await getMessages(inquiryId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedInquiry) return;
    
    try {
      await sendMessage(selectedInquiry.id, message);
      await loadMessages(selectedInquiry.id);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <AuthGuard>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-6">
            <MessageSquare className="h-6 w-6 text-gray-400 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">
              Messages
            </h1>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Inquiries List */}
            <div className="col-span-4 bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Inquiries</h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {inquiries.map((inquiry) => (
                  <button
                    key={inquiry.id}
                    onClick={() => setSelectedInquiry(inquiry)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none ${
                      selectedInquiry?.id === inquiry.id ? 'bg-green-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Inquiry #{inquiry.id.slice(0, 8)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 flex items-center">
                          <Building2 className="h-3 w-3 mr-1" />
                          {inquiry.warehouses?.[0]?.warehouse?.name || 'No warehouse'}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(inquiry.created_at)}
                        </div>
                      </div>
                      <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                        inquiry.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        inquiry.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {inquiry.status.replace('_', ' ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="col-span-8 bg-white rounded-lg shadow">
              {selectedInquiry ? (
                <div className="h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="text-lg font-medium text-gray-900">
                      Inquiry #{selectedInquiry.id.slice(0, 8)}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {selectedInquiry.warehouses?.[0]?.warehouse?.name}
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto">
                    <MessageList messages={messages} />
                  </div>
                  
                  <div className="px-6 py-4 border-t border-gray-200">
                    <MessageForm onSend={handleSendMessage} disabled={isLoading} />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Select an inquiry to view messages
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}