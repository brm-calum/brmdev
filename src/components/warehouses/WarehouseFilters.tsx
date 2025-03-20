import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface WarehouseFilters {
  search: string;
  minSize: string;
  maxSize: string;
  minPrice: string;
  maxPrice: string;
  city: string;
  country: string;
  features: string[];
  services: string[];
}

interface WarehouseFiltersProps {
  filters: WarehouseFilters;
  onChange: (filters: WarehouseFilters) => void;
  availableFeatures: { id: string; name: string; }[];
  availableServices: { id: string; name: string; }[];
}

export function WarehouseFilters({ filters, onChange, availableFeatures, availableServices }: WarehouseFiltersProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...filters, [name]: value });
  };

  const handleFeatureToggle = (featureId: string) => {
    const newFeatures = filters.features.includes(featureId)
      ? filters.features.filter(id => id !== featureId)
      : [...filters.features, featureId];
    onChange({ ...filters, features: newFeatures });
  };

  const handleServiceToggle = (serviceId: string) => {
    const newServices = filters.services.includes(serviceId)
      ? filters.services.filter(id => id !== serviceId)
      : [...filters.services, serviceId];
    onChange({ ...filters, services: newServices });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleChange}
            placeholder="Search by name, city, or country..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Size (m²)</label>
            <div className="mt-1 flex space-x-2">
              <input
                type="number"
                name="minSize"
                value={filters.minSize}
                onChange={handleChange}
                placeholder="Min"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
              <input
                type="number"
                name="maxSize"
                value={filters.maxSize}
                onChange={handleChange}
                placeholder="Max"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Price per m² (€)</label>
            <div className="mt-1 flex space-x-2">
              <input
                type="number"
                name="minPrice"
                value={filters.minPrice}
                onChange={handleChange}
                placeholder="Min"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
              <input
                type="number"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleChange}
                placeholder="Max"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <div className="mt-1 flex space-x-2">
              <input
                type="text"
                name="city"
                value={filters.city}
                onChange={handleChange}
                placeholder="City"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
              <input
                type="text"
                name="country"
                value={filters.country}
                onChange={handleChange}
                placeholder="Country"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableFeatures.map(feature => (
                  <label key={feature.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.features.includes(feature.id)}
                      onChange={() => handleFeatureToggle(feature.id)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{feature.name}</span>
                  </label>
                ))}
                {availableFeatures.length === 0 && (
                  <p className="text-sm text-gray-500">No features available</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableServices.map(service => (
                  <label key={service.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.services.includes(service.id)}
                      onChange={() => handleServiceToggle(service.id)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{service.name}</span>
                  </label>
                ))}
                {availableServices.length === 0 && (
                  <p className="text-sm text-gray-500">No services available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}