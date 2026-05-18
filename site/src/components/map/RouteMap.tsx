'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { decode } from '@mapbox/polyline'

// Fix default marker icons
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const originIcon = L.divIcon({
  className: '',
  html: `<div style="background: linear-gradient(135deg, #3b82f6, #6366f1); width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

function createNumberedIcon(num: number) {
  return L.divIcon({
    className: '',
    html: `<div style="background: linear-gradient(135deg, #10b981, #059669); width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 12px;">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

interface MapPoint {
  lat: number
  lng: number
  label: string
}

export default function RouteMap({
  points,
  polyline,
}: {
  points: MapPoint[]
  polyline?: string | null
}) {
  if (points.length === 0) {
    return (
      <div className="w-full h-[500px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-8 h-8 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">
            Selecione clientes para visualizar no mapa
          </p>
        </div>
      </div>
    )
  }

  const center: [number, number] = [points[0].lat, points[0].lng]
  const decodedPolyline = polyline
    ? decode(polyline).map(([lat, lng]) => [lat, lng] as [number, number])
    : null

  // Calculate bounds
  const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]))

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-white/10 shadow-xl shadow-black/20">
      <MapContainer
        center={center}
        zoom={13}
        bounds={bounds.pad(0.1)}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Polyline */}
        {decodedPolyline && (
          <Polyline
            positions={decodedPolyline}
            pathOptions={{
              color: '#6366f1',
              weight: 4,
              opacity: 0.8,
            }}
          />
        )}

        {/* Markers */}
        {points.map((point, idx) => (
          <Marker
            key={`${point.lat}-${point.lng}-${idx}`}
            position={[point.lat, point.lng]}
            icon={idx === 0 ? originIcon : createNumberedIcon(idx)}
          >
            <Popup>
              <span className="font-medium">{point.label}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
