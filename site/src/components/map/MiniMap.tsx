'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="background: linear-gradient(135deg, #ef4444, #dc2626); width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
    <div style="transform: rotate(45deg); width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom())
  }, [lat, lng, map])
  return null
}

interface MiniMapProps {
  lat: number
  lng: number
  draggable?: boolean
  onPositionChange?: (lat: number, lng: number) => void
  height?: string
}

export default function MiniMap({
  lat,
  lng,
  draggable = false,
  onPositionChange,
  height = '240px',
}: MiniMapProps) {
  const markerRef = useRef<L.Marker | null>(null)

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-black/20"
      style={{ height }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter lat={lat} lng={lng} />
        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable={draggable}
          ref={(ref) => {
            markerRef.current = ref
          }}
          eventHandlers={
            draggable && onPositionChange
              ? {
                  dragend: (e) => {
                    const marker = e.target as L.Marker
                    const pos = marker.getLatLng()
                    onPositionChange(pos.lat, pos.lng)
                  },
                }
              : undefined
          }
        />
      </MapContainer>
    </div>
  )
}
