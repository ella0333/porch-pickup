"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Circle } from "react-leaflet";

export default function AreaMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={14} scrollWheelZoom={false} className="h-56 w-full rounded-xl border border-line">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle center={[lat, lng]} radius={600} pathOptions={{ color: "#2f6b4f", fillOpacity: 0.15, weight: 1.5 }} />
    </MapContainer>
  );
}
