import React from 'react';
import { Check, X, Clock, Euro, Calendar, Building2, Package } from 'lucide-react';
import { formatDate } from '../../lib/utils/dates';

interface OfferSummaryProps {
  offer: any;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export function OfferSummary({ offer, onAccept, onReject, showActions = true }: OfferSummaryProps) {
  if (!offer) return null;
  
  const isExpired = new Date(offer.valid_until) < new Date();
  const canRespond = offer.status === 'sent' && !isExpired && showActions;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-medium text-gray-900">Offer #{offer.inquiry_number}</h3>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="h-4 w-4 mr-2" />
            {offer.spaces?.[0]?.space?.warehouse?.name || 'Unknown Warehouse'}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            {formatDate(offer.inquiry?.start_date)} - {formatDate(offer.inquiry?.end_date)}
          </div>
        </div>
      </div>
      
      {/* Spaces Table */}
      <div className="overflow-hidden border border-gray-200 rounded-lg mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocation</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {offer.spaces?.map((space: any) => (
              <tr key={space.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {space.space?.space_type?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {space.space_allocated_m2} m²
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Services Table */}
      {offer.services?.length > 0 && (
        <div className="overflow-hidden border border-gray-200 rounded-lg mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Package className="h-4 w-4 inline-block mr-1" />
                  Service
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {offer.services.map((service: any) => (
                <tr key={service.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.service?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.quantity || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Footer */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Valid until</p>
            <p className="text-base font-medium text-gray-900">{formatDate(offer.valid_until)}</p>
            {isExpired && <p className="text-sm text-red-600">This offer has expired</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="text-xl font-bold text-gray-900">€{(offer.total_cost_cents / 100).toFixed(2)}</p>
          </div>
        </div>

        {canRespond && (
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={onReject}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              Reject Offer
            </button>
            <button
              onClick={onAccept}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Accept Offer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}