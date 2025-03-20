import React from 'react';
import { Construction, Euro, Truck, PackageSearch, Shield } from 'lucide-react';
import { WarehouseService as ServiceType } from '../../lib/types/warehouse';

const SERVICE_ICONS = {
  'Loading/Unloading': Truck,
  'Forklift Operation': PackageSearch,
  'Crane Operation': Construction,
  'Security Personnel': Shield
} as const;

interface WarehouseServiceProps {
  service: ServiceType;
  className?: string;
}

export function WarehouseService({ service, className = '' }: WarehouseServiceProps) {
  if (!service || !service.name) {
    return null;
  }

  const Icon = SERVICE_ICONS[service.name as keyof typeof SERVICE_ICONS] || Construction;

  const renderPrice = () => {
    switch (service.pricing_type) {
    case 'hourly_rate':
      if (!service.hourly_rate_cents) return <p className="text-sm text-gray-500 italic">Contact for pricing</p>;
      return (
        <p className="flex items-center">
          <Euro className="h-4 w-4 mr-1 text-green-600" />
          {(service.hourly_rate_cents / 100).toFixed(2)}/hour
        </p>
      );
    case 'per_unit':
      if (!service.unit_rate_cents || !service.unit_type) {
        return <p className="text-sm text-gray-500 italic">Contact for pricing</p>;
      }
      return (
        <p className="flex items-center">
          <Euro className="h-4 w-4 mr-1 text-green-600" />
          {(service.unit_rate_cents / 100).toFixed(2)}/{service.unit_type}
        </p>
      );
    case 'ask_quote':
    default:
      return <p className="text-sm text-gray-500 italic">Contact for pricing</p>;
    }
  };

  return (
    <div className={`bg-white p-4 rounded-lg border border-gray-200 ${className}`}>
      <div className="flex items-center space-x-2 mb-2">
        <div className="flex-shrink-0">
          <Icon className="h-5 w-5 text-gray-500" />
        </div>
        <h3 className="font-medium text-gray-900">{service.name}</h3>
      </div>
      
      {typeof service.description === 'string' && service.description && (
        <p className="mt-1 text-sm text-gray-500">{service.description}</p>
      )}
      
      <div className="mt-3 text-sm text-gray-700">
        {renderPrice()}
        {typeof service.notes === 'string' && service.notes && (
          <p className="mt-1 text-sm text-gray-500 italic">{service.notes}</p>
        )}
      </div>
    </div>
  );
}