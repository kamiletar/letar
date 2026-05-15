'use client'

import { useCallback, useState } from 'react'

interface GeolocationResult {
  city: string | null
  district: string | null
  error: string | null
}

interface UseGeolocationReturn {
  detect: () => Promise<GeolocationResult>
  isLoading: boolean
  result: GeolocationResult | null
}

/**
 * Хук для определения города и района по геолокации
 * Использует Nominatim (OpenStreetMap) для reverse geocoding
 */
export function useGeolocation(): UseGeolocationReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<GeolocationResult | null>(null)

  const detect = useCallback(async (): Promise<GeolocationResult> => {
    setIsLoading(true)

    try {
      // Проверяем поддержку геолокации
      if (!navigator.geolocation) {
        const error = { city: null, district: null, error: 'Геолокация не поддерживается браузером' }
        setResult(error)
        return error
      }

      // Получаем координаты
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 минут кэш
        })
      })

      const { latitude, longitude } = position.coords

      // Reverse geocoding через Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ru`,
        {
          headers: {
            'User-Agent': 'DrivingSchool/1.0',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Ошибка геокодирования')
      }

      const data = await response.json()
      const address = data.address || {}

      // Извлекаем город (может быть в разных полях)
      const city = address.city || address.town || address.village || address.municipality || address.state || null

      // Извлекаем район
      const district = address.suburb || address.district || address.neighbourhood || address.city_district || null

      const resultData = { city, district, error: null }
      setResult(resultData)
      return resultData
    } catch (err) {
      let errorMessage = 'Не удалось определить местоположение'

      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Доступ к геолокации запрещён'
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Местоположение недоступно'
            break
          case err.TIMEOUT:
            errorMessage = 'Время ожидания истекло'
            break
        }
      }

      const error = { city: null, district: null, error: errorMessage }
      setResult(error)
      return error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { detect, isLoading, result }
}
