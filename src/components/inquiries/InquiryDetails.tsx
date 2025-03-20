import React from 'react';
import { Layers, Calendar, Euro, MapPin, Tag, Package } from 'lucide-react';
import { formatDate } from '../../lib/utils/dates';

interface InquiryDetailsProps {
  inquiry: any;
}

export function InquiryDetails({ inquiry }: InquiryDetailsProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6 space-y-6">
        {/* Space Requirements */}
        <div className="flex items-start">
          <Layers className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">Space Requirements</div>
            <div className="mt-2 space-y-1">
              {inquiry.space_requests?.map((request: any) => (
                <div key={request.id} className="text-sm text-gray-500">
                  {request.space_type?.name}: {request.size_m2} m²
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-start">
          <Calendar className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
          <div>
            <div className="text-sm font-medium text-gray-900">Date Range</div>
            <div className="text-sm text-gray-500">
              {formatDate(inquiry.start_date)} to {formatDate(inquiry.end_date)}
            </div>
          </div>
        </div>

        {/* Estimated Cost */}
        {inquiry.estimated_cost_cents && (
          <div className="flex items-start">
            <Euro className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">Estimated Cost</div>
              <div className="text-sm text-gray-500">
                €{(inquiry.estimated_cost_cents / 100).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Selected Warehouses */}
        <div className="flex items-start">
          <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">Selected Warehouses</div>
            <div className="mt-2 space-y-2">
              {inquiry.warehouses?.map((w: any) => (
                <div key={w.warehouse_id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium text-sm text-gray-900">{w.warehouse?.name}</div>
                  <div className="text-sm text-gray-500">{w.warehouse?.city}, {w.warehouse?.country}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        {inquiry.features?.length > 0 && (
          <div className="flex items-start">
            <Tag className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">Required Features</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {inquiry.features.map((f: any) => (
                  <span key={f.feature_id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {f.feature?.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Services */}
        {inquiry.services?.length > 0 && (
          <div className="flex items-start">
            <Package className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">Required Services</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {inquiry.services.map((s: any) => (
                  <span key={s.service_id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {s.service?.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}