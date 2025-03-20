import React from 'react';
import { FileText, CheckCircle, Clock, MessageSquare } from 'lucide-react';

interface InquiryProgressProps {
  status: string;
}

export function InquiryProgress({ status }: InquiryProgressProps) {
  const getStatusInfo = (currentStatus: string) => {
    switch (currentStatus) {
      case 'draft':
        return 'Your inquiry is currently in draft status. You can submit it to start the booking process.';
      case 'submitted':
        return 'Your inquiry has been submitted successfully. Our team will review it shortly.';
      case 'under_review':
        return 'Your inquiry is being reviewed by our team.';
      case 'offer_draft':
        return 'An offer is being prepared for you.';
      case 'offer_sent':
        return 'An offer has been sent to you. Please review it and respond.';
      case 'changes_requested':
        return 'You have requested changes to the offer. Our team will review your request.';
      case 'accepted':
        return 'Congratulations! Your booking has been confirmed.';
      case 'rejected':
        return 'The offer has been rejected. You can request changes or create a new inquiry.';
      case 'cancelled':
        return 'This inquiry has been cancelled.';
      case 'expired':
        return 'This inquiry has expired. Please create a new inquiry if you\'re still interested.';
      case 'confirmed':
        return 'Your booking is confirmed and active.';
      case 'completed':
        return 'This booking has been completed.';
      case 'archived':
        return 'This inquiry has been archived.';
      default:
        return '';
    }
  };

  const getStatusColor = (currentStatus: string) => {
    switch (currentStatus) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'offer_draft':
      case 'offer_sent':
        return 'bg-yellow-100 text-yellow-800';
      case 'changes_requested':
        return 'bg-orange-100 text-orange-800';
      case 'accepted':
      case 'confirmed':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const steps = [
    { id: 'draft', icon: FileText, label: 'Draft', complete: status !== 'draft' },
    { id: 'submitted', icon: CheckCircle, label: 'Submitted', complete: ['submitted', 'under_review', 'offer_draft', 'offer_sent', 'accepted', 'confirmed', 'completed'].includes(status) },
    { id: 'offer', icon: Clock, label: 'Offer', complete: ['offer_sent', 'accepted', 'confirmed', 'completed'].includes(status) },
    { id: 'confirmed', icon: MessageSquare, label: 'Confirmed', complete: ['confirmed', 'completed'].includes(status) }
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Status Badge */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Inquiry Status</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
          {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-between">
          {steps.map((step, stepIdx) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step.complete ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                <step.icon className="h-5 w-5 text-white" />
              </div>
              <div className="mt-2 text-xs text-gray-500">{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Description */}
      <div className="mt-6 text-sm text-gray-600">
        {getStatusInfo(status)}
      </div>
    </div>
  );
}