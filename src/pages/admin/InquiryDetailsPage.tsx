import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { useInquiries } from '../../hooks/useInquiries';
import { useInquiryResponses } from '../../hooks/useInquiryResponses';
import { useOffers } from '../../hooks/useOffers';
import { formatDate } from '../../lib/utils/dates';
import { 
  ArrowLeft, Layers, Calendar, Clock, MapPin, User, 
  FileText, Tag, Package, CheckCircle, XCircle, AlertCircle,
  Euro, MessageSquare, Plus, Edit
} from 'lucide-react';
import { OfferSummary } from '../../components/inquiries/OfferSummary';
import { InquiryResponse } from '../../components/inquiries/InquiryResponse';
import { ResponseHistory } from '../../components/inquiries/ResponseHistory';

export function InquiryDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getInquiry, isLoading: inquiryLoading } = useInquiries();
  const { sendResponse, getResponses, isLoading: responsesLoading } = useInquiryResponses();
  const { getOffersForInquiry, isLoading: offersLoading } = useOffers();
  const [inquiry, setInquiry] = useState(null);
  const [responses, setResponses] = useState([]);
  const [offers, setOffers] = useState([]);
  const [spaceRequirements, setSpaceRequirements] = useState({});

  useEffect(() => {
    if (id) {
      loadInquiry(id);
      loadResponses(id);
      loadOffers(id);
    }
  }, [id]);

  const loadInquiry = async (inquiryId: string) => {
    try {
      const data = await getInquiry(inquiryId);
      // Calculate space requirements by type
      const spaceReqs = {};
      data.space_requests?.forEach(request => {
        const typeName = request.space_type?.name || 'Unknown';
        spaceReqs[typeName] = (spaceReqs[typeName] || 0) + request.size_m2;
      });
      setSpaceRequirements(spaceReqs);
      setInquiry(data);
    } catch (err) {
      console.error('Failed to load inquiry:', err);
    }
  };

  const loadResponses = async (inquiryId: string) => {
    try {
      const data = await getResponses(inquiryId);
      setResponses(data);
    } catch (err) {
      console.error('Failed to load responses:', err);
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

  const handleSendResponse = async (message: string) => {
    if (!id) return;
    
    try {
      await sendResponse(id, message);
      await loadResponses(id);
      await loadInquiry(id);
    } catch (err) {
      console.error('Failed to send response:', err);
    }
  };

  const isLoading = inquiryLoading || responsesLoading || offersLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Inquiry not found
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin/inquiries')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Inquiry #{inquiry.id.slice(0, 8)}
              </h1>
            </div>
            <button
              onClick={() => navigate(`/admin/inquiries/${inquiry.id}/offer/new`)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Offer
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inquiry Details */}
            <div>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Inquiry Details</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-start">
                    <User className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Customer</div>
                      <div className="text-sm text-gray-500">
                        {inquiry.trader?.first_name} {inquiry.trader?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{inquiry.trader?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Layers className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Space Required</div>
                      <div className="mt-2 space-y-1">
                        {Object.entries(spaceRequirements).map(([type, size]) => (
                          <div key={type} className="text-sm text-gray-500">
                            {type}: {size} m²
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Date Range</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(inquiry.start_date)} to {formatDate(inquiry.end_date)}
                      </div>
                    </div>
                  </div>

                  {/* Warehouses */}
                  {inquiry.warehouses?.length > 0 && (
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Selected Warehouses</div>
                        <div className="mt-2 space-y-2">
                          {inquiry.warehouses.map((warehouseRelation: any) => {
                            const warehouse = warehouseRelation.warehouse;
                            return (
                              <div key={warehouse.id} className="bg-gray-50 p-3 rounded-lg">
                                <div className="font-medium text-gray-900">{warehouse.name}</div>
                                <div className="text-sm text-gray-500">
                                  {warehouse.city}, {warehouse.country}
                                </div>
                                {warehouse.spaces?.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {warehouse.spaces.map((space: any) => (
                                      <span
                                        key={space.id}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                      >
                                        {space.space_type?.name} ({space.size_m2} m² available)
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Services */}
                  {inquiry.services?.length > 0 && (
                    <div className="flex items-start">
                      <Package className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Requested Services</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {inquiry.services.map((serviceRelation: any) => {
                            const service = serviceRelation.service;
                            return (
                              <span
                                key={service.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                {service.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  {inquiry.features?.length > 0 && (
                    <div className="flex items-start">
                      <Tag className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Required Features</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {inquiry.features.map((featureRelation: any) => {
                            const feature = featureRelation.feature;
                            return (
                              <span
                                key={feature.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {feature.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {inquiry.notes && (
                    <div className="flex items-start">
                      <FileText className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Notes</div>
                        <div className="text-sm text-gray-500 whitespace-pre-line">{inquiry.notes}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Response Form */}
              <div className="mt-6">
                <InquiryResponse 
                  inquiryId={inquiry.id}
                  onSubmit={handleSendResponse}
                />
              </div>

              {/* Response History */}
              <div className="mt-6 bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Response History</h3>
                <ResponseHistory responses={responses} />
              </div>
            </div>

            {/* Offers */}
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Offers</h2>
              {offers.length > 0 ? (
                <div className="space-y-6">
                  {offers.map((offer) => (
                    <div key={offer.id} className="relative">
                      {/* Edit button for draft or sent offers */}
                      {['draft', 'sent'].includes(offer.status) && (
                        <div className="absolute top-4 right-4 z-10">
                          <button
                            onClick={() => navigate(`/admin/inquiries/${inquiry.id}/offer/${offer.id}/edit`)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Offer
                          </button>
                        </div>
                      )}
                      <OfferSummary 
                        offer={offer}
                        showActions={false}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No offers yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create an offer to respond to this inquiry
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate(`/admin/inquiries/${inquiry.id}/offer/new`)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Offer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}