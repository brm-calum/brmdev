import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useInquiries } from '../../hooks/useInquiries';
import { useMWarehouses } from '../../hooks/useMWarehouses';
import { supabase } from '../../lib/supabase';
import { InquiryFormData, SpaceRequest } from '../../lib/types/inquiry';
import { Calendar, User, MapPin, Layers, Package, Tag, Info, Clock, AlertCircle } from 'lucide-react';
import { WarehouseSelector } from './WarehouseSelector';
import { SpaceRequestForm } from './SpaceRequestForm';

interface InquiryFormProps {
  initialData?: InquiryFormData;
  onSubmit: (data: InquiryFormData) => Promise<void>;
  onCancel?: () => void;
}

export function InquiryForm({ initialData, onSubmit, onCancel }: InquiryFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchMWarehouses } = useMWarehouses();
  
  const [warehouses, setWarehouses] = useState([]);
  const [services, setServices] = useState([]);
  const [features, setFeatures] = useState([]);
  const [spaceTypes, setSpaceTypes] = useState([]);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<InquiryFormData>({
    warehouse_ids: initialData?.warehouse_ids || [],
    service_ids: initialData?.service_ids || [],
    feature_ids: initialData?.feature_ids || [],
    space_requests: initialData?.space_requests || [],
    start_date: initialData?.start_date || new Date(),
    end_date: initialData?.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
    notes: initialData?.notes || ''
  });

  // Load warehouses, services, features, and space types
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load warehouses
        const warehouseData = await fetchMWarehouses();
        setWarehouses(warehouseData);

        // Load services
        const { data: servicesData } = await supabase
          .from('warehouse_services')
          .select('id, name')
          .order('name');
        setServices(servicesData || []);

        // Load features
        const { data: featuresData } = await supabase
          .from('warehouse_features')
          .select('id, name')
          .order('name');
        setFeatures(featuresData || []);

        // Load space types
        const { data: spaceTypesData } = await supabase
          .from('m_space_types')
          .select('id, name')
          .order('name');
        setSpaceTypes(spaceTypesData || []);
      } catch (err) {
        console.error('Failed to load data:', err);
        setFormError('Failed to load form data. Please try again.');
      }
    };
    
    loadData();
  }, []);

  // Calculate estimated cost when form data changes
  useEffect(() => {
    const calculateEstimatedCost = () => {
      if (formData.warehouse_ids.length === 0 || formData.space_requests.length === 0) {
        setEstimatedCost(null);
        return;
      }

      try {
        // Find selected warehouses
        const selectedWarehouses = warehouses.filter(w => 
          formData.warehouse_ids.includes(w.id)
        );

        if (!selectedWarehouses.length) {
          setEstimatedCost(null);
          return;
        }

        // Calculate number of days
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (days <= 0) {
          setEstimatedCost(null);
          return;
        }

        // Calculate cost based on space requests and lowest price per m² in each warehouse
        let totalCost = 0;
        formData.space_requests.forEach(request => {
          selectedWarehouses.forEach(warehouse => {
            if (warehouse.spaces && warehouse.spaces.length > 0) {
              const matchingSpaces = warehouse.spaces.filter(s => s.space_type_id === request.space_type_id);
              if (matchingSpaces.length > 0) {
                const minPrice = Math.min(...matchingSpaces.map(s => s.price_per_m2_cents));
                const spaceCost = minPrice * request.size_m2 * days;
                totalCost += spaceCost;
              }
            }
          });
        });

        setEstimatedCost(totalCost / 100); // Convert cents to currency units
      } catch (err) {
        console.error('Error calculating cost:', err);
        setEstimatedCost(null);
      }
    };

    calculateEstimatedCost();
  }, [formData, warehouses]);

  const handleWarehouseChange = (selectedIds: string[]) => {
    setFormData(prev => ({
      ...prev,
      warehouse_ids: selectedIds
    }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => {
      const newServiceIds = prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId];
      
      return {
        ...prev,
        service_ids: newServiceIds
      };
    });
  };

  const handleFeatureToggle = (featureId: string) => {
    setFormData(prev => {
      const newFeatureIds = prev.feature_ids.includes(featureId)
        ? prev.feature_ids.filter(id => id !== featureId)
        : [...prev.feature_ids, featureId];
      
      return {
        ...prev,
        feature_ids: newFeatureIds
      };
    });
  };

  const handleSpaceRequestsChange = (requests: SpaceRequest[]) => {
    setFormData(prev => ({
      ...prev,
      space_requests: requests
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    
    // Convert space requests to the expected format
    const spaceRequests = formData.space_requests.map(request => ({
      space_type_id: request.space_type_id,
      size_m2: request.size_m2
    }));

    try {
      // Validate form
      if (formData.warehouse_ids.length === 0) {
        throw new Error('Please select at least one warehouse');
      }

      if (formData.space_requests.length === 0) {
        throw new Error('Please add at least one space request');
      }

      if (formData.space_requests.some(request => request.size_m2 <= 0)) {
        throw new Error('Please enter valid space requirements');
      }
      
      const submitData = {
        ...formData,
        space_requests: spaceRequests
      };

      // Submit form data
      await onSubmit(submitData);
    } catch (err) {
      console.error('Submit error:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to submit inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        {initialData ? (
          <h2 className="text-xl font-semibold text-gray-800">Edit Booking Inquiry</h2>
        ) : (
          <h2 className="text-xl font-semibold text-gray-800">New Booking Inquiry</h2>
        )}
        <p className="mt-1 text-sm text-gray-500">
          {initialData ? 'Edit your inquiry details' : 'Submit an inquiry for warehouse space'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {formError && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm">{formError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Warehouse Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline-block w-5 h-5 mr-2 text-gray-400" />
              Select Warehouses
            </label>
            <WarehouseSelector 
              warehouses={warehouses}
              selectedIds={formData.warehouse_ids}
              onChange={handleWarehouseChange}
            />
          </div>

          {/* Space Requirements */}
          <SpaceRequestForm
            spaceRequests={formData.space_requests}
            spaceTypes={spaceTypes}
            onChange={handleSpaceRequestsChange}
          />

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline-block w-5 h-5 mr-2 text-gray-400" />
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date instanceof Date 
                  ? formData.start_date.toISOString().split('T')[0]
                  : formData.start_date}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  start_date: new Date(e.target.value)
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline-block w-5 h-5 mr-2 text-gray-400" />
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                value={formData.end_date instanceof Date 
                  ? formData.end_date.toISOString().split('T')[0]
                  : formData.end_date}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  end_date: new Date(e.target.value)
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
          </div>

          {/* Required Services */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Package className="inline-block w-5 h-5 mr-2 text-gray-400" />
              Required Services
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {services.map(service => (
                <div key={service.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`service-${service.id}`}
                    checked={formData.service_ids.includes(service.id)}
                    onChange={() => handleServiceToggle(service.id)}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor={`service-${service.id}`} className="ml-2 block text-sm text-gray-700">
                    {service.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Required Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="inline-block w-5 h-5 mr-2 text-gray-400" />
              Required Features
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {features.map(feature => (
                <div key={feature.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`feature-${feature.id}`}
                    checked={formData.feature_ids.includes(feature.id)}
                    onChange={() => handleFeatureToggle(feature.id)}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor={`feature-${feature.id}`} className="ml-2 block text-sm text-gray-700">
                    {feature.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              <Info className="inline-block w-5 h-5 mr-2 text-gray-400" />
              Additional Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              placeholder="Any specific requirements or information..."
            />
          </div>

          {/* Estimated Cost */}
          {estimatedCost !== null && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Estimated Cost
              </h3>
              <p className="mt-2 text-green-700 text-lg font-bold">
                €{estimatedCost.toFixed(2)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                Final price may vary based on space availability and additional services
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mr-3"
              >
                Cancel
              </button>
            )}
            {!onCancel && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mr-3"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || formData.warehouse_ids.length === 0 || formData.space_requests.length === 0}
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : initialData ? 'Update Inquiry' : 'Submit Inquiry'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}