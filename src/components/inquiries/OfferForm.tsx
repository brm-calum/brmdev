import React, { useState } from 'react';
import { Calendar, Euro, Clock, Tag, Package, Plus, Minus, AlertCircle } from 'lucide-react';
import { formatDate } from '../../lib/utils/dates';

interface OfferFormProps {
  inquiry: any;
  initialData?: any;
  onSubmit: (data: any, sendImmediately: boolean) => Promise<void>;
  onCancel: () => void;
}

export function OfferForm({ inquiry, initialData, onSubmit, onCancel }: OfferFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    total_cost_cents: initialData?.total_cost_cents || 0,
    valid_until: initialData?.valid_until ? new Date(initialData.valid_until) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notes: initialData?.notes || '',
    spaces: initialData?.spaces || inquiry.warehouses?.map((w: any) => w.warehouse.spaces?.map((s: any) => ({
      space_id: s.id,
      price_per_m2_cents: s.price_per_m2_cents,
      space_allocated_m2: 0,
      // Ensure offer_total_cents exists (in cents)
      offer_total_cents: 0,
      comments: ''
    }))).flat() || [],
    services: initialData?.services || inquiry.services?.map((s: any) => ({
      service_id: s.service_id,
      pricing_type: 'ask_quote',
      price_per_hour_cents: null,
      price_per_unit_cents: null,
      unit_type: null,
      fixed_price_cents: null,
      // Ensure offer_total_cents exists (in cents)
      offer_total_cents: 0,
      notes: null,
      comments: ''
    })) || [],
    terms: initialData?.terms || []
  });

  const handleSubmit = async (e: React.FormEvent, sendImmediately: boolean = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate before sending
      if (sendImmediately) {
        // Check if any space is allocated
        const hasAllocatedSpace = formData.spaces.some(space => space.space_allocated_m2 > 0);
        if (!hasAllocatedSpace) {
          throw new Error('At least one space must be allocated');
        }

        // Check if total allocated space meets requirements
        const totalAllocated = formData.spaces.reduce((sum, space) => sum + space.space_allocated_m2, 0);
        const totalRequested = inquiry.space_requests?.reduce((sum: number, req: any) => sum + req.size_m2, 0) || 0;
        if (totalAllocated < totalRequested) {
          throw new Error(`Total allocated space (${totalAllocated}m²) must meet or exceed requested space (${totalRequested}m²)`);
        }

        // Check if all services have proper pricing
        const invalidServices = formData.services.filter(service => 
          service.pricing_type !== 'ask_quote' && (
            (service.pricing_type === 'hourly_rate' && !service.price_per_hour_cents) ||
            (service.pricing_type === 'per_unit' && (!service.price_per_unit_cents || !service.unit_type)) ||
            (service.pricing_type === 'fixed' && !service.fixed_price_cents)
          )
        );
        if (invalidServices.length > 0) {
          throw new Error('All services must have proper pricing set');
        }

        // Check if total cost is set
        if (!formData.total_cost_cents) {
          throw new Error('Total cost must be set');
        }
      }

      await onSubmit({
        ...formData,
        total_cost_cents: parseInt((formData.total_cost_cents / 100).toString(), 10) * 100, // already stored as cents
        valid_until: formData.valid_until
      }, sendImmediately);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit offer');
      console.error('Failed to submit offer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTerm = () => {
    setFormData(prev => ({
      ...prev,
      terms: [
        ...prev.terms,
        { term_type: '', description: '' }
      ]
    }));
  };

  const removeTerm = (index: number) => {
    setFormData(prev => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index)
    }));
  };

  const updateTerm = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      terms: prev.terms.map((term, i) => 
        i === index ? { ...term, [field]: value } : term
      )
    }));
  };

  const updateService = (serviceId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.service_id === serviceId ? { ...service, [field]: value } : service
      )
    }));
  };

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Inquiry Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <div className="mt-1 text-sm text-gray-900">
              {inquiry.trader?.first_name} {inquiry.trader?.last_name}
            </div>
            <div className="text-sm text-gray-500">{inquiry.trader?.email}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Space Required</label>
            <div className="mt-1 text-sm text-gray-900">{inquiry.total_space_needed} m²</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date Range</label>
            <div className="mt-1 text-sm text-gray-900">
              {formatDate(inquiry.start_date)} to {formatDate(inquiry.end_date)}
            </div>
          </div>
        </div>
      </div>

      {/* Space Allocation */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Space Allocation</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available (m²)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated (m²)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">List Price (€/m²)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer Price (€/m²)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (€)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formData.spaces.map((space, index) => (
                <tr key={space.space_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {space.space?.space_type?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {space.space?.warehouse?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {space.space?.size_m2}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      max={space.space?.size_m2}
                      step="0.01"
                      value={space.space_allocated_m2}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          spaces: prev.spaces.map((s, i) => 
                            i === index ? { ...s, space_allocated_m2: value } : s
                          )
                        }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.round(space.space?.price_per_m2_cents / 100)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={Math.round(space.price_per_m2_cents / 100)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          spaces: prev.spaces.map((s, i) => 
                            i === index ? { 
                              ...s, 
                              price_per_m2_cents: Math.round(value * 100),
                              is_manual_price: true,
                              // Update total when price changes
                              offer_total_cents: Math.round(value * 100 * s.space_allocated_m2)
                            } : s
                          )
                        }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      step="1"
                      min="0"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="number"
                      min="0"
                      step="1"
                      value={Math.round(space.offer_total_cents / 100)}
                      onChange={(e) => {
                        const newTotal = parseInt(e.target.value, 10);
                        setFormData(prev => ({
                          ...prev,
                          spaces: prev.spaces.map((s, i) => 
                            i === index ? { 
                              ...s, 
                              offer_total_cents: newTotal * 100,
                              // Update price per m² when total changes
                              price_per_m2_cents: s.space_allocated_m2 ? Math.round((newTotal * 100) / s.space_allocated_m2) : s.price_per_m2_cents,
                              is_manual_price: true
                            } : s
                          )
                        }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={space.comments || ''}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          spaces: prev.spaces.map((s, i) => 
                            i === index ? { ...s, comments: e.target.value } : s
                          )
                        }));
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Services */}
      {inquiry.services?.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Services</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (€)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.services.map((service, index) => (
                  <tr key={service.service_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.service?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={service.pricing_type}
                        onChange={(e) => updateService(service.service_id, 'pricing_type', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      >
                        <option value="ask_quote">Ask for Quote</option>
                        <option value="hourly_rate">Hourly Rate</option>
                        <option value="per_unit">Per Unit</option>
                        <option value="fixed">Fixed Price</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {service.pricing_type === 'hourly_rate' && (
                        <input
                          type="number"
                          min="0"
                          value={service.price_per_hour_cents ? Math.round(service.price_per_hour_cents / 100) : ''}
                          onChange={(e) => updateService(
                            service.service_id,
                            'price_per_hour_cents',
                            e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null
                          )}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          placeholder="€/hour"
                          step="1"
                        />
                      )}
                      {service.pricing_type === 'per_unit' && (
                        <input
                          type="number"
                          min="0"
                          value={service.price_per_unit_cents ? Math.round(service.price_per_unit_cents / 100) : ''}
                          onChange={(e) => updateService(
                            service.service_id,
                            'price_per_unit_cents',
                            e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null
                          )}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          placeholder="€/unit"
                          step="1"
                        />
                      )}
                      {service.pricing_type === 'fixed' && (
                        <input
                          type="number"
                          min="0"
                          value={service.fixed_price_cents ? Math.round(service.fixed_price_cents / 100) : ''}
                          onChange={(e) => updateService(
                            service.service_id,
                            'fixed_price_cents',
                            e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null
                          )}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          placeholder="Fixed €"
                          step="1"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {service.pricing_type === 'per_unit' && (
                        <input
                          type="text"
                          value={service.unit_type || ''}
                          onChange={(e) => updateService(service.service_id, 'unit_type', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          placeholder="e.g., pallet"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(service.pricing_type === 'hourly_rate' || service.pricing_type === 'per_unit') && (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={service.quantity || ''}
                          onChange={(e) => updateService(
                            service.service_id,
                            'quantity',
                            e.target.value ? parseInt(e.target.value, 10) : null
                          )}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="number"
                        min="0"
                        step="1"
                        value={service.offer_total_cents ? Math.round(service.offer_total_cents / 100) : ''}
                        onChange={(e) => {
                          const newTotal = parseInt(e.target.value, 10);
                          updateService(service.service_id, 'offer_total_cents', newTotal * 100);
                          // Update the appropriate rate based on pricing type
                          if (service.pricing_type === 'hourly_rate' && service.quantity) {
                            updateService(service.service_id, 'price_per_hour_cents', Math.round((newTotal * 100) / service.quantity));
                          } else if (service.pricing_type === 'per_unit' && service.quantity) {
                            updateService(service.service_id, 'price_per_unit_cents', Math.round((newTotal * 100) / service.quantity));
                          } else if (service.pricing_type === 'fixed') {
                            updateService(service.service_id, 'fixed_price_cents', newTotal * 100);
                          }
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={service.comments || ''}
                        onChange={(e) => updateService(service.service_id, 'comments', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Offer Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Offer Details</h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="total_cost" className="block text-sm font-medium text-gray-700">
              Total Cost (€)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Euro className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                name="total_cost"
                id="total_cost"
                min="0"
                step="1"
                required
                value={Math.round(formData.total_cost_cents / 100)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  total_cost_cents: parseInt(e.target.value, 10) * 100
                }))}
                className="block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="0"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">EUR</span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Calculated Total: €{Math.round(
                (formData.spaces.reduce((sum, space) => sum + space.offer_total_cents, 0) +
                formData.services.reduce((sum, service) => sum + (service.offer_total_cents || 0), 0)) / 100
              )}
            </p>
          </div>

          <div>
            <label htmlFor="valid_until" className="block text-sm font-medium text-gray-700">
              Valid Until
            </label>
            <div className="mt-1">
              <input
                type="date"
                name="valid_until"
                id="valid_until"
                required
                value={formData.valid_until.toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  valid_until: new Date(e.target.value)
                }))}
                className="block w-full sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <div className="mt-1">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                className="block w-full sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="Add any additional notes or comments about the offer..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Special Terms */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Special Terms</h2>
          <button
            type="button"
            onClick={addTerm}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Term
          </button>
        </div>
        
        <div className="space-y-4">
          {formData.terms.map((term, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Term Type
                    </label>
                    <input
                      type="text"
                      value={term.term_type}
                      onChange={(e) => updateTerm(index, 'term_type', e.target.value)}
                      className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., Payment Terms, Access Hours"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={term.description}
                      onChange={(e) => updateTerm(index, 'description', e.target.value)}
                      rows={2}
                      className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => removeTerm(index)}
                  className="ml-4 text-gray-400 hover:text-red-500"
                >
                  <Minus className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Cancel
        </button>
        
        <button
          type="submit"
          onClick={(e) => handleSubmit(e, false)}
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Save as Draft
        </button>
        
        <button
          type="submit"
          onClick={(e) => handleSubmit(e, true)}
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          {isSubmitting ? 'Sending...' : 'Send Offer'}
        </button>
      </div>
    </form>
  );
}
