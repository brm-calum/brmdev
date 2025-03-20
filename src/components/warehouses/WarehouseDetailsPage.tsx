import { useParams, useNavigate } from 'react-router-dom';
import { useWarehouses } from '../../hooks/useWarehouses';
import { useAuth } from '../../contexts/AuthContext';
import { Warehouse } from '../../lib/types/warehouse';
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

  useEffect(() => {
    if (id) {
      fetchWarehouse(id).then((fetchedWarehouse) => {
        setWarehouse(fetchedWarehouse);
      });
    }
  }, [id, fetchWarehouse]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (error || !warehouse) {
    return <div>Error loading warehouse details</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold">{warehouse.name}</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          {warehouse.images && warehouse.images.length > 0 && (
            <img
              src={warehouse.images[0]}
              alt={warehouse.name}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
          )}

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-100 p-4 rounded-lg">
              <MapPin className="mx-auto mb-2" />
              <p className="text-sm">{warehouse.address}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <Ruler className="mx-auto mb-2" />
              <p className="text-sm">{warehouse.size_m2} m²</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <Euro className="mx-auto mb-2" />
              <p className="text-sm">{warehouse.price_per_month} / month</p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/warehouses', { state: { viewMode: 'map', selectedId: warehouse.id } })}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              type="button"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Show on Map
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Description</h2>
          <p className="text-gray-600 mb-6">{warehouse.description}</p>

          {warehouse.amenities && warehouse.amenities.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Amenities</h2>
              <ul className="list-disc list-inside">
                {warehouse.amenities.map((amenity, index) => (
                  <li key={index} className="text-gray-600">
                    {amenity}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warehouse.images && warehouse.images.length > 1 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">More Images</h2>
              <div className="grid grid-cols-3 gap-4">
                {warehouse.images.slice(1).map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${warehouse.name} - Image ${index + 2}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}