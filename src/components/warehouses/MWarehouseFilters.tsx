import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MSpaceType } from '../../lib/types/m-warehouse';

interface MWarehouseFilters {
  search: string;
  minSize: string;
  maxSize: string;
  minPrice: string;
  maxPrice: string;
  city: string;
  country: string;
  spaceTypes: string[];
}

interface MWarehouseFiltersProps {
  filters: MWarehouseFilters;
  onChange: (filters: MWarehouseFilters) => void;
}

export function MWarehouseFilters({ filters, onChange }: MWarehouseFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [spaceTypes, setSpaceTypes] = useState<MSpaceType[]>([]);

  useEffect(() => {
    loadSpaceTypes();
  }, []);

  const loadSpaceTypes = async () => {
    try {
      const { data } = await supabase
        .from('m_space_types')
        .select('*')
        .order('name');
      if (data) setSpaceTypes(data);
    } catch (err) {
      console.error('Failed to load space types:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...filters, [name]: value });
  };

  const handleSpaceTypeToggle = (typeId: string) => {
    const newTypes = filters.spaceTypes.includes(typeId)
      ? filters.spaceTypes.filter(id => id !== typeId)
      : [...filters.spaceTypes, typeId];
    onChange({ ...filters, spaceTypes: newTypes });
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

          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Space Types
            </label>
            <div className="flex flex-wrap gap-2">
              {spaceTypes.map(type => (
                <label
                  key={type.id}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                    filters.spaceTypes.includes(type.id)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={filters.spaceTypes.includes(type.id)}
                    onChange={() => handleSpaceTypeToggle(type.id)}
                  />
                  {type.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}