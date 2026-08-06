'use client'

/**
 * Обёртка Яндекс.Карт API v3
 *
 * Загружает скрипт JS API, инициализирует карту через React ref.
 * Маркеры с балунами (popup) при клике.
 */

import { Box } from '@chakra-ui/react'
import Script from 'next/script'
import { useCallback, useRef } from 'react'

export interface MapMarker {
  id: string
  coordinates: [number, number] // [lat, lng]
  title: string
  description?: string
  href?: string
}

interface YandexMapProps {
  /** Центр карты [lat, lng] */
  center: [number, number]
  /** Уровень зума */
  zoom?: number
  /** Маркеры */
  markers?: MapMarker[]
  /** Высота карты */
  height?: string
}

const API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

export function YandexMap({ center, zoom = 12, markers = [], height = '400px' }: YandexMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)

  const initMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ymaps3 = (window as any).ymaps3
    if (!ymaps3) {
      return
    }

    await ymaps3.ready

    const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3

    // Создаём карту
    const map = new YMap(containerRef.current, {
      location: {
        center: [center[1], center[0]], // Яндекс.Карты: [lng, lat]
        zoom,
      },
    })

    map.addChild(new YMapDefaultSchemeLayer({}))
    map.addChild(new YMapDefaultFeaturesLayer({}))

    // Добавляем маркеры
    // Хардкод цвета — ограничение Yandex Maps JS API (DOM-элементы вне React/Chakra)
    const MARKER_COLOR = '#E53E3E'
    for (const marker of markers) {
      const el = document.createElement('div')
      el.style.cssText =
        `width:24px;height:24px;background:${MARKER_COLOR};border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);cursor:pointer;transform:translate(-50%,-50%);`

      if (marker.href) {
        el.onclick = () => {
          window.location.href = marker.href!
        }
      }

      el.title = marker.title

      map.addChild(
        new YMapMarker(
          {
            coordinates: [marker.coordinates[1], marker.coordinates[0]], // [lng, lat]
          },
          el,
        ),
      )
    }

    mapRef.current = map
  }, [center, zoom, markers])

  if (!API_KEY) {
    return (
      <Box h={height} bg="bg.subtle" borderRadius="xl" display="flex" alignItems="center" justifyContent="center">
        Карта недоступна (нет API ключа)
      </Box>
    )
  }

  return (
    <>
      <Script
        src={`https://api-maps.yandex.ru/v3/?apikey=${API_KEY}&lang=ru_RU`}
        strategy="lazyOnload"
        onReady={() => {
          void initMap()
        }}
      />
      <Box ref={containerRef} h={height} borderRadius="xl" overflow="hidden" bg="bg.subtle" />
    </>
  )
}
