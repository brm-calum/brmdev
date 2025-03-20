import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { useInquiries } from '../../hooks/useInquiries';
import { useOffers } from '../../hooks/useOffers';
import { MessagingPanel } from '../../components/inquiries/MessagingPanel';
import { InquiryProgress } from '../../components/inquiries/InquiryProgress';
import { InquiryDetails } from '../../components/inquiries/InquiryDetails';
import { 
  ArrowLeft, AlertCircle, Eye, Edit
} from 'lucide-react';
import { InquiryForm } from '../../components/inquiries/InquiryForm';
import { InquiryFormData } from '../../lib/types/inquiry';

export function InquiryDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getInquiry, canEdit, isLoading: inquiryLoading } = useInquiries();
  const { getOffersForInquiry, isLoading: offersLoading } = useOffers();
  const [inquiry, setInquiry] = useState(null);
  const [offers, setOffers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  useEffect(() => {
    if (id) {
      loadInquiry(id);
      loadOffers(id);
    }
  }, [id]);

  const loadInquiry = async (inquiryId: string) => {
    try {
      const data = await getInquiry(inquiryId);
      setInquiry(data);
    } catch (err) {
      console.error('Failed to load inquiry:', err);
    }
  };

  const loadOffers = async (inquiryId: string) => {
    try {
      const data = await getOffersForInquiry(inquiryId);
      setOffers(data);
    } catch (err) {
      console.error('Failed to load offers:', err);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'offer_pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'offer_sent':
        return 'bg-purple-100 text-purple-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleUpdateInquiry = async (formData: InquiryFormData) => {
    if (!id) return;
    
    try {
      await updateInquiry(id, formData);
      setIsEditing(false);
      await loadInquiry(id);
    } catch (err) {
      console.error('Failed to update inquiry:', err);
    }
  };

  const isLoading = inquiryLoading || offersLoading;

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
                Error Loading Inquiry
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error.message || 'Failed to load inquiry details'}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/inquiries')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Return to Inquiries
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Inquiry not found. It may have been deleted or you don't have permission to view it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isEditing) {
    const initialFormData: InquiryFormData = {
      warehouse_ids: inquiry.warehouses?.map(w => w.warehouse_id) || [],
      service_ids: inquiry.services?.map(s => s.service_id) || [],
      feature_ids: inquiry.features?.map(f => f.feature_id) || [],
      space_requests: inquiry.space_requests?.map(request => ({
        space_type_id: request.space_type_id,
        size_m2: request.size_m2
      })) || [],
      start_date: new Date(inquiry.start_date),
      end_date: new Date(inquiry.end_date),
      notes: inquiry.notes || ''
    };

    return (
      <AuthGuard>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center mb-6">
              <button
                onClick={handleCancelEdit}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Inquiry
              </h1>
            </div>
            
            <div className="mt-4">
              <InquiryForm 
                initialData={initialFormData} 
                onSubmit={handleUpdateInquiry}
                onCancel={handleCancelEdit}
              />
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="pt-20 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/inquiries')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Inquiry Details
            </h1>
            {canEdit(inquiry.status) && (
              <button
                onClick={handleEdit}
                className="ml-4 inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <InquiryProgress status={inquiry.status} />
          </div>

          {/* Main Content */}
          <div className="mb-6">
            <InquiryDetails inquiry={inquiry} />
          </div>

          {/* Offer Link */}
          {inquiry.status === 'offer_sent' && offers.length > 0 && (
            <div className="mb-6 flex justify-center">
              <Link
                to={`/inquiries/${inquiry.id}/offer`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Offer
              </Link>
            </div>
          )}

          {/* Messages */}
          <div>
            <MessagingPanel inquiryId={id} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}