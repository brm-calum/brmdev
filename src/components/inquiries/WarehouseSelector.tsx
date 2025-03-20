import React, { useState } from 'react';
import { Search, MapPin, Ruler, Euro, X } from 'lucide-react';

interface WarehouseSelectorProps {
  warehouses: any[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export function WarehouseSelector({ warehouses, selectedIds, onChange }: WarehouseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredWarehouses = warehouses.filter(warehouse => {
    const searchLower = searchTerm.toLowerCase();
    return (
      warehouse.name.toLowerCase().includes(searchLower) ||
      warehouse.city.toLowerCase().includes(searchLower) ||
      warehouse.country.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (warehouseId: string) => {
    if (selectedIds.includes(warehouseId)) {
      onChange(selectedIds.filter(id => id !== warehouseId));
    } else {
      onChange([...selectedIds, warehouseId]);
    }
  };

  const handleRemove = (warehouseId: string) => {
    onChange(selectedIds.filter(id => id !== warehouseId));
  };

  return (
    <div className="space-y-4">
      {/* Selected Warehouses */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map(id => {
            const warehouse = warehouses.find(w => w.id === id);
            if (!warehouse) return null;
            
            return (
              <div 
                key={id}
                className="inline-flex items-center bg-green-50 border border-green-200 text-green-800 px-3 py-1.5 rounded-full text-sm"
              >
                <span>{warehouse.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(id)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search & Dropdown */}
      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search warehouses by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
          />
        </div>

        {isDropdownOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-60 overflow-auto">
            {filteredWarehouses.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                No warehouses found
              </div>
            ) : (
              filteredWarehouses.map(warehouse => (
                <div
                  key={warehouse.id}
                  className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                    selectedIds.includes(warehouse.id) ? 'bg-green-50' : ''
                  }`}
                  onClick={() => handleSelect(warehouse.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">
                        {warehouse.name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {warehouse.city}, {warehouse.country}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 flex items-center">
                        <Ruler className="h-3 w-3 mr-1" />
                        {warehouse.spaces.reduce((sum: number, space: any) => sum + space.size_m2, 0)} m²
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Euro className="h-3 w-3 mr-1" />
                        From €{(Math.min(...warehouse.spaces.map((s: any) => s.price_per_m2_cents)) / 100).toFixed(2)}/m²
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500">
        {selectedIds.length === 0 ? (
          <p>Please select at least one warehouse</p>
        ) : (
          <p>{selectedIds.length} warehouse(s) selected</p>
        )}
      </div>
    </div>
  );
}