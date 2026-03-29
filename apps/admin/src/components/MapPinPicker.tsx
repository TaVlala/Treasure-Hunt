// Interactive Mapbox map — click anywhere to place or move a pin.
// Returns lat/lng via onChange. Must be used with dynamic import (ssr: false).

'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapPinPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}

export default function MapPinPicker({ lat, lng, onChange, height = 320 }: MapPinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;

    // Initialize map centered on existing pin or world view
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng ?? 0, lat ?? 20],
      zoom: lat !== null ? 13 : 2,
    });
    mapRef.current = map;

    // Place initial marker if coordinates exist
    if (lat !== null && lng !== null) {
      markerRef.current = new mapboxgl.Marker({ color: '#F59E0B' })
        .setLngLat([lng, lat])
        .addTo(map);
    }

    // Move/place marker on click
    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.lngLat;
      if (markerRef.current) {
        markerRef.current.setLngLat([clickLng, clickLat]);
      } else {
        markerRef.current = new mapboxgl.Marker({ color: '#F59E0B' })
          .setLngLat([clickLng, clickLat])
          .addTo(map);
      }
      onChange(clickLat, clickLng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return (
      <div
        className="flex items-center justify-center bg-surface-2 border border-border rounded-lg text-text-muted text-sm"
        style={{ height }}
      >
        Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        style={{ height }}
        className="rounded-lg overflow-hidden border border-border"
      />
      <p className="text-xs text-text-faint">
        {lat !== null && lng !== null
          ? `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
          : 'Click the map to place a pin'}
      </p>
    </div>
  );
}
