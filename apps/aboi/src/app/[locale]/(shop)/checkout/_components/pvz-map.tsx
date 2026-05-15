'use client'

import type { CdekDeliveryPoint } from '@/lib/shipping/cdek-types'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'

const LEAFLET_CDN = 'https://unpkg.com/leaflet@1.9.4/dist/images'

/** Обычный маркер ПВЗ */
const defaultIcon = L.icon({
  iconUrl: `${LEAFLET_CDN}/marker-icon.png`,
  iconRetinaUrl: `${LEAFLET_CDN}/marker-icon-2x.png`,
  shadowUrl: `${LEAFLET_CDN}/marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

/** Маркер выбранного ПВЗ — крупнее */
const selectedIcon = L.icon({
  iconUrl: `${LEAFLET_CDN}/marker-icon.png`,
  iconRetinaUrl: `${LEAFLET_CDN}/marker-icon-2x.png`,
  shadowUrl: `${LEAFLET_CDN}/marker-shadow.png`,
  iconSize: [32, 52],
  iconAnchor: [16, 52],
  popupAnchor: [0, -52],
  shadowSize: [52, 52],
})

/** Автоматически подгоняет viewport под все маркеры */
function FitBounds({ points }: { points: CdekDeliveryPoint[] }) {
  const map = useMap()

  useEffect(() => {
    const valid = points.filter((p) => p.location.latitude && p.location.longitude)
    if (valid.length === 0) { return }

    if (valid.length === 1) {
      map.setView([valid[0].location.latitude!, valid[0].location.longitude!], 14)
    } else {
      const bounds = L.latLngBounds(valid.map((p) => [p.location.latitude!, p.location.longitude!]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [map, points])

  return null
}

interface PvzMapProps {
  points: CdekDeliveryPoint[]
  selectedCode: string | undefined
  onSelect: (point: CdekDeliveryPoint) => void
}

/** Интерактивная карта с ПВЗ СДЭК. Загружается только на клиенте (ssr: false). */
export function PvzMap({ points, selectedCode, onSelect }: PvzMapProps) {
  const validPoints = points.filter((p) => p.location.latitude && p.location.longitude)

  if (validPoints.length === 0) { return null }

  const center: [number, number] = [validPoints[0].location.latitude!, validPoints[0].location.longitude!]

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: 300, borderRadius: 8, zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitBounds points={validPoints} />
      {validPoints.map((point) => {
        const addr = point.location.address_full || point.location.address
        const isSelected = selectedCode === point.code
        return (
          <Marker
            key={point.code}
            position={[point.location.latitude!, point.location.longitude!]}
            icon={isSelected ? selectedIcon : defaultIcon}
            eventHandlers={{ click: () => onSelect(point) }}
          >
            <Popup>
              <strong>{point.name}</strong>
              <br />
              {addr}
              {point.work_time && (
                <>
                  <br />
                  <span style={{ color: '#666', fontSize: 12 }}>{point.work_time}</span>
                </>
              )}
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
