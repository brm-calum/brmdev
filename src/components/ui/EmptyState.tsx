import { MessageSquare } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="text-center">
      <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <p>No conversations found</p>
    </div>
  );
}