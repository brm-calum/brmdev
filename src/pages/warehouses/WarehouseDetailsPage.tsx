import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWarehouses } from '../../hooks/useWarehouses';
import { useAuth } from '../../contexts/AuthContext';
import { Warehouse, WarehouseFeature as FeatureType, WarehouseService as ServiceType } from '../../lib/types/warehouse';
import { Loader, MapPin, Ruler, ArrowLeft, Euro } from 'lucide-react';
import { WarehouseFeature } from '../../components/warehouses/WarehouseFeature';
import { WarehouseService } from '../../components/warehouses/WarehouseService';
import { useState, useEffect } from 'react';

export function WarehouseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchWarehouse, isLoading, error } = useWarehouses();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);

  useEffect(() => {
    if (id) {
      loadWarehouse(id);
    }
  }, [id]);

  const loadWarehouse = async (warehouseId: string) => {
    try {
      const data = await fetchWarehouse(warehouseId);
      setWarehouse(data);
    } catch (err) {
      console.error('Failed to load warehouse:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !warehouse) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error || 'Warehouse not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="relative h-96">
          {warehouse.images?.[0]?.url ? (
            <img
              src={warehouse.images[0].url}
              alt={warehouse.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{warehouse.name}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                {warehouse.type?.name}
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                €{(warehouse.price_per_m2_cents / 100).toFixed(2)}
              </div>
              <p className="text-sm">
                {warehouse.pricing_type === 'hourly_rate' && warehouse.hourly_rate_cents && (
                  <>€{(warehouse.hourly_rate_cents / 100).toFixed(2)} per hour</>
                )}
                {warehouse.pricing_type === 'per_unit' && warehouse.unit_rate_cents && (
                  <>€{(warehouse.unit_rate_cents / 100).toFixed(2)} per {warehouse.unit_type}</>
                )}
                {warehouse.pricing_type === 'ask_quote' && (
                  <>Ask for quote</>
                )}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900">Description</h2>
            <p className="mt-2 text-gray-600">{warehouse.description}</p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center text-gray-600">
              <MapPin className="h-5 w-5 mr-2" />
              <div>
                <div className="font-medium">Location</div>
                <div>{warehouse.city}, {warehouse.country}</div>
                <div className="text-sm text-gray-500">{warehouse.address}</div>
                <div className="text-sm text-gray-500">{warehouse.postal_code}</div>
              </div>
            </div>

            <div className="flex items-center text-gray-600">
              <Ruler className="h-5 w-5 mr-2" />
              <div>
                <div className="font-medium">Total Capacity</div>
                <div>{warehouse.size_m2} m²</div>
              </div>
            </div>

            <div className="flex items-center text-gray-600">
              <Euro className="h-5 w-5 mr-2" />
              <div>
                <div className="font-medium">Price</div>
                <div>€{(warehouse.price_per_m2_cents / 100).toFixed(2)} per m² / day</div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/warehouses', { state: { viewMode: 'map', selectedId: warehouse.id } })}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                type="button"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Show on Map
              </button>
            <button
              onClick={() => {
                if (user) {
                  setShowInquiryForm(true);
                } else {
                  navigate('/login', { state: { from: `/warehouses/${id}` } });
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Inquiry
            </button>
            </div>
          </div>

          {warehouse.features?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Features</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {warehouse.features?.map((feature: FeatureType) => feature && (
                  <WarehouseFeature key={feature.id} feature={feature} />
                ))}
              </div>
            </div>
          )}

          {warehouse.images && warehouse.images.length > 1 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">More Images</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {warehouse.images.slice(1).map((image, index) => (
                  image.url && (
                    <img
                      key={image.id || index}
                      src={image.url}
                      alt={`${warehouse.name} - Image ${index + 2}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )
                ))}
              </div>
            </div>
          )}

          {warehouse.services?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Available Services</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {warehouse.services.map((service: ServiceType) => service && (
                  <WarehouseService key={service.id} service={service} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Inquiry Form Modal */}
      {showInquiryForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Send Inquiry for {warehouse.name}
            </h2>
            <InquiryForm
              warehouseId={warehouse.id}
              warehouseSize={warehouse.size_m2}
              onSuccess={() => {
                setShowInquiryForm(false);
                navigate('/inquiries');
              }}
              onCancel={() => setShowInquiryForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}