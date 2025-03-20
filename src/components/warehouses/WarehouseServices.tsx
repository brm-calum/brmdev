import React from 'react';
import { Truck, PackageSearch, Construction, Shield } from 'lucide-react';
import { WarehouseService } from '../../lib/types/warehouse';

interface WarehouseServicesProps {
  services: WarehouseService[];
  className?: string;
}

const SERVICE_ICONS = {
  'truck-loading': Truck,
  forklift: PackageSearch,
  crane: Construction,
  shield: Shield,
};

export function WarehouseServices({ services, className = '' }: WarehouseServicesProps) {
  const formatPrice = (cents: number | undefined) => {
    if (!cents) return '';
    return `€${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {services.map((service) => {
        const Icon = service.icon ? SERVICE_ICONS[service.icon as keyof typeof SERVICE_ICONS] : undefined;
        
        return (
          <div
            key={service.id}
            className="bg-white p-4 rounded-lg border border-gray-200"
          >
            <div className="flex items-start">
              {Icon && (
                <div className="flex-shrink-0">
                  <Icon className="h-6 w-6 text-green-600" />
                </div>
              )}
              <div className="ml-3 flex-1">
                <h4 className="text-lg font-medium text-gray-900">{service.name}</h4>
                {service.description && (
                  <p className="mt-1 text-sm text-gray-500">{service.description}</p>
                )}
                <div className="mt-2 space-y-1">
                  {service.price_per_hour_cents && (
                    <p className="text-sm text-gray-700">
                      {formatPrice(service.price_per_hour_cents)}/hour
                    </p>
                  )}
                  {service.price_per_unit_cents && service.unit_type && (
                    <p className="text-sm text-gray-700">
                      {formatPrice(service.price_per_unit_cents)}/{service.unit_type}
                    </p>
                  )}
                  {service.notes && (
                    <p className="text-sm text-gray-500 italic">{service.notes}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}