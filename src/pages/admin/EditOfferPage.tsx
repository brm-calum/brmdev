import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { useInquiries } from '../../hooks/useInquiries';
import { useOffers, OfferFormData } from '../../hooks/useOffers';
import { OfferForm } from '../../components/inquiries/OfferForm';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { logDebug } from '../../lib/utils/debug';

export function EditOfferPage() {
  const { inquiryId, offerId } = useParams<{ inquiryId: string; offerId: string }>();
  const navigate = useNavigate();
  const { getInquiry, isLoading: inquiryLoading } = useInquiries();
  const { getDraftOffer, updateOffer, isLoading: offerLoading } = useOffers();
  const [inquiry, setInquiry] = useState<any>(null);
  const [offer, setOffer] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (inquiryId && offerId) {
      loadData();
    }
  }, [inquiryId, offerId]);

  const loadData = async () => {
    if (!inquiryId || !offerId) return;

    try {
      // First get the offer details
      const offerData = await getDraftOffer(offerId);
      
      // Then get the inquiry
      const inquiryData = await getInquiry(inquiryId);
      
      logDebug({
        function_name: 'loadData',
        input_params: {
          inquiryId,
          offerId
        },
        output_data: {
          inquiry: inquiryData,
          offer: offerData
        }
      });

      setInquiry(inquiryData);
      setOffer(offerData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    }
  };

  const handleSubmit = async (formData: OfferFormData) => {
    if (!offerId) return;

    try {
      await updateOffer(offerId, formData);

      // Navigate back to inquiry details
      navigate(`/admin/inquiries/${inquiryId}`);
    } catch (err) {
      console.error('Failed to update offer:', err);
      setError(err instanceof Error ? err : new Error('Failed to update offer'));
    }
  };

  const isLoading = inquiryLoading || offerLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error Loading Data
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error.message}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/inquiries/${inquiryId}`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Return to Inquiry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!inquiry || !offer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                {!inquiry ? 'Inquiry not found' : 'Offer not found'}. It may have been deleted or you don't have permission to view it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRoles={['administrator']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate(`/admin/inquiries/${inquiryId}`)}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Offer
            </h1>
          </div>

          <OfferForm 
            inquiry={inquiry}
            initialData={offer}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/admin/inquiries/${inquiryId}`)}
          />
        </div>
      </div>
    </AuthGuard>
  );
}