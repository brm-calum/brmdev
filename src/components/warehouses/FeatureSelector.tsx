import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { WarehouseFeature } from '../../lib/types/warehouse';
import { Plus } from 'lucide-react';

interface FeatureSelectorProps {
  selectedFeatures: { id: string; custom_value?: string }[];
  onChange: (features: { id: string; custom_value?: string }[]) => void;
}

export function FeatureSelector({ selectedFeatures, onChange }: FeatureSelectorProps) {
  const [features, setFeatures] = useState<WarehouseFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customFeature, setCustomFeature] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_features')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setFeatures(data || []);
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeatureToggle = (feature: WarehouseFeature) => {
    const isSelected = selectedFeatures.some(f => f.id === feature.id);
    
    let newFeatures;
    if (feature.type === 'custom') {
      const customValue = window.prompt('Enter value for ' + feature.name);
      if (customValue === null) return; // User cancelled
      
      if (isSelected) {
        newFeatures = selectedFeatures.filter(f => f.id !== feature.id);
      } else {
        newFeatures = [...selectedFeatures, { id: feature.id, custom_value: customValue }];
      }
    } else {
      if (isSelected) {
        newFeatures = selectedFeatures.filter(f => f.id !== feature.id);
      } else {
        newFeatures = [...selectedFeatures, { id: feature.id }];
      }
    }
    onChange(newFeatures);
  };

  const handleCustomFeatureAdd = async () => {
    if (!customFeature.trim()) return;

    try {
      const { data, error } = await supabase
        .from('warehouse_features')
        .insert({
          name: customFeature,
          type: 'custom'
        })
        .select()
        .single();

      if (error) throw error;
      
      setFeatures([...features, data]);
      onChange([...selectedFeatures, { id: data.id }]);
      setCustomFeature('');
      setShowCustomInput(false);
    } catch (err) {
      console.error('Failed to add custom feature:', err);
    }
  };

  if (isLoading) {
    return <div>Loading features...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => handleFeatureToggle(feature)}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              selectedFeatures.some(f => f.id === feature.id)
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {feature.name}
          </button>
        ))}
        <button
          onClick={() => setShowCustomInput(true)}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Custom
        </button>
      </div>

      {showCustomInput && (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={customFeature}
            onChange={(e) => setCustomFeature(e.target.value)}
            placeholder="Enter custom feature"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
          />
          <button
            onClick={handleCustomServiceAdd}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowCustomInput(false);
              setCustomFeature('');
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}