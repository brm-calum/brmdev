import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMWarehouses } from '../../hooks/useMWarehouses';
import { MWarehouseList } from '../../components/warehouses/MWarehouseList';
import { MWarehouseFilters } from '../../components/warehouses/MWarehouseFilters';
import { Plus, List, Map as MapIcon } from 'lucide-react';
import { MWarehouse } from '../../lib/types/m-warehouse';

export function MWarehousesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { fetchMWarehouses, isLoading } = useMWarehouses();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<MWarehouse[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    minSize: '',
    maxSize: '',
    minPrice: '',
    maxPrice: '',
    city: '',
    country: '',
    spaceTypes: []
  });

  // Handle location state from navigation
  useEffect(() => {
    const state = location.state;
    if (state?.viewMode === 'map') {
      setViewMode('map');
      if (state.selectedId) {
        setSelectedWarehouseId(state.selectedId);
      }
    }
  }, [location]);

  // Load warehouses
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const data = await fetchMWarehouses();
        setWarehouses(data);
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    };
    loadWarehouses();
  }, []);

  return (
    <div className="pt-20 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">Multi-Space Warehouses</h1>
            <p className="mt-2 text-sm text-gray-600">
              Browse warehouses with multiple space types
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === 'list'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b -ml-px ${
                  viewMode === 'map'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <MapIcon className="h-4 w-4" />
              </button>
            </div>
            {user && (
              <Link
                to="/m-warehouses/create"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Warehouse
              </Link>
            )}
          </div>
        </div>
        <div className={`mt-8 ${viewMode === 'map' ? 'h-[calc(100vh-16rem)]' : ''}`}>
          <MWarehouseFilters
            filters={filters}
            onChange={setFilters}
          />
          <MWarehouseList 
            filters={filters}
            onWarehousesLoaded={(loaded) => {
              setWarehouses(loaded);
            }}
          />
        </div>
      </div>
    </div>
  );
}