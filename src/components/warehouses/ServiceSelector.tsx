import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { WarehouseService } from '../../lib/types/warehouse';
import { Plus } from 'lucide-react';

interface ServiceSelectorProps {
  selectedServices: {
    id: string;
    pricing_type: 'hourly_rate' | 'per_unit' | 'ask_quote';
    price_per_hour_cents?: number;
    price_per_unit_cents?: number;
    unit_type?: string;
    notes?: string;
  }[];
  onChange: (services: {
    id: string;
    pricing_type: 'hourly_rate' | 'per_unit' | 'ask_quote';
    price_per_hour_cents?: number;
    price_per_unit_cents?: number;
    unit_type?: string;
    notes?: string;
  }[]) => void;
}

export function ServiceSelector({ selectedServices, onChange }: ServiceSelectorProps) {
  const [services, setServices] = useState<WarehouseService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customService, setCustomService] = useState({
    name: '',
    description: '',
  });
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_services')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceToggle = (service: WarehouseService) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    
    if (isSelected) {
      onChange(selectedServices.filter(s => s.id !== service.id));
      return;
    }

    // Add new service with default pricing type
    onChange([...selectedServices, {
      id: service.id,
      pricing_type: 'ask_quote',
      price_per_hour_cents: undefined,
      price_per_unit_cents: undefined,
      unit_type: undefined,
      notes: undefined
    }]);
  };

  const handlePricingTypeChange = (serviceId: string, pricingType: 'hourly_rate' | 'per_unit' | 'ask_quote') => {
    onChange(selectedServices.map(s => {
      if (s.id === serviceId) {
        return {
          ...s,
          pricing_type: pricingType,
          price_per_hour_cents: pricingType === 'hourly_rate' ? s.price_per_hour_cents : undefined,
          price_per_unit_cents: pricingType === 'per_unit' ? s.price_per_unit_cents : undefined,
          unit_type: pricingType === 'per_unit' ? s.unit_type : undefined,
          notes: pricingType === 'ask_quote' ? 'Ask for quote' : s.notes
        };
      }
      return s;
    }));
  };

  const handleCustomServiceAdd = async () => {
    if (!customService.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('warehouse_services')
        .insert({
          name: customService.name,
          description: customService.description || null
        })
        .select()
        .single();

      if (error) throw error;
      
      setServices([...services, data]);
      onChange([...selectedServices, { 
        id: data.id,
        pricing_type: 'ask_quote'
      }]);
      setCustomService({
        name: '',
        description: ''
      });
      setShowCustomInput(false);
    } catch (err) {
      console.error('Failed to add custom service:', err);
    }
  };

  if (isLoading) {
    return <div>Loading services...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {services.map((service) => {
          const selectedService = selectedServices.find(s => s.id === service.id);
          
          return (
            <div key={service.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{service.name}</h4>
                  {service.description && (
                    <p className="text-sm text-gray-500">{service.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleServiceToggle(service)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedService
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {selectedService ? 'Selected' : 'Select'}
                </button>
              </div>

              {selectedService && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Pricing Type
                    </label>
                    <select
                      id="pricing_type"
                      value={selectedService.pricing_type || 'ask_quote'}
                      onChange={(e) => handlePricingTypeChange(service.id, e.target.value as 'hourly_rate' | 'per_unit' | 'ask_quote')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    >
                      <option value="hourly_rate">Hourly Rate</option>
                      <option value="per_unit">Per Unit Rate</option>
                      <option value="ask_quote">Ask for Quote</option>
                    </select>
                  </div>

                  {selectedService.pricing_type === 'hourly_rate' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Hourly Rate (€)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">€</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selectedService.price_per_hour_cents ? (selectedService.price_per_hour_cents / 100).toString() : ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            onChange(selectedServices.map(s => 
                              s.id === service.id 
                                ? { ...s, price_per_hour_cents: value ? Math.round(value * 100) : undefined }
                                : s
                            ));
                          }}
                          onBlur={(e) => {
                            if (e.target.value) {
                              const value = parseFloat(e.target.value);
                              e.target.value = value.toFixed(2);
                            }
                          }}
                          className="pl-7 block w-full rounded-md border-gray-300 focus:ring-green-500 focus:border-green-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}

                  {selectedService.pricing_type === 'per_unit' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Per Unit Rate (€)
                        </label>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">€</span>
                            </div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={selectedService.price_per_unit_cents ? (selectedService.price_per_unit_cents / 100).toString() : ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              onChange(selectedServices.map(s => 
                                s.id === service.id 
                                  ? { ...s, price_per_unit_cents: value ? Math.round(value * 100) : undefined }
                                  : s
                              ));
                            }}
                            onBlur={(e) => {
                              if (e.target.value) {
                                const value = parseFloat(e.target.value);
                                e.target.value = value.toFixed(2);
                              }
                            }}
                            className="pl-7 block w-full rounded-md border-gray-300 focus:ring-green-500 focus:border-green-500"
                            placeholder="0.00"
                          />
                          </div>
                          <input
                            type="text"
                            placeholder="Unit (e.g., kg, pallet)"
                            value={selectedService.unit_type || ''}
                            onChange={(e) => {
                              onChange(selectedServices.map(s => 
                                s.id === service.id 
                                  ? { ...s, unit_type: e.target.value }
                                  : s
                              ));
                            }}
                            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!showCustomInput ? (
        <button
          onClick={() => setShowCustomInput(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Service
        </button>
      ) : (
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Service Name
            </label>
            <input
              type="text"
              value={customService.name}
              onChange={(e) => setCustomService(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              type="text"
              value={customService.description}
              onChange={(e) => setCustomService(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowCustomInput(false);
                setCustomService({
                  name: '',
                  description: ''
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCustomServiceAdd}
              disabled={!customService.name.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              Add Service
            </button>
          </div>
        </div>
      )}
    </div>
  );
}