import React from 'react';
import { Truck, PackageSearch, Shield, Construction } from 'lucide-react';
import { WarehouseFeature as FeatureType } from '../../lib/types/warehouse';

const FEATURE_ICONS = {
  'accessibility': Truck,
  'equipment': PackageSearch,
  'security': Shield,
  'custom': Construction
} as const;

const FEATURE_NAMES = {
  'Small Truck Access': 'accessibility',
  'Large Truck Access': 'accessibility',
  'Hand Forklift': 'equipment',
  'Heavy Forklift': 'equipment',
  'Crane': 'equipment',
  'Security System': 'security',
  'CCTV': 'security'
} as const;
interface WarehouseFeatureProps {
  feature: FeatureType;
  className?: string;
}

export function WarehouseFeature({ feature, className = '' }: WarehouseFeatureProps) {
  if (!feature || !feature.name) {
    return null;
  }

  const Icon = FEATURE_ICONS[feature.type] || Construction;
  
  return (
    <div className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-lg ${className}`}>
      <div className="flex-shrink-0">
        <Icon className="h-5 w-5 text-green-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{feature.name}</p>
        {typeof feature.custom_value === 'string' && feature.custom_value && (
          <p className="text-sm text-gray-500">{feature.custom_value}</p>
        )}
      </div>
    </div>
  );
}