import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMWarehouses } from '../../hooks/useMWarehouses';
import { MWarehouse } from '../../lib/types/m-warehouse';
import { Loader } from 'lucide-react';
import { MWarehouseDetails } from '../../components/warehouses/MWarehouseDetails';

export function MWarehouseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchMWarehouse, isLoading, error } = useMWarehouses();
  const [warehouse, setWarehouse] = useState<MWarehouse | null>(null);

  useEffect(() => {
    if (id) {
      loadWarehouse(id);
    }
  }, [id]);

  const loadWarehouse = async (warehouseId: string) => {
    try {
      const data = await fetchMWarehouse(warehouseId);
      setWarehouse(data);
    } catch (err) {
      console.error('Failed to load warehouse:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !warehouse) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error || 'Warehouse not found'}
        </div>
      </div>
    );
  }

  return <MWarehouseDetails warehouse={warehouse} />;
}