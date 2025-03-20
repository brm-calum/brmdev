import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWarehouses } from '../../hooks/useWarehouses';
import { WarehouseList } from '../../components/warehouses/WarehouseList';
import { WarehouseMap } from '../../components/warehouses/WarehouseMap';
import { WarehouseFilters } from '../../components/warehouses/WarehouseFilters';
import { Plus, List, Map as MapIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Warehouse } from '../../lib/types/warehouse';

export function WarehousesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { fetchWarehouses, isLoading: warehousesLoading } = useWarehouses();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    minSize: '',
    maxSize: '',
    minPrice: '',
    maxPrice: '',
    city: '',
    country: '',
    features: [],
    services: []
  });
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState<Warehouse[]>([]);

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
        const data = await fetchWarehouses();
        setWarehouses(data);
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    };
    loadWarehouses();
  }, []);

  useEffect(() => {
    // Fetch available features and services
    const fetchFilters = async () => {
      const { data: features, error: featuresError } = await supabase
        .from('warehouse_features')
        .select('id, name')
        .order('name');

      if (featuresError) {
        console.error('Failed to load features:', featuresError);
        return;
      }
      
      const { data: services, error: servicesError } = await supabase
        .from('warehouse_services')
        .select('id, name')
        .order('name');

      if (servicesError) {
        console.error('Failed to load services:', servicesError);
        return;
      }

      if (features) setAvailableFeatures(features);
      if (services) setAvailableServices(services);
    };

    fetchFilters();
  }, []);

  // Filter warehouses based on criteria
  useEffect(() => {
    const filtered = warehouses.filter(warehouse => {
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

      const matchesFeatures = filters.features.length === 0 || 
        filters.features.every(featureId =>
          warehouse.features?.some(f => f.id === featureId)
        );

      const matchesServices = filters.services.length === 0 ||
        filters.services.every(serviceId =>
          warehouse.services?.some(s => s.id === serviceId)
        );

      return matchesSearch && matchesSize && matchesPrice && matchesLocation && 
             matchesFeatures && matchesServices;
    });

    setFilteredWarehouses(filtered);
  }, [warehouses, filters]);


  return (
    <>
      <div className="pt-20 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900">Warehouses</h1>
              <p className="mt-2 text-sm text-gray-600">
                Browse available warehouse spaces
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
                  to="/warehouses/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Warehouse
                </Link>
              )}
            </div>
          </div>
          <div className={`mt-8 ${viewMode === 'map' ? 'h-[calc(100vh-16rem)]' : ''}`}>
            {viewMode === 'list' ? (
              <>
                <WarehouseFilters
                  filters={filters}
                  onChange={setFilters}
                  availableFeatures={availableFeatures}
                  availableServices={availableServices}
                />
                <WarehouseList 
                  filters={filters}
                  onWarehousesLoaded={(loaded) => {
                    setWarehouses(loaded);
                  }}
                />
              </>
            ) : (
              <WarehouseMap
                warehouses={filteredWarehouses}
                onWarehouseClick={(id) => navigate(`/warehouses/${id}`)}
                selectedWarehouseId={selectedWarehouseId}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}