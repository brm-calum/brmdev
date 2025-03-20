import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { useInquiries } from '../../hooks/useInquiries';
import { formatDate } from '../../lib/utils/dates';
import { 
  FileText, Filter, MapPin, Calendar, Euro, 
  MessageSquare, Check, X, Clock, AlertCircle,
  Building2 
} from 'lucide-react';

export function AdminInquiriesPage() {
  const navigate = useNavigate();
  const { fetchInquiries, isLoading } = useInquiries();
  const [inquiries, setInquiries] = useState([]);
  const [filter, setFilter] = useState('all');
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  const loadInquiries = async () => {
    try {
      const data = await fetchInquiries();
      setInquiries(data);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'offer_pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'offer_sent':
        return 'bg-purple-100 text-purple-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRoles={['administrator']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate flex items-center">
                <FileText className="h-8 w-8 text-gray-400 mr-3" />
                Manage Inquiries
              </h2>
            </div>
          </div>

          <div className="mt-4 flex items-center">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            >
              <option value="all">All Inquiries</option>
              <option value="submitted">Submitted</option>
              <option value="offer_pending">Offer Pending</option>
              <option value="offer_sent">Offer Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="mt-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Warehouse
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Space Required
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inquiries
                    .filter(inquiry => filter === 'all' || inquiry.status === filter)
                    .map((inquiry) => (
                      <tr key={inquiry.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {inquiry.trader?.first_name} {inquiry.trader?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{inquiry.trader?.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {inquiry.warehouses?.map(w => w.warehouse?.name).join(', ') || 'No warehouse selected'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {inquiry.space_requests?.map((request) => (
                              <div key={`${request.space_type_id}-${request.size_m2}`} className="text-sm text-gray-900">
                                {request.space_type?.name}: {request.size_m2} m²
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {formatDate(inquiry.start_date)} to {formatDate(inquiry.end_date)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(inquiry.status)}`}>
                            {inquiry.status.replace('_', ' ').charAt(0).toUpperCase() + inquiry.status.replace('_', ' ').slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => navigate(`/admin/inquiries/${inquiry.id}`)}
                            className="text-green-600 hover:text-green-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}