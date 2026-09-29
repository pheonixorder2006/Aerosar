import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin, Navigation, Compass } from "lucide-react";

export function OSMMap({ coordinates, onCoordinateChange, disasterType, humanCount }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const { latitude, longitude } = coordinates;

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 14,
        zoomControl: true,
        attributionControl: true
      });

      // OpenStreetMap tile layer (configurable via VITE_OSM_TILE_URL)
      const tileUrl = import.meta.env?.VITE_OSM_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Custom SAR Tactical Pin
      const createPin = () =>
        L.divIcon({
          className: "sar-osm-marker",
          html: `
            <div class="sar-pin-pulse"></div>
            <div class="sar-pin-core">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
              </svg>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

      const marker = L.marker([latitude, longitude], {
        icon: createPin(),
        draggable: true
      }).addTo(map);

      // Disaster Hazard Area Circle
      const circle = L.circle([latitude, longitude], {
        color: disasterType?.includes("Fire") ? "#ef4444" :
               disasterType?.includes("Flood") ? "#0284c7" :
               disasterType?.includes("Collapse") ? "#f59e0b" : "#3b82f6",
        fillColor: disasterType?.includes("Fire") ? "#ef4444" :
                   disasterType?.includes("Flood") ? "#0284c7" :
                   disasterType?.includes("Collapse") ? "#f59e0b" : "#3b82f6",
        fillOpacity: 0.18,
        radius: 350
      }).addTo(map);

      // Handle marker drag
      marker.on("dragend", (e) => {
        const pos = e.target.getLatLng();
        if (onCoordinateChange) {
          onCoordinateChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)), "Map Drag");
        }
      });

      // Handle click anywhere on map to reposition coordinates
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        if (onCoordinateChange) {
          onCoordinateChange(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)), "Map Click");
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      // Invalidate size after layout renders
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map when coordinates or disaster changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;

    const latLng = [latitude, longitude];
    markerRef.current.setLatLng(latLng);

    if (circleRef.current) {
      circleRef.current.setLatLng(latLng);
      const color = disasterType?.includes("Fire") ? "#ef4444" :
                    disasterType?.includes("Flood") ? "#0284c7" :
                    disasterType?.includes("Collapse") ? "#f59e0b" : "#3b82f6";
      circleRef.current.setStyle({
        color,
        fillColor: color,
        radius: humanCount > 0 ? 450 : 250
      });
    }

    mapInstanceRef.current.panTo(latLng, { animate: true, duration: 0.8 });
  }, [latitude, longitude, disasterType, humanCount]);

  const recenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 15, { animate: true });
    }
  };

  return (
    <div className="osm-map-wrapper">
      <div className="osm-map-container" ref={mapContainerRef} />
      
      {/* HUD Telemetry Overlay on the Map */}
      <div className="map-hud-overlay">
        <div className="map-hud-pill">
          <Navigation size={13} className="text-cyan" />
          <span>OPENSTREETMAP SAR GRID</span>
        </div>
        <button className="map-recenter-btn" onClick={recenter} title="Center on Target">
          <Crosshair size={14} /> Center Target
        </button>
      </div>

      <div className="map-caption-bar">
        <span><MapPin size={13} /> Click or drag marker anywhere on OpenStreetMap to update target coordinates</span>
      </div>
    </div>
  );
}
