import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarehouses } from '../../hooks/useWarehouses';
import { Warehouse as WarehouseType } from '../../lib/types/warehouse';
import { Loader } from 'lucide-react';
import { WarehouseCard } from './WarehouseCard';
import { WarehouseFilters } from './WarehouseFilters';

interface WarehouseListProps {
  filters: {
    search: string;
    minSize: string;
    maxSize: string;
    minPrice: string;
    maxPrice: string;
    city: string;
    country: string;
    features: string[];
    services: string[];
  };
  onWarehousesLoaded?: (warehouses: WarehouseType[]) => void;
}

export function WarehouseList({ filters, onWarehousesLoaded }: WarehouseListProps) {
  const navigate = useNavigate();
  const { fetchWarehouses, isLoading, error } = useWarehouses();
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);

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
      const data = await fetchWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  const handleWarehouseClick = useCallback((id: string) => {
    navigate(`/warehouses/${id}`);
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

      const matchesSize = (!filters.minSize || warehouse.size_m2 >= parseFloat(filters.minSize)) &&
        (!filters.maxSize || warehouse.size_m2 <= parseFloat(filters.maxSize));

      const pricePerM2 = warehouse.price_per_m2_cents / 100;
      const matchesPrice = (!filters.minPrice || pricePerM2 >= parseFloat(filters.minPrice)) &&
        (!filters.maxPrice || pricePerM2 <= parseFloat(filters.maxPrice));

      const matchesLocation = (!filters.city || warehouse.city.toLowerCase().includes(filters.city.toLowerCase())) &&
        (!filters.country || warehouse.country.toLowerCase().includes(filters.country.toLowerCase()));

      // Match features
      const matchesFeatures = filters.features.length === 0 || 
        filters.features.every(featureId =>
          warehouse.features?.some(f => f.id === featureId)
        );

      // Match services
      const matchesServices = filters.services.length === 0 ||
        filters.services.every(serviceId =>
          warehouse.services?.some(s => s.id === serviceId)
        );
      return matchesSearch && matchesSize && matchesPrice && matchesLocation && 
             matchesFeatures && matchesServices;
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
            <WarehouseCard
              key={warehouse.id}
              warehouse={warehouse}
            />
          ))}
        </div>
      )}
    </div>
  );
}