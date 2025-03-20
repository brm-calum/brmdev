export function LoadingSpinner() {
  return (
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
      <p>Loading conversations...</p>
    </div>
  );
}