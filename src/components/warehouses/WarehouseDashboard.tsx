import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWarehouses } from '../../hooks/useWarehouses';
import { useAuth } from '../../contexts/AuthContext';
import { Warehouse } from '../../lib/types/warehouse';
import { Loader, Edit, Copy, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export function WarehouseDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchWarehouses, toggleWarehouseStatus, deleteWarehouse, duplicateWarehouse, isLoading } = useWarehouses();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [deleteWarehouseId, setDeleteWarehouseId] = useState<string | null>(null);

  const loadWarehouses = async () => {
    try {
      const data = await fetchWarehouses();
      const userWarehouses = data.filter(w => w.owner_id === user?.id);
      setWarehouses(userWarehouses);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleWarehouseStatus(id, !currentStatus);
      await loadWarehouses();
    } catch (err) {
      console.error('Failed to toggle warehouse status:', err);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateWarehouse(id);
      await loadWarehouses();
    } catch (err) {
      console.error('Failed to duplicate warehouse:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteWarehouseId) return;
    try {
      await deleteWarehouse(deleteWarehouseId);
      setDeleteWarehouseId(null);
      await loadWarehouses();
    } catch (err) {
      console.error('Failed to delete warehouse:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Warehouse
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size & Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {warehouse.images?.[0] && (
                      <div className="h-10 w-10 rounded-md overflow-hidden mr-3">
                        <img
                          src={warehouse.images[0].url}
                          alt={warehouse.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {warehouse.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {warehouse.type?.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{warehouse.city}</div>
                  <div className="text-sm text-gray-500">{warehouse.country}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{warehouse.size_m2} m²</div>
                  <div className="text-sm text-gray-500">
                    €{(warehouse.price_per_m2_cents / 100).toFixed(2)}/m²
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleStatusToggle(warehouse.id, warehouse.is_active)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                      warehouse.is_active ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className="sr-only">Toggle status</span>
                    {warehouse.is_active ? (
                      <ToggleRight className="h-5 w-5 text-white" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/warehouses/edit/${warehouse.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(warehouse.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setDeleteWarehouseId(warehouse.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={!!deleteWarehouseId}
        onClose={() => setDeleteWarehouseId(null)}
        onConfirm={handleDelete}
        title="Delete Warehouse"
        message="Are you sure you want to delete this warehouse? This action cannot be undone."
      />
    </>
  );
}