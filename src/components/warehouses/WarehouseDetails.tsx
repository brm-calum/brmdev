import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MapPin, Ruler, Euro } from 'lucide-react';
import { Warehouse as WarehouseType } from '../../lib/types/warehouse';
import { WarehouseFeatures } from './WarehouseFeatures';
import { WarehouseServices } from './WarehouseServices';
import { OperatingHours } from './OperatingHours';

interface WarehouseDetailsProps {
  warehouse: WarehouseType;
}

export function WarehouseDetails({ warehouse }: WarehouseDetailsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {warehouse.images?.[0] && (
            <img
              src={warehouse.images[0].url}
              alt={warehouse.name}
              className="w-full h-64 object-cover rounded-lg"
            />
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{warehouse.name}</h1>
            <p className="mt-2 text-gray-500">{warehouse.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center text-gray-600">
              <MapPin className="h-5 w-5 mr-2" />
              <div>
                <div className="font-medium">Location</div>
                <div>{warehouse.city}, {warehouse.country}</div>
                <div className="text-sm text-gray-500">{warehouse.address}</div>
              </div>
            </div>

            <div className="flex items-center text-gray-600">
              <Ruler className="h-5 w-5 mr-2" />
              <div>
                <div className="font-medium">Size</div>
                <div>{warehouse.size_m2} m²</div>
              </div>
            </div>

            <div className="flex items-center text-gray-600">
              <Euro className="h-5 w-5 mr-2" />
              <div>
                <div className="font-medium">Price</div>
                <div>
                  {warehouse.pricing_type === 'per_unit' && warehouse.unit_rate_cents && (
                    <>€{(warehouse.unit_rate_cents / 100).toFixed(2)} per {warehouse.unit_type}</>
                  )}
                  {warehouse.pricing_type === 'ask_quote' && (
                    <>Ask for quote</>
                  )}
                  {warehouse.pricing_type === 'hourly_rate' && warehouse.hourly_rate_cents && (
                    <>€{(warehouse.hourly_rate_cents / 100).toFixed(2)} per hour</>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center text-gray-600">
              <OperatingHours 
                type={warehouse.operating_hours}
                customHours={warehouse.custom_hours}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {warehouse.features?.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Features</h2>
            <WarehouseFeatures features={warehouse.features} />
          </div>
        )}

        {warehouse.services?.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Available Services</h2>
            <WarehouseServices services={warehouse.services} />
          </div>
        )}
      </div>

      {warehouse.images && warehouse.images.length > 1 && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">More Images</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {warehouse.images.slice(1).map((image, index) => (
              <img
                key={index}
                src={image.url}
                alt={`${warehouse.name} - Image ${index + 2}`}
                className="w-full h-48 object-cover rounded-lg"
              />
            ))}
          </div>
        </div>
      )}

      
    </div>
  );
}