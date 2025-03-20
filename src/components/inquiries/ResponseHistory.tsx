import React from 'react';
import { MessageSquare, FileText } from 'lucide-react';
import { formatDate } from '../../lib/utils/dates';

interface ResponseHistoryProps {
  responses: any[];
}

export function ResponseHistory({ responses }: ResponseHistoryProps) {
  if (!responses?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No responses yet
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {responses.map((response, responseIdx) => (
          <li key={response.id}>
            <div className="relative pb-8">
              {responseIdx !== responses.length - 1 ? (
                <span
                  className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex items-start space-x-3">
                <div className="relative">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    response.type === 'message' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {response.type === 'message' ? (
                      <MessageSquare className={`h-5 w-5 ${
                        response.type === 'message' ? 'text-green-600' : 'text-blue-600'
                      }`} />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">
                        {response.sender?.first_name} {response.sender?.last_name}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {formatDate(response.created_at)}
                    </p>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    <p>{response.message}</p>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}