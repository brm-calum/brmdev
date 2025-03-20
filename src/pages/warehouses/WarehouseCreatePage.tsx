import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WarehouseForm } from '../../components/warehouses/WarehouseForm';
import { useWarehouses } from '../../hooks/useWarehouses';
import { useAuth } from '../../contexts/AuthContext';
import { WarehouseFormData } from '../../lib/types/warehouse';
import { useEffect } from 'react';

export function WarehouseCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createWarehouse, isLoading } = useWarehouses();

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/warehouses/create' } });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (data: WarehouseFormData) => {
    try {
      await createWarehouse(data);
      navigate('/warehouses');
    } catch (err) {
      console.error('Failed to create warehouse:', err);
    }
  };

  return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Add New Warehouse
              </h2>
            </div>
          </div>
          <div className="mt-8">
            <WarehouseForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </div>
      </div>
  );
}