import React from 'react';
import { Truck, PackageSearch, Shield, Construction, Forklift, Hammer } from 'lucide-react';
import { WarehouseFeature } from '../../lib/types/warehouse';

// Type mapping for features
const TYPE_ICONS = {
  accessibility: Truck,
  equipment: PackageSearch,
  security: Shield,
  custom: Construction
} as const;

// Specific feature name to icon mapping
interface WarehouseFeaturesProps {
  features: WarehouseFeature[];
  className?: string;
}

const FEATURE_ICONS: Record<string, typeof Truck> = {
  'Small Truck Access': Truck,
  'Large Truck Access': Truck,
  'Hand Forklift': Forklift,
  'Heavy Forklift': Forklift,
  'Crane': Hammer,
  'Security System': Shield,
  'CCTV': Shield
};

const getIconForFeature = (feature: WarehouseFeature) => {
  if (!feature) {
    return Construction;
  }

  // Try exact name match first
  const nameMatch = FEATURE_ICONS[feature.name];
  if (nameMatch) {
    return nameMatch;
  }

  // Fall back to type-based icon
  return TYPE_ICONS[feature.type] || Construction;
};

export function WarehouseFeatures({ features, className = '' }: WarehouseFeaturesProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {Array.isArray(features) && features.map((feature) => {
        if (!feature) return null;
        
        const Icon = getIconForFeature(feature);
        
        return (
          <div
            key={feature.id}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
          >
            <Icon className="h-4 w-4 mr-2" />
            <span>{feature.name}</span>
            {feature.custom_value && (
              <span className="ml-1 text-gray-500">: {feature.custom_value}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}