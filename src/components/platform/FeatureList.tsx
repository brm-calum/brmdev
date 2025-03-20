import React, { useEffect, useState } from 'react';
import { useFeatures } from '../../hooks/useFeatures';
import { PlatformFeature } from '../../lib/types/feature';
import { ToggleLeft, ToggleRight, Loader } from 'lucide-react';

export function FeatureList() {
  const { fetchFeatures, toggleFeature, isLoading, error } = useFeatures();
  const [features, setFeatures] = useState<PlatformFeature[]>([]);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const data = await fetchFeatures();
      setFeatures(data);
    } catch (err) {
      console.error('Failed to load features:', err);
    }
  };

  const handleToggle = async (featureId: string, currentStatus: boolean) => {
    try {
      await toggleFeature(featureId, !currentStatus);
      await loadFeatures();
    } catch (err) {
      console.error('Failed to toggle feature:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {features.map((feature) => (
        <div
          key={feature.id}
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                {feature.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {feature.description}
              </p>
              <div className="mt-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {feature.key}
                </code>
              </div>
            </div>
            <button
              onClick={() => handleToggle(feature.id, feature.is_enabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                feature.is_enabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span className="sr-only">Toggle feature</span>
              {feature.is_enabled ? (
                <ToggleRight className="h-5 w-5 text-white" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500">
            <span>Last updated: {new Date(feature.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}