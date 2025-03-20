import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { useInquiries } from '../../hooks/useInquiries';
import { useOffers } from '../../hooks/useOffers';
import { ArrowLeft, AlertCircle, Layers, Calendar, MapPin, Package, Tag, Euro, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '../../lib/utils/dates';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function DraftOffersPage() {
  const navigate = useNavigate();
  const { getInquiry, isLoading: inquiryLoading } = useInquiries();
  const { getOffersForInquiry, isLoading: offersLoading } = useOffers();
  const [draftOffers, setDraftOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadDraftOffers();
  }, []);

  const loadDraftOffers = async () => {
    try {
      // Load all draft offers
      const offers = await getOffersForInquiry();
      const drafts = offers.filter(offer => offer.status === 'draft');
      setDraftOffers(drafts);
    } catch (err) {
      console.error('Failed to load draft offers:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedOffer) return;

    try {
      // Delete the offer
      await deleteOffer(selectedOffer.id);
      setShowDeleteConfirm(false);
      setSelectedOffer(null);
      await loadDraftOffers();
    } catch (err) {
      console.error('Failed to delete offer:', err);
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

  return (
    <AuthGuard requiredRoles={['administrator']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin/inquiries')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Draft Offers
              </h1>
            </div>
          </div>

          {draftOffers.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500">No draft offers found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {draftOffers.map((offer) => (
                <div key={offer.id} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Draft Offer #{offer.id.slice(0, 8)}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Created {formatDate(offer.created_at)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/admin/inquiries/${offer.inquiry_id}/offer/${offer.id}/edit`)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOffer(offer);
                          setShowDeleteConfirm(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Inquiry Details</h4>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-2" />
                            {formatDate(offer.inquiry.start_date)} to {formatDate(offer.inquiry.end_date)}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Euro className="h-4 w-4 mr-2" />
                            Estimated: €{(offer.inquiry.estimated_cost_cents / 100).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Offer Details</h4>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <Euro className="h-4 w-4 mr-2" />
                            Total: €{(offer.total_cost_cents / 100).toFixed(2)}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-2" />
                            Valid until: {formatDate(offer.valid_until)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {offer.notes && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900">Notes</h4>
                        <p className="mt-1 text-sm text-gray-500">{offer.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedOffer(null);
        }}
        onConfirm={handleDelete}
        title="Delete Draft Offer"
        message="Are you sure you want to delete this draft offer? This action cannot be undone."
      />
    </AuthGuard>
  );
}