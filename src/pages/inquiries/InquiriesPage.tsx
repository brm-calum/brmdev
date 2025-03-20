import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { InquiryList } from '../../components/inquiries/InquiryList';
import { FileText } from 'lucide-react';

export function InquiriesPage() {
  return (
    <AuthGuard>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate flex items-center">
                <FileText className="h-8 w-8 text-gray-400 mr-3" />
                Warehouse Inquiries
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your warehouse space inquiries and bookings
              </p>
            </div>
          </div>
          
          <div className="mt-8">
            <InquiryList />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}