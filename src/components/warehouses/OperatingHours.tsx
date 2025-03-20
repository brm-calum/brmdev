import React from 'react';
import { Clock } from 'lucide-react';
import { OperatingHours as OperatingHoursType, CustomHours } from '../../lib/types/warehouse';

interface OperatingHoursProps {
  type: OperatingHoursType;
  customHours?: CustomHours;
  className?: string;
}

export function OperatingHours({ type, customHours, className = '' }: OperatingHoursProps) {
  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const renderHours = () => {
    switch (type) {
      case '24_7':
        return <span>Open 24/7</span>;
      case 'business_hours':
        return <span>Mon-Fri: 9:00 - 17:00</span>;
      case 'custom':
        if (!customHours) return null;
        return (
          <div className="space-y-1 text-sm">
            {Object.entries(customHours).map(([day, hours]) => (
              hours && (
                <div key={day} className="flex justify-between">
                  <span className="capitalize">{day}:</span>
                  <span>
                    {formatTime(hours.open)} - {formatTime(hours.close)}
                  </span>
                </div>
              )
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-start space-x-2 ${className}`}>
      <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
      <div className="flex-1">
        {renderHours()}
      </div>
    </div>
  );
}