import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { SpaceRequest } from '../../lib/types/inquiry';

interface SpaceRequestFormProps {
  spaceRequests: SpaceRequest[];
  spaceTypes: Array<{ id: string; name: string }>;
  onChange: (requests: SpaceRequest[]) => void;
}

export function SpaceRequestForm({ spaceRequests, spaceTypes, onChange }: SpaceRequestFormProps) {
  const addSpaceRequest = () => {
    onChange([
      ...spaceRequests,
      { space_type_id: spaceTypes[0]?.id || '', size_m2: 0 }
    ]);
  };

  const removeSpaceRequest = (index: number) => {
    onChange(spaceRequests.filter((_, i) => i !== index));
  };

  const updateSpaceRequest = (index: number, field: keyof SpaceRequest, value: any) => {
    onChange(
      spaceRequests.map((request, i) =>
        i === index ? { ...request, [field]: value } : request
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          Space Requirements
        </label>
        <button
          type="button"
          onClick={addSpaceRequest}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Space
        </button>
      </div>

      {spaceRequests.length === 0 ? (
        <p className="text-sm text-gray-500">
          Click "Add Space" to specify your space requirements
        </p>
      ) : (
        <div className="space-y-4">
          {spaceRequests.map((request, index) => (
            <div key={index} className="flex items-start space-x-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Space Type
                  </label>
                  <select
                    value={request.space_type_id}
                    onChange={(e) => updateSpaceRequest(index, 'space_type_id', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  >
                    {spaceTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Size (m²)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={request.size_m2}
                    onChange={(e) => updateSpaceRequest(index, 'size_m2', parseFloat(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeSpaceRequest(index)}
                className="mt-6 text-gray-400 hover:text-red-500"
              >
                <Minus className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}