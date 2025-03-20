import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { useOffers } from '../../hooks/useOffers';
import { useAuth } from '../../contexts/AuthContext';
import { OfferSummary } from '../../components/inquiries/OfferSummary';
import { ArrowLeft, Check, X } from 'lucide-react';
import { formatDate } from '../../lib/utils/dates';

export function OfferViewPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { getOffer, acceptOffer, rejectOffer, isLoading } = useOffers();
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    loadData();
  }, [inquiryId]);

  const loadData = async () => {
    try {
      const offerData = await getOffer(inquiryId);
      if (!offerData) {
        throw new Error('No offer found');
      }
      setOffer(offerData);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleAccept = async () => {
    try {
      await acceptOffer(offer.id);
      navigate(`/inquiries/${inquiryId}`);
    } catch (err) {
      console.error('Failed to accept offer:', err);
    }
  };

  const handleReject = async () => {
    try {
      await rejectOffer(offer.id);
      navigate(`/inquiries/${inquiryId}`);
    } catch (err) {
      console.error('Failed to reject offer:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ArrowLeft className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">No offer found</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(`/inquiries/${inquiryId}`)}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Offer Details</h1>
        </div>

        <OfferSummary 
          offer={offer}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      </div>
    </AuthGuard>
  );
}