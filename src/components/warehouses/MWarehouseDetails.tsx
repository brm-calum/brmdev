import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MapPin, Ruler, ArrowLeft, MessageSquare, Euro, Tag, Package } from 'lucide-react';
import { MWarehouse, MWarehouseSpace } from '../../lib/types/m-warehouse';
import { WarehouseFeature } from '../warehouses/WarehouseFeature';
import { WarehouseService } from '../warehouses/WarehouseService';
import { useState } from 'react';

interface MWarehouseDetailsProps {
  warehouse: MWarehouse;
}

export function MWarehouseDetails({ warehouse }: MWarehouseDetailsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSpace, setSelectedSpace] = useState<MWarehouseSpace | null>(null);

  const totalSpace = warehouse.spaces.reduce((sum, space) => sum + space.size_m2, 0);

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
              <div className="mt-2 space-x-2">
                {warehouse.spaces.map(space => (
                  <span
                    key={space.id}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {space.space_type?.name}
                  </span>
                ))}
              </div>
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
                <div>{totalSpace} m²</div>
              </div>
            </div>

            <div className="flex items-center text-gray-600">
              <Euro className="h-5 w-5 mr-2" />
              <div>
                <div className="font-medium">Starting Price</div>
                <div>
                  From €{(Math.min(...warehouse.spaces.map(s => s.price_per_m2_cents)) / 100).toFixed(2)} per m²
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          {warehouse.features?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                <Tag className="h-5 w-5 inline-block mr-2 text-gray-400" />
                Features
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {warehouse.features.map((feature) => feature && feature.id && (
                  <WarehouseFeature 
                    key={`feature-${feature.id}`}
                    feature={feature}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Services Section */}
          {warehouse.services?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                <Package className="h-5 w-5 inline-block mr-2 text-gray-400" aria-hidden="true" />
                Available Services
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {warehouse.services.map((service) => 
                  service && service.id ? (
                    <WarehouseService
                      key={service.id}
                      service={service}
                    />
                  ) : null
                )}
              </div>
            </div>
          )}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Available Spaces</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {warehouse.spaces.map((space) => (
                <div
                  key={space.id}
                  className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                    selectedSpace?.id === space.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-500'
                  }`}
                  onClick={() => setSelectedSpace(space)}
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


          {warehouse.images && warehouse.images.length > 1 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">More Images</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {warehouse.images.slice(1).map((image) => (
                  <img
                    key={image.id}
                    src={image.url}
                    alt={`${warehouse.name} - Additional view`}
                    className="w-full h-48 object-cover rounded-lg"
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