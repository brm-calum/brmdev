import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WarehouseFormData, WarehouseType } from '../../lib/types/warehouse';
import { supabase } from '../../lib/supabase';
import { Loader, ImageIcon, Clock } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { FeatureSelector } from './FeatureSelector';
import { ServiceSelector } from './ServiceSelector';

interface WarehouseFormProps {
  onSubmit: (data: WarehouseFormData) => Promise<void>;
  initialData?: Partial<WarehouseFormData>;
  isLoading?: boolean;
}

export function WarehouseForm({ onSubmit, initialData, isLoading }: WarehouseFormProps) {
  const navigate = useNavigate();
  const [warehouseTypes, setWarehouseTypes] = useState<WarehouseType[]>([]);
  const [formData, setFormData] = useState<WarehouseFormData>({
    name: initialData?.name || '',
    type_id: initialData?.type_id || '',
    description: initialData?.description || '',
    size_m2: initialData?.size_m2 || '',
    price_per_m2_cents: initialData?.price_per_m2_cents || '',
    operating_hours: initialData?.operating_hours || 'business_hours',
    custom_hours: initialData?.custom_hours || undefined,
    address: initialData?.address || '',
    city: initialData?.city || '',
    country: initialData?.country || '',
    postal_code: initialData?.postal_code || '',
    features: initialData?.features?.map(f => ({
      id: f.id,
      custom_value: f.custom_value
    })) || [],
    services: initialData?.services?.map(s => ({
      id: s.id,
      pricing_type: s.pricing_type,
      price_per_hour_cents: s.hourly_rate_cents,
      price_per_unit_cents: s.unit_rate_cents,
      unit_type: s.unit_type,
      notes: s.notes
    })) || [],
    images: initialData?.images?.map(img => ({
      url: img.url,
      order: img.order
    })) || [],
  });

  useEffect(() => {
    loadWarehouseTypes();
  }, []);

  const loadWarehouseTypes = async () => {
    try {
      const { data } = await supabase
        .from('warehouse_types')
        .select('*')
        .order('name');
      if (data) setWarehouseTypes(data);
    } catch (err) {
      console.error('Failed to load warehouse types:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only submit when Save button is clicked
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value),
    }));
  };

  const handleFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const feature = e.target.value;
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleImagesChange = (newImages: { url: string; order: number }[]) => {
    setFormData(prev => ({
      ...prev,
      images: newImages,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Warehouse Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="type_id" className="block text-sm font-medium text-gray-700">
              Type *
            </label>
            <select
              id="type_id"
              name="type_id"
              required
              value={formData.type_id}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="">Select a type</option>
              {warehouseTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="size_m2" className="block text-sm font-medium text-gray-700">
              Size (m²) *
            </label>
            <input
              type="number"
              id="size_m2"
              name="size_m2"
              required
              min="0"
              step="0.01"
              value={formData.size_m2 === '' ? '' : formData.size_m2}
              onChange={handleNumberChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="price_per_m2_cents" className="block text-sm font-medium text-gray-700">
              Price per m² (€) *
            </label>
            <input
              type="number"
              id="price_per_m2_cents"
              name="price_per_m2_cents"
              required
              min="0"
              step="0.01"
              value={formData.price_per_m2_cents === '' ? '' : formData.price_per_m2_cents / 100}
              onChange={(e) => {
                const euros = e.target.value === '' ? '' : parseFloat(e.target.value);
                setFormData(prev => ({
                  ...prev,
                  price_per_m2_cents: euros === '' ? '' : Math.round(euros * 100),
                }));
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address *
            </label>
            <input
              type="text"
              id="address"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City *
            </label>
            <input
              type="text"
              id="city"
              name="city"
              required
              value={formData.city}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
              Postal Code *
            </label>
            <input
              type="text"
              id="postal_code"
              name="postal_code"
              required
              value={formData.postal_code}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country *
            </label>
            <input
              type="text"
              id="country"
              name="country"
              required
              value={formData.country}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gray-400" />
            Operating Hours
          </h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Hours Type</label>
            <select
              name="operating_hours"
              value={formData.operating_hours}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="24_7">Open 24/7</option>
              <option value="business_hours">Business Hours (9-5)</option>
              <option value="custom">Custom Hours</option>
            </select>
          </div>

          {formData.operating_hours === 'custom' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                <div key={day}>
                  <label className="block text-sm font-medium text-gray-700 capitalize">
                    {day}
                  </label>
                  <div className="mt-1 flex space-x-2">
                    <input
                      type="time"
                      value={formData.custom_hours?.[day]?.open || ''}
                      onChange={(e) => {
                        const newHours = {
                          ...formData.custom_hours,
                          [day]: {
                            ...formData.custom_hours?.[day],
                            open: e.target.value
                          }
                        };
                        setFormData(prev => ({
                          ...prev,
                          custom_hours: newHours
                        }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                    <input
                      type="time"
                      value={formData.custom_hours?.[day]?.close || ''}
                      onChange={(e) => {
                        const newHours = {
                          ...formData.custom_hours,
                          [day]: {
                            ...formData.custom_hours?.[day],
                            close: e.target.value
                          }
                        };
                        setFormData(prev => ({
                          ...prev,
                          custom_hours: newHours
                        }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">Features</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select the features available at your warehouse
          </p>
        </div>
        <FeatureSelector
          selectedFeatures={formData.features}
          onChange={(features) => setFormData(prev => ({ ...prev, features }))}
        />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">Services</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select and configure available services
          </p>
        </div>
        <ServiceSelector
          selectedServices={formData.services}
          onChange={(services) => setFormData(prev => ({ ...prev, services }))}
        />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ImageIcon className="h-5 w-5 mr-2 text-gray-400" />
            Warehouse Images
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add photos of your warehouse space to attract potential customers
          </p>
        </div>
        <ImageUpload
          images={formData.images}
          onChange={handleImagesChange}
          maxImages={5}
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await onSubmit(formData);
            } catch (err) {
              console.error('Failed to save warehouse:', err);
            }
          }}
          disabled={isLoading}
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Warehouse'
          )}
        </button>
      </div>
    </form>
  );
}