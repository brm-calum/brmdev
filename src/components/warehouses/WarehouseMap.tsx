import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import { WebMercatorViewport } from 'viewport-mercator-project';
import { Warehouse, WarehouseLocation } from '../../lib/types/warehouse';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface WarehouseMapProps {
  warehouses: Warehouse[];
  onWarehouseClick: (id: string) => void;
  selectedWarehouseId?: string | null;
}

interface GeocodingResult {
  features: Array<{
    center: [number, number];
    place_name: string;
  }>;
}

export function WarehouseMap({ warehouses, onWarehouseClick, selectedWarehouseId }: WarehouseMapProps) {
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [warehouseLocations, setWarehouseLocations] = useState<Record<string, WarehouseLocation>>({});
  const [viewState, setViewState] = useState({
    latitude: 59.4370,
    longitude: 24.7536,
    zoom: 10,
    pitch: 0,
    bearing: 0
  });

  // Geocode warehouse addresses
  React.useEffect(() => {
    const geocodeWarehouses = async () => {
      const locations: Record<string, WarehouseLocation> = {};

      for (const warehouse of warehouses) {
        try {
          const address = `${warehouse.address}, ${warehouse.city}, ${warehouse.country}`;
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
          );
          
          if (!response.ok) {
            console.error('Geocoding failed for warehouse:', warehouse.id);
            continue;
          }

          const data: GeocodingResult = await response.json();
          if (data.features?.[0]) {
            const [longitude, latitude] = data.features[0].center;
            locations[warehouse.id] = { latitude, longitude };
          }
        } catch (err) {
          console.error('Failed to geocode warehouse:', warehouse.id, err);
        }
      }

      setWarehouseLocations(locations);
    };

    if (warehouses.length > 0) {
      geocodeWarehouses();
    }
  }, [warehouses]);

  // Calculate bounds based on warehouse locations
  const getBounds = () => {
    const locations = Object.values(warehouseLocations);
    if (!locations.length) return null;

    const lats = locations.map(l => l.latitude);
    const lngs = locations.map(l => l.longitude);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    };
  };

  // Fit map to warehouse bounds on initial load
  React.useEffect(() => {
    const bounds = getBounds();
    if (!bounds || !warehouses.length) return;

    // Get container dimensions
    const container = document.querySelector('.map-container');
    const width = container?.clientWidth || window.innerWidth;
    const height = container?.clientHeight || window.innerHeight;
    const padding = 50;

    const { minLat, maxLat, minLng, maxLng } = bounds;

    const viewport = new WebMercatorViewport({
      width,
      height
    }).fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding }
    );

    setViewState(prev => ({
      ...prev,
      latitude: viewport.latitude,
      longitude: viewport.longitude,
      zoom: viewport.zoom
    }));
  }, [warehouseLocations, warehouses.length]);

  // Select warehouse when selectedWarehouseId changes
  useEffect(() => {
    if (selectedWarehouseId) {
      // Find the warehouse and its location
      const warehouse = warehouses.find(w => w.id === selectedWarehouseId);
      const location = warehouse && warehouseLocations[warehouse.id];
      
      if (warehouse && location) {
        setSelectedWarehouse(warehouse);
        // Center map on the selected warehouse with zoom level 10
        setViewState(prev => ({
          ...prev,
          latitude: location.latitude,
          longitude: location.longitude,
          zoom: 5
        }));
      }
    } 
  }, [selectedWarehouseId, warehouses, warehouseLocations]);

  return (
    <Map
      {...viewState}
      minZoom={2} // Allow zooming out to show more area
      maxZoom={20} 
      reuseMaps
      onMove={evt => setViewState(evt.viewState)}
      className="map-container"
      style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
    >
      <NavigationControl position="top-right" />
      
      {warehouses.map(warehouse => {
        const location = warehouseLocations[warehouse.id];
        if (!location) return null;

        return (
        <Marker
          key={warehouse.id}
          latitude={location.latitude}
          longitude={location.longitude}
          onClick={e => {
            e.originalEvent.stopPropagation();
            setSelectedWarehouse(warehouse);
          }}
        >
          <div 
            className="cursor-pointer text-green-600 hover:text-green-700 transition-colors"
            title={warehouse.name}
          >
            <WarehouseIcon className="h-6 w-6" />
          </div>
        </Marker>
      )})}

      {selectedWarehouse && (
        (() => {
        const location = warehouseLocations[selectedWarehouse.id];
        return location && (
        <Popup
          latitude={location.latitude}
          longitude={location.longitude}
          onClose={() => setSelectedWarehouse(null)}
          closeButton={true}
          closeOnClick={false}
          className="min-w-[200px]"
        >
          <div className="p-3">
            <h3 className="font-medium text-gray-900 mb-2">{selectedWarehouse.name}</h3>
            <div className="space-y-1 text-sm text-gray-500">
              <p>{selectedWarehouse.city}, {selectedWarehouse.country}</p>
              <p>{selectedWarehouse.size_m2} m²</p>
              <p>€{(selectedWarehouse.price_per_m2_cents / 100).toFixed(2)}/m²</p>
            </div>
            <button
              onClick={() => onWarehouseClick(selectedWarehouse.id)}
              className="mt-3 w-full px-3 py-1.5 text-sm text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              View Details
            </button>
          </div>
        </Popup>
        );
        })()
      )}
    </Map>
  );
}