import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMWarehouses } from '../../hooks/useMWarehouses';
import { MWarehouse } from '../../lib/types/m-warehouse';
import { Loader } from 'lucide-react';
import { MWarehouseCard } from './MWarehouseCard';

interface MWarehouseListProps {
  filters: {
    search: string;
    minSize: string;
    maxSize: string;
    minPrice: string;
    maxPrice: string;
    city: string;
    country: string;
    spaceTypes: string[];
  };
  onWarehousesLoaded?: (warehouses: MWarehouse[]) => void;
}

export function MWarehouseList({ filters, onWarehousesLoaded }: MWarehouseListProps) {
  const navigate = useNavigate();
  const { fetchMWarehouses, isLoading, error } = useMWarehouses();
  const [warehouses, setWarehouses] = useState<MWarehouse[]>([]);

  // Share warehouses with parent component
  useEffect(() => {
    if (warehouses.length > 0) {
      onWarehousesLoaded?.(warehouses);
    }
  }, [warehouses, onWarehousesLoaded]);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await fetchMWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  const handleWarehouseClick = useCallback((id: string) => {
    navigate(`/m-warehouses/${id}`);
  }, [navigate]);

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(warehouse => {
      const matchesSearch = !filters.search || 
        [
          warehouse.name,
          warehouse.description,
          warehouse.city,
          warehouse.country
        ].some(field => 
          field?.toLowerCase().includes(filters.search.toLowerCase())
        );

      // Calculate total space
      const totalSpace = warehouse.spaces.reduce((sum, space) => sum + space.size_m2, 0);
      const matchesSize = (!filters.minSize || totalSpace >= parseFloat(filters.minSize)) &&
        (!filters.maxSize || totalSpace <= parseFloat(filters.maxSize));

      // Find minimum price across all spaces
      const minPrice = Math.min(...warehouse.spaces.map(s => s.price_per_m2_cents)) / 100;
      const matchesPrice = (!filters.minPrice || minPrice >= parseFloat(filters.minPrice)) &&
        (!filters.maxPrice || minPrice <= parseFloat(filters.maxPrice));

      const matchesLocation = (!filters.city || warehouse.city.toLowerCase().includes(filters.city.toLowerCase())) &&
        (!filters.country || warehouse.country.toLowerCase().includes(filters.country.toLowerCase()));

      // Match space types
      const matchesSpaceTypes = filters.spaceTypes.length === 0 || 
        filters.spaceTypes.every(typeId =>
          warehouse.spaces.some(space => space.space_type_id === typeId)
        );

      return matchesSearch && matchesSize && matchesPrice && matchesLocation && 
             matchesSpaceTypes;
    });
  }, [warehouses, filters]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        {error}
      </div>
    );
  }

  return (
    <div>
      {filteredWarehouses.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No warehouses found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your search criteria
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredWarehouses.map((warehouse) => (
            <MWarehouseCard
              key={warehouse.id}
              warehouse={warehouse}
            />
          ))}
        </div>
      )}
    </div>
  );
}