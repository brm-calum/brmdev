import React from 'react';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { InquiryForm } from '../../components/inquiries/InquiryForm';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInquiries } from '../../hooks/useInquiries';

export function NewInquiryPage() {
  const navigate = useNavigate();
  const { createInquiry, submitInquiry } = useInquiries();

  const handleSubmit = async (formData) => {
    try {
      // Create inquiry
      const inquiryId = await createInquiry(formData);
      
      // Submit inquiry
      await submitInquiry(inquiryId);
      
      // Navigate to inquiries page
      navigate('/inquiries');
    } catch (err) {
      console.error('Failed to create inquiry:', err);
    }
  };

  return (
    <AuthGuard>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/inquiries')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold leading-7 text-gray-900">
              New Booking Inquiry
            </h1>
          </div>
          
          <div className="mt-4">
            <InquiryForm onSubmit={handleSubmit} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}