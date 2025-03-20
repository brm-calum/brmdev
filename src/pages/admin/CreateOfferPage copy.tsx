import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { useInquiries } from '../../hooks/useInquiries';
import { useOffers } from '../../hooks/useOffers';
import { OfferForm } from '../../components/inquiries/OfferForm';
import { ArrowLeft, AlertCircle, Layers, Calendar, MapPin, Package, Tag, Euro } from 'lucide-react';
import { formatDate } from '../../lib/utils/dates';

export function CreateOfferPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();
  const { getInquiry, isLoading: inquiryLoading } = useInquiries();
  const { createOffer, sendOffer, isLoading: offerLoading } = useOffers();
  const [inquiry, setInquiry] = useState(null);
  const [spaceAllocations, setSpaceAllocations] = useState({});
  const [serviceAllocations, setServiceAllocations] = useState({});
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  useEffect(() => {
    if (inquiryId) {
      loadInquiry(inquiryId);
    }
  }, [inquiryId]);

  const loadInquiry = async (id: string) => {
    try {
      const data = await getInquiry(id);
      const duration = Math.ceil((new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / (1000 * 60 * 60 * 24));
      setInquiry(data);
      
      // Initialize space allocations
      const initialSpaceAllocations = {};
      data.space_requests?.forEach(request => {
        const warehouse = data.warehouses?.[0]?.warehouse;
        const matchingSpace = warehouse?.spaces?.find(s => s.space_type_id === request.space_type_id);
        if (matchingSpace) {
          initialSpaceAllocations[request.id] = {
            allocated: request.size_m2,
            pricePerM2: matchingSpace.price_per_m2_cents,
            offerPrice: matchingSpace.price_per_m2_cents * request.size_m2 * duration,
            duration: duration
          };
        }
      });
      setSpaceAllocations(initialSpaceAllocations);

      // Initialize service allocations
      const initialServiceAllocations = {};
      data.services?.forEach(service => {
        initialServiceAllocations[service.service_id] = {
          pricingType: 'hourly',
          quantity: 1,
          pricePerUnit: 0,
          offerPrice: 0
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
      return sum + (space.offerPrice || 0);
    }, 0);

    const serviceTotal = Object.values(serviceAllocations).reduce((sum: number, service: any) => {
      return sum + (service.offerPrice || 0);
    }, 0);

    setCalculatedPrice(spaceTotal + serviceTotal);
  }, [spaceAllocations, serviceAllocations]);

  const handleSpaceAllocationChange = (requestId: string, field: string, value: number) => {
    setSpaceAllocations(prev => {
      const allocation = prev[requestId];
      const updated = { ...allocation, [field]: value };
      
      // Recalculate offer price if necessary
      if (field === 'allocated') {
        updated.offerPrice = value * (updated.pricePerM2 || 0);
      }
      
      return { ...prev, [requestId]: updated };
    });
  };

  const handleServiceAllocationChange = (serviceId: string, field: string, value: any) => {
    setServiceAllocations(prev => {
      const allocation = prev[serviceId];
      const updated = { ...allocation, [field]: value };
      
      // Recalculate offer price
      if (field === 'quantity' || field === 'pricePerUnit') {
        updated.offerPrice = updated.quantity * updated.pricePerUnit;
      }
      
      return { ...prev, [serviceId]: updated };
    });
  };

  const handleSubmit = async (formData: any, sendImmediately: boolean = false) => {
    try {
      // Create the offer
      const offerId = await createOffer({
        inquiry_id: inquiryId!,
        ...formData
      });

      // Send the offer if requested
      if (sendImmediately) {
        await sendOffer(offerId);
      }

      // Navigate back to inquiry details
      navigate(`/admin/inquiries/${inquiryId}`);
    } catch (err) {
      console.error('Failed to create offer:', err);
    }
  };

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(`/admin/inquiries/${inquiryId}`)}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Create Offer
          </h1>
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
                  {formatDateDisplay(inquiry.start_date)} to {formatDateDisplay(inquiry.end_date)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Duration: {Math.ceil((new Date(inquiry.end_date).getTime() - new Date(inquiry.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
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
                      {spaceAllocations[request.id]?.duration || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={spaceAllocations[request.id]?.allocated || 0}
                        onChange={(e) => handleSpaceAllocationChange(
                          request.id,
                          'allocated',
                          parseFloat(e.target.value)
                        )}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {((spaceAllocations[request.id]?.allocated || 0) * 
                        (spaceAllocations[request.id]?.pricePerM2 || 0) * 
                        (spaceAllocations[request.id]?.duration || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={(spaceAllocations[request.id]?.offerPrice || 0) / 100}
                        onChange={(e) => handleSpaceAllocationChange(
                          request.id,
                          'offerPrice',
                          parseFloat(e.target.value) * 100
                        )}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Service</th>
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
                        <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm">
                          <option value="hourly">Per Hour</option>
                          <option value="unit">Per Unit</option>
                          <option value="fixed">Fixed Price</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={serviceAllocations[service.service_id]?.quantity || 0}
                          onChange={(e) => handleServiceAllocationChange(
                            service.service_id,
                            'quantity',
                            parseInt(e.target.value)
                          )}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={serviceAllocations[service.service_id]?.pricePerUnit || 0}
                          onChange={(e) => handleServiceAllocationChange(
                            service.service_id,
                            'pricePerUnit',
                            parseFloat(e.target.value)
                          )}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {((serviceAllocations[service.service_id]?.quantity || 0) * 
                          (serviceAllocations[service.service_id]?.pricePerUnit || 0)).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={(serviceAllocations[service.service_id]?.offerPrice || 0) / 100}
                          onChange={(e) => handleServiceAllocationChange(
                            service.service_id,
                            'offerPrice',
                            parseFloat(e.target.value) * 100
                          )}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
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

        {/* Offer Details Table */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Offer Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quoted Price (€)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calculated Price (€)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Offer (€)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {inquiry.estimated_cost_cents ? (inquiry.estimated_cost_cents / 100).toFixed(2) : '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(calculatedPrice / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(calculatedPrice / 100).toFixed(2)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <OfferForm 
          inquiry={inquiry}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/admin/inquiries/${inquiryId}`)}
        />
      </div>
    </AuthGuard>
  );
}