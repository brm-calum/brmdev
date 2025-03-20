import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { useMWarehouses } from '../../hooks/useMWarehouses';
import { MWarehouse } from '../../lib/types/m-warehouse';
import { Plus, Edit, Copy, Trash2, ToggleLeft, ToggleRight, Loader } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useState, useEffect } from 'react';

export function MWarehouseDashboardPage() {
  const navigate = useNavigate();
  const { fetchMWarehouses, toggleMWarehouseStatus, deleteMWarehouse, isLoading } = useMWarehouses();
  const [warehouses, setWarehouses] = useState<MWarehouse[]>([]);
  const [deleteWarehouseId, setDeleteWarehouseId] = useState<string | null>(null);

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

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleMWarehouseStatus(id, !currentStatus);
      await loadWarehouses();
    } catch (err) {
      console.error('Failed to toggle warehouse status:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteWarehouseId) return;
    try {
      await deleteMWarehouse(deleteWarehouseId);
      setDeleteWarehouseId(null);
      await loadWarehouses();
    } catch (err) {
      console.error('Failed to delete warehouse:', err);
    }
  };

  return (
    <AuthGuard requiredRoles={['warehouse_owner']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              My Multi-Space Warehouses
            </h2>
            <Link
              to="/m-warehouses/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse
            </Link>
          </div>

          <div className="mt-8">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : (
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
                        Spaces
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
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{warehouse.city}</div>
                          <div className="text-sm text-gray-500">{warehouse.country}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-2">
                            {warehouse.spaces.map((space) => (
                              <span
                                key={space.id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {space.space_type?.name} ({space.size_m2}m²)
                              </span>
                            ))}
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
                              onClick={() => navigate(`/m-warehouses/edit/${warehouse.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-5 w-5" />
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
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteWarehouseId}
        onClose={() => setDeleteWarehouseId(null)}
        onConfirm={handleDelete}
        title="Delete Warehouse"
        message="Are you sure you want to delete this warehouse? This action cannot be undone."
      />
    </AuthGuard>
  );
}