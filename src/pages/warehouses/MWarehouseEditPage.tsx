import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { MWarehouseForm } from '../../components/warehouses/MWarehouseForm';
import { useMWarehouses } from '../../hooks/useMWarehouses';
import { MWarehouse, MWarehouseFormData } from '../../lib/types/m-warehouse';
import { Loader } from 'lucide-react';

export function MWarehouseEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchMWarehouse, updateMWarehouse, isLoading } = useMWarehouses();
  const [warehouse, setWarehouse] = useState<MWarehouse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError('Failed to load warehouse');
      console.error('Failed to load warehouse:', err);
    }
  };

  const handleSubmit = async (data: MWarehouseFormData) => {
    if (!id) return;
    try {
      await updateMWarehouse(id, data);
      navigate('/m-warehouses/dashboard');
    } catch (err) {
      console.error('Failed to update warehouse:', err);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        {error}
      </div>
    );
  }

  if (!warehouse && isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <AuthGuard requiredRoles={['warehouse_owner']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Edit Multi-Space Warehouse
              </h2>
            </div>
          </div>
          <div className="mt-8">
            {warehouse && (
              <MWarehouseForm
                initialData={warehouse}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}