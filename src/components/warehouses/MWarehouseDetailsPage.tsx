import { useParams, useNavigate } from 'react-router-dom';
import { useMWarehouses } from '../../hooks/useMWarehouses';
import { MWarehouse } from '../../lib/types/m-warehouse';
import { Loader, MapPin, Ruler, ArrowLeft, Euro, Tag, Package } from 'lucide-react';
import { WarehouseFeature } from '../warehouses/WarehouseFeature';
import { WarehouseService } from '../warehouses/WarehouseService';
import { useState } from 'react';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

export function MWarehouseDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchMWarehouse, isLoading, error } = useMWarehouses();
  const [warehouse, setWarehouse] = useState<MWarehouse | null>(null);

  useEffect(() => {
    if (id) {
      fetchMWarehouse(id).then(setWarehouse);
    }
  }, [id, fetchMWarehouse]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !warehouse) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold mb-4">Error loading warehouse</h2>
        <p className="text-gray-600">{error || 'Warehouse not found'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{warehouse.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
              <div className="flex items-start space-x-2 text-gray-600">
                <MapPin className="h-5 w-5 mt-0.5" />
                <span>
                  {warehouse.address}, {warehouse.city}, {warehouse.country}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Size</h2>
              <div className="flex items-center space-x-2 text-gray-600">
                <Ruler className="h-5 w-5" />
                <span>{warehouse.total_size_m2} m²</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Features</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {warehouse.features?.map((feature) => (
                <WarehouseFeature key={feature.id} feature={feature} />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Services</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {warehouse.services?.map((service) => (
                <WarehouseService key={service.id} service={service} />
              ))}
            </div>
          </div>

          {warehouse.spaces && warehouse.spaces.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Spaces</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouse.spaces.map((space) => (
                  <div
                    key={space.id}
                    className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      false
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-500'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900">{space.space_type?.name}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      <p>Size: {space.size_m2} m²</p>
                      <p>Price: €{(space.price_per_m2_cents / 100).toFixed(2)}/m²</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}