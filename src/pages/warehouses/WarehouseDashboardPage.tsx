import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { WarehouseDashboard } from '../../components/warehouses/WarehouseDashboard';
import { Plus } from 'lucide-react';

export function WarehouseDashboardPage() {
  const navigate = useNavigate();

  return (
    <AuthGuard requiredRoles={['warehouse_owner']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              My Warehouses
            </h2>
            <Link
              to="/warehouses/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse
            </Link>
          </div>
          <div className="mt-8">
            <WarehouseDashboard />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}