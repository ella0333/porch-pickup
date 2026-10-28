"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";
import { money } from "@/lib/format";

type Pin = { id: string; title: string; price: number; lat: number; lng: number };

// Each listing is drawn as a 400 m circle around its fuzzed point, never a pin on a house.
export default function FeedMap({ pins, center }: { pins: Pin[]; center: { lat: number; lng: number } }) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} scrollWheelZoom className="h-[560px] w-full rounded-xl border border-line">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[center.lat, center.lng]} radius={6} pathOptions={{ color: "#1f2a24", fillOpacity: 1 }} />
      {pins.map((p) => (
        <Circle key={p.id} center={[p.lat, p.lng]} radius={400} pathOptions={{ color: "#2f6b4f", fillOpacity: 0.15, weight: 1.5 }}>
          <Popup>
            <a href={`/listings/${p.id}`} style={{ fontWeight: 600 }}>
              {money(p.price)}
            </a>
            <br />
            {p.title}
          </Popup>
        </Circle>
      ))}
    </MapContainer>
  );
}
