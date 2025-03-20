import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MWarehouseFormData, MSpaceType } from '../../lib/types/m-warehouse';
import { supabase } from '../../lib/supabase';
import { Loader, ImageIcon, Plus, Minus, Clock, Tag, Package } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { FeatureSelector } from './FeatureSelector';
import { ServiceSelector } from './ServiceSelector';

interface MWarehouseFormProps {
  onSubmit: (data: MWarehouseFormData) => Promise<void>;
  initialData?: Partial<MWarehouseFormData>;
  isLoading?: boolean;
}

export function MWarehouseForm({ onSubmit, initialData, isLoading }: MWarehouseFormProps) {
  const navigate = useNavigate();
  const [spaceTypes, setSpaceTypes] = useState<MSpaceType[]>([]);
  const [formData, setFormData] = useState<MWarehouseFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    country: initialData?.country || '',
    postal_code: initialData?.postal_code || '',
    spaces: initialData?.spaces?.length ? initialData.spaces : [{
      space_type_id: '',
      size_m2: 0,
      price_per_m2_cents: 0
    }],
    features: initialData?.features?.map(f => ({
      id: f.id,
      custom_value: f.custom_value
    })) || [],
    services: initialData?.services?.map(s => ({
      id: s.id,
      pricing_type: s.pricing_type || 'ask_quote',
      price_per_hour_cents: s.hourly_rate_cents,
      price_per_unit_cents: s.unit_rate_cents,
      unit_type: s.unit_type,
      notes: s.notes
    })) || [],
    images: initialData?.images || [],
  });

  useEffect(() => {
    loadSpaceTypes();
  }, []);

  const loadSpaceTypes = async () => {
    try {
      const { data } = await supabase
        .from('m_space_types')
        .select('*')
        .order('name');
      if (data) setSpaceTypes(data);
    } catch (err) {
      console.error('Failed to load space types:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation is now handled in the save button click handler
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

  const handleSpaceChange = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      spaces: prev.spaces.map((space, i) => 
        i === index ? { ...space, [field]: value } : space
      ),
    }));
  };

  const addSpace = () => {
    setFormData(prev => ({
      ...prev,
      spaces: [...prev.spaces, {
        space_type_id: spaceTypes[0]?.id || '',
        size_m2: 0,
        price_per_m2_cents: 0
      }],
    }));
  };

  const removeSpace = (index: number) => {
    setFormData(prev => ({
      ...prev,
      spaces: prev.spaces.filter((_, i) => i !== index),
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
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Storage Spaces</h3>
            <button
              type="button"
              onClick={addSpace}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Space
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {formData.spaces.map((space, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-sm font-medium text-gray-900">Space {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeSpace(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Space Type *
                  </label>
                  <select
                    value={space.space_type_id}
                    onChange={(e) => handleSpaceChange(index, 'space_type_id', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  >
                    <option value="">Select a type</option>
                    {spaceTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Size (m²) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={space.size_m2 || ''}
                    onChange={(e) => handleSpaceChange(index, 'size_m2', parseFloat(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price per m² (€) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={space.price_per_m2_cents ? space.price_per_m2_cents / 100 : ''}
                    onChange={(e) => handleSpaceChange(
                      index,
                      'price_per_m2_cents',
                      Math.round(parseFloat(e.target.value) * 100)
                    )}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
            </div>
          ))}

          {formData.spaces.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No spaces added yet. Click "Add Space" to add storage spaces.
            </p>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Tag className="h-5 w-5 mr-2 text-gray-400" />
            Warehouse Features
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Select the features available at your warehouse
          </p>
        </div>
        <FeatureSelector
          selectedFeatures={formData.features}
          onChange={(features) => setFormData(prev => ({ ...prev, features }))}
        />
      </div>

      {/* Services Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2 text-gray-400" />
            Available Services
          </h3>
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
            // Validate spaces
            const validSpaces = formData.spaces.every(space => 
              space.space_type_id && 
              space.size_m2 > 0 && 
              space.price_per_m2_cents > 0
            );

            // Validate services
            const validServices = formData.services.every(service => {
              if (service.pricing_type === 'hourly_rate' && !service.price_per_hour_cents) {
                return false;
              }
              if (service.pricing_type === 'per_unit' && (!service.price_per_unit_cents || !service.unit_type)) {
                return false;
              }
              return true;
            });

            if (!validSpaces) {
              alert('Please fill in all required fields for each space');
              return;
            }

            if (!validServices) {
              alert('Please fill in all required pricing information for selected services');
              return;
            }

            try {
              console.log('Submitting form data:', formData);
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