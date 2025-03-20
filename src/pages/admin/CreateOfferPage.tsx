import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { useInquiries } from '../../hooks/useInquiries';
import { useOffers } from '../../hooks/useOffers';
import { ArrowLeft, AlertCircle, Layers, Calendar, MapPin, Package, Tag, Euro } from 'lucide-react';
import { formatDate } from '../../lib/utils/dates';

export function CreateOfferPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();
  const { getInquiry, isLoading: inquiryLoading } = useInquiries();
  const { saveDraftOffer, createOffer, sendOffer, isLoading: offerLoading } = useOffers();
  const [inquiry, setInquiry] = useState(null);
  const [spaceAllocations, setSpaceAllocations] = useState({});
  const [serviceAllocations, setServiceAllocations] = useState({});
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [offerDetails, setOfferDetails] = useState({
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    notes: '',
    actualOfferPrice: 0
  });

  useEffect(() => {
    if (inquiryId) {
      loadInquiry(inquiryId);
    }
  }, [inquiryId]);

  const loadInquiry = async (id: string) => {
    try {
      const data = await getInquiry(id);
      const duration = Math.ceil(
        (new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1; // Add 1 to include both start and end dates

      setInquiry(data);

      // Initialize space allocations
      const initialSpaceAllocations = {};
      data.space_requests?.forEach(request => {
        const warehouse = data.warehouses?.[0]?.warehouse;
        const matchingSpace = warehouse?.spaces?.find(s => s.space_type_id === request.space_type_id);
        if (matchingSpace) {
          const listPrice = matchingSpace.price_per_m2_cents;
          const estimatedTotal = listPrice * request.size_m2 * duration;

          initialSpaceAllocations[request.id] = {
            allocated: request.size_m2,
            listPricePerM2: listPrice,
            duration: duration,
            estimatedTotal: estimatedTotal,
            offerTotal: estimatedTotal, // Initialize with estimated total
            comments: ''
          };
        }
      });
      setSpaceAllocations(initialSpaceAllocations);

      // Initialize service allocations
      const initialServiceAllocations = {};
      data.services?.forEach(service => {
        initialServiceAllocations[service.service_id] = {
          pricingType: 'hourly_rate',
          quantity: 1,
          pricePerUnit: 0,
          estimatedTotal: 0,
          offerTotal: 0,
          unitType: 'hour',
          comments: ''
        };
      });
      setServiceAllocations(initialServiceAllocations);
    } catch (err) {
      console.error('Failed to load inquiry:', err);
    }
  };

  // Calculate total price whenever allocations change
  useEffect(() => {
    const spaceTotal = Object.values(spaceAllocations).reduce((sum: number, space: any) => {
      return sum + (space.offerTotal || 0);
    }, 0);

    const serviceTotal = Object.values(serviceAllocations).reduce((sum: number, service: any) => {
      return sum + (service.offerTotal || 0);
    }, 0);

    setCalculatedPrice(spaceTotal + serviceTotal);
  }, [spaceAllocations, serviceAllocations]);

  const handleSpaceAllocationChange = (requestId: string, field: string, value: number) => {
    setSpaceAllocations(prev => {
      const allocation = prev[requestId];
      if (!allocation) return prev;

      const updated = { ...allocation, [field]: value };

      if (field === 'allocated') {
        // Recalculate estimated and offer totals
        updated.estimatedTotal = value * updated.listPricePerM2 * updated.duration;
        updated.offerTotal = updated.estimatedTotal;
      } else if (field === 'offerTotal') {
        // Direct update of offer total
        updated.offerTotal = value;
      }

      return { ...prev, [requestId]: updated };
    });
  };

  const handleServiceAllocationChange = (serviceId: string, field: string, value: any) => {
    setServiceAllocations(prev => {
      const allocation = prev[serviceId];
      if (!allocation) return prev;

      const updated = { ...allocation, [field]: value };

      if (field === 'quantity' || field === 'pricePerUnit') {
        // Recalculate totals
        updated.estimatedTotal = updated.quantity * updated.pricePerUnit;
        updated.offerTotal = updated.estimatedTotal;
      } else if (field === 'offerTotal') {
        // Direct update of offer total
        updated.offerTotal = value;
      }

      return { ...prev, [serviceId]: updated };
    });
  };

  const handleSubmit = async (sendImmediately = false) => {
    try {
      // Format space allocations data
      const spaceData = Object.entries(spaceAllocations).map(([requestId, allocation]) => {
        const request = inquiry.space_requests.find(r => r.id === requestId);
        const warehouse = inquiry.warehouses?.[0]?.warehouse;
        const space = warehouse?.spaces?.find(s => s.space_type_id === request.space_type_id);
        
        if (!space) {
          throw new Error('No matching space found for allocation');
        }

        return {
          space_id: space.id,
          space_allocated_m2: allocation.allocated,
          price_per_m2_cents: allocation.listPricePerM2,
          offer_total_cents: allocation.offerTotal,
          comments: allocation.comments || ''
        };
      });

      // Format service allocations data
      const serviceData = Object.entries(serviceAllocations).map(([serviceId, allocation]) => {
        return {
          service_id: serviceId,
          pricing_type: allocation.pricingType,
          quantity: allocation.quantity,
          price_per_hour_cents: allocation.pricingType === 'hourly_rate' ? allocation.pricePerUnit : null,
          price_per_unit_cents: allocation.pricingType === 'per_unit' ? allocation.pricePerUnit : null,
          unit_type: allocation.unitType,
          offer_total_cents: allocation.offerTotal,
          comments: allocation.comments || ''
        };
      });

      if (!sendImmediately) {
        // Save as draft
        await saveDraftOffer({
          inquiry_id: inquiryId,
          total_cost_cents: offerDetails.actualOfferPrice || calculatedPrice,
          valid_until: new Date(offerDetails.validUntil),
          notes: offerDetails.notes,
          spaces: spaceData,
          services: serviceData
        });
      } else {
        // Create and send offer
        const offerId = await createOffer({
          inquiry_id: inquiryId,
          total_cost_cents: offerDetails.actualOfferPrice || calculatedPrice,
          valid_until: new Date(offerDetails.validUntil),
          notes: offerDetails.notes,
          spaces: spaceData,
          services: serviceData
        });

        await sendOffer(offerId);
      }

      // Navigate back to inquiry details
      navigate(`/admin/inquiries/${inquiryId}`);
    } catch (err) {
      console.error('Failed to create offer:', err);
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

  if (!inquiry) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">Inquiry not found</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRoles={['administrator']}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(`/admin/inquiries/${inquiryId}`)}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create Offer</h1>
        </div>

        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Inquiry Overview</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Space Requirements */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 flex items-center mb-3">
                <Layers className="h-5 w-5 text-gray-400 mr-2" />
                Space Requirements
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {inquiry.space_requests?.map((request) => (
                  <div key={request.id} className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">{request.space_type?.name}</span>
                    <span className="text-sm font-medium">{request.size_m2} m²</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 flex items-center mb-3">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                Date Range
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">
                  {formatDate(inquiry.start_date)} to {formatDate(inquiry.end_date)}
                </div>
              </div>
            </div>

            {/* Selected Warehouses */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 flex items-center mb-3">
                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                Selected Warehouses
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {inquiry.warehouses?.map((w) => (
                  <div key={w.warehouse_id} className="text-sm">
                    <div className="font-medium text-gray-900">{w.warehouse?.name}</div>
                    <div className="text-gray-500">{w.warehouse?.city}, {w.warehouse?.country}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated Cost */}
            {inquiry.estimated_cost_cents && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 flex items-center mb-3">
                  <Euro className="h-5 w-5 text-gray-400 mr-2" />
                  Customer's Estimated Cost
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-lg font-medium text-gray-900">
                    €{(inquiry.estimated_cost_cents / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Shown to customer during inquiry</div>
                </div>
              </div>
            )}

            {/* Required Services */}
            {inquiry.services?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 flex items-center mb-3">
                  <Package className="h-5 w-5 text-gray-400 mr-2" />
                  Required Services
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {inquiry.services.map((s) => (
                      <span key={s.service_id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {s.service?.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Required Features */}
            {inquiry.features?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 flex items-center mb-3">
                  <Tag className="h-5 w-5 text-gray-400 mr-2" />
                  Required Features
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {inquiry.features.map((f) => (
                      <span key={f.feature_id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {f.feature?.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Space Allocation Table */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Space Allocation</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space Requested (m²)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">List Price (€/m²)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (days)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space Allocated (m²)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Price (€)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer Price (€)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inquiry.space_requests?.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.space_type?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.size_m2}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {((spaceAllocations[request.id]?.listPricePerM2 || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {spaceAllocations[request.id]?.duration || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={spaceAllocations[request.id]?.allocated || 0}
                        onChange={(e) =>
                          handleSpaceAllocationChange(
                            request.id,
                            'allocated',
                            parseFloat(e.target.value)
                          )
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {((spaceAllocations[request.id]?.estimatedTotal || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={((spaceAllocations[request.id]?.offerTotal || 0) / 100).toFixed(2)}
                        onChange={(e) =>
                          handleSpaceAllocationChange(
                            request.id,
                            'offerTotal',
                            Math.round(parseFloat(e.target.value) * 100)
                          )
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={spaceAllocations[request.id]?.comments || ''}
                        onChange={(e) =>
                          handleSpaceAllocationChange(
                            request.id,
                            'comments',
                            e.target.value
                          )
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        placeholder="Add comments..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Services Table */}
        {inquiry.services?.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Services</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price per Unit (€)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Price (€)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer Price (€)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inquiry.services.map((service) => (
                    <tr key={service.service_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.service?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={serviceAllocations[service.service_id]?.pricingType || 'hourly_rate'}
                          onChange={(e) =>
                            handleServiceAllocationChange(
                              service.service_id,
                              'pricingType',
                              e.target.value
                            )
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        >
                          <option value="hourly_rate">Per Hour</option>
                          <option value="per_unit">Per Unit</option>
                          <option value="fixed">Fixed Price</option>
                          <option value="ask_quote">Ask for Quote</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={serviceAllocations[service.service_id]?.quantity || 0}
                          onChange={(e) =>
                            handleServiceAllocationChange(
                              service.service_id,
                              'quantity',
                              parseInt(e.target.value)
                            )
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={((serviceAllocations[service.service_id]?.pricePerUnit || 0) / 100).toFixed(2)}
                          onChange={(e) =>
                            handleServiceAllocationChange(
                              service.service_id,
                              'pricePerUnit',
                              Math.round(parseFloat(e.target.value) * 100)
                            )
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {((serviceAllocations[service.service_id]?.estimatedTotal || 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={((serviceAllocations[service.service_id]?.offerTotal || 0) / 100).toFixed(2)}
                          onChange={(e) =>
                            handleServiceAllocationChange(
                              service.service_id,
                              'offerTotal',
                              Math.round(parseFloat(e.target.value) * 100)
                            )
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={serviceAllocations[service.service_id]?.comments || ''}
                          onChange={(e) =>
                            handleServiceAllocationChange(
                              service.service_id,
                              'comments',
                              e.target.value
                            )
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                          placeholder="Add comments..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Offer Details */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Offer Details</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                <input
                  type="date"
                  value={offerDetails.validUntil}
                  onChange={(e) =>
                    setOfferDetails((prev) => ({
                      ...prev,
                      validUntil: e.target.value
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Actual Offer Price (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    offerDetails.actualOfferPrice
                      ? (offerDetails.actualOfferPrice / 100).toFixed(2)
                      : (calculatedPrice / 100).toFixed(2)
                  }
                  onChange={(e) =>
                    setOfferDetails((prev) => ({
                      ...prev,
                      actualOfferPrice: Math.round(parseFloat(e.target.value) * 100)
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={offerDetails.notes}
                  onChange={(e) =>
                    setOfferDetails((prev) => ({
                      ...prev,
                      notes: e.target.value
                    }))
                  }
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/admin/inquiries/${inquiryId}`)}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Send Offer
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}