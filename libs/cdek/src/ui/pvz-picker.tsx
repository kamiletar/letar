'use client'

import { Box, Button, chakra, createIcon, Group, Icon, Input, Spinner, Stack, Text } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { CdekCityItem, CdekDeliveryPoint, DadataCitySuggestion, DeliveryPointsResult } from '../server/cdek-types'

const PvzMap = dynamic(() => import('./pvz-map').then((m) => ({ default: m.PvzMap })), {
  ssr: false,
  loading: () => (
    <Box h="300px" bg="bg.subtle" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
      <Spinner size="sm" />
    </Box>
  ),
})

const CrosshairIcon = createIcon({
  displayName: 'CrosshairIcon',
  viewBox: '0 0 24 24',
  defaultProps: {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  path: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </>
  ),
})

const CheckIcon = createIcon({
  displayName: 'CheckIcon',
  viewBox: '0 0 24 24',
  defaultProps: {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2.5',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  path: <polyline points="20 6 9 17 4 12" />,
})

type GeoState = 'idle' | 'requesting' | 'searching' | 'done' | 'error'

/** Серверные экшны передаются через props — библиотека не знает о конкретном Next.js приложении */
export interface PvzPickerActions {
  searchCities: (query: string) => Promise<DadataCitySuggestion[]>
  getDeliveryPoints: (cityCode: number) => Promise<DeliveryPointsResult>
  getCdekCityByName: (name: string) => Promise<CdekCityItem | null>
  getCityByCoordinates: (lat: number, lng: number) => Promise<CdekCityItem | null>
}

export interface PvzPickerProps {
  /** Коллбэк при выборе ПВЗ: код, адрес, почтовый индекс */
  onSelect: (code: string, address: string, postalCode: string) => void
  selectedPvzCode: string | undefined
  disabled?: boolean
  /** Цветовая палитра для выделения выбранного ПВЗ (semantic token). Дефолт: 'gray' */
  colorPalette?: string
  actions: PvzPickerActions
}

/** Компонент выбора ПВЗ СДЭК через поиск города + интерактивная карта */
export function PvzPicker({ selectedPvzCode, onSelect, disabled, colorPalette = 'gray', actions }: PvzPickerProps) {
  const [cityQuery, setCityQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<DadataCitySuggestion[]>([])
  const [selectedCity, setSelectedCity] = useState<CdekCityItem | null>(null)
  const [cityLoading, setCityLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const [geoState, setGeoState] = useState<GeoState>('idle')
  const [geoError, setGeoError] = useState<string | null>(null)
  const geoSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [points, setPoints] = useState<CdekDeliveryPoint[]>([])
  const [pvzLoading, setPvzLoading] = useState(false)
  const [pvzError, setPvzError] = useState<string | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<CdekDeliveryPoint | null>(null)
  const [pvzFilter, setPvzFilter] = useState('')

  useEffect(() => {
    if (debounceRef.current) {clearTimeout(debounceRef.current)}
    if (cityQuery.length < 2) {
      setCitySuggestions([])
      setShowDropdown(false)
      return
    }
    if (selectedCity && cityQuery === selectedCity.city) {return}
    debounceRef.current = setTimeout(async () => {
      setCityLoading(true)
      const results = await actions.searchCities(cityQuery)
      setCitySuggestions(results)
      setShowDropdown(results.length > 0)
      setCityLoading(false)
    }, 300)
    return () => {
      if (debounceRef.current) {clearTimeout(debounceRef.current)}
    }
  }, [cityQuery, selectedCity, actions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!selectedCity) {
      setPoints([])
      setPvzError(null)
      return
    }
    setPvzLoading(true)
    setPvzError(null)
    setSelectedPoint(null)
    setPvzFilter('')
    actions.getDeliveryPoints(selectedCity.code).then((result) => {
      setPoints(result.points)
      if (result.points.length === 0) {
        setPvzError(result.error ?? 'ПВЗ не найдены — выберите доставку курьером')
      }
      setPvzLoading(false)
    })
  }, [selectedCity, actions])

  useEffect(() => {
    return () => {
      if (geoSuccessTimerRef.current) {clearTimeout(geoSuccessTimerRef.current)}
    }
  }, [])

  function handleCdekCityReady(city: CdekCityItem) {
    setSelectedCity(city)
    setCityQuery(city.city)
    setShowDropdown(false)
  }

  async function handleDadataCitySelect(suggestion: DadataCitySuggestion) {
    setCityQuery(suggestion.city)
    setShowDropdown(false)
    setCityLoading(true)
    setPvzError(null)

    const cdekCity = await actions.getCdekCityByName(suggestion.city)
    setCityLoading(false)

    if (cdekCity) {
      handleCdekCityReady(cdekCity)
    } else {
      setPvzError(`"${suggestion.city}" не обслуживается СДЭК — выберите доставку курьером`)
      setSelectedCity(null)
      setPoints([])
    }
  }

  function handlePointSelect(point: CdekDeliveryPoint) {
    setSelectedPoint(point)
    const addr = point.location.address_full || point.location.address
    const postal = point.location.postal_code || selectedCity?.postal_codes[0] || ''
    onSelect(point.code, addr, postal)
  }

  function handleClearPoint() {
    setSelectedPoint(null)
    onSelect('', '', '')
  }

  async function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoState('error')
      setGeoError('Геолокация не поддерживается вашим браузером')
      return
    }

    setGeoState('requesting')
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setGeoState('searching')
        const { latitude, longitude } = position.coords
        const city = await actions.getCityByCoordinates(latitude, longitude)

        if (!city) {
          setGeoState('error')
          setGeoError('Не удалось определить город — введите вручную')
          return
        }

        handleCdekCityReady(city)
        setGeoState('done')
        geoSuccessTimerRef.current = setTimeout(() => {
          setGeoState('idle')
        }, 2_000)
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Доступ к геолокации запрещён — введите город вручную',
          2: 'Не удалось определить местоположение',
          3: 'Превышено время ожидания геолокации',
        }
        setGeoState('error')
        setGeoError(messages[err.code] ?? 'Ошибка геолокации')
      },
      { timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    )
  }

  const isGeoBusy = geoState === 'requesting' || geoState === 'searching'
  const selectedAddr = selectedPoint ? selectedPoint.location.address_full || selectedPoint.location.address : null

  return (
    <Stack gap={3} mt={1} pt={2} pb={2}>
      <Text fontSize="sm" fontWeight="medium" color="fg.muted">
        Выберите пункт выдачи СДЭК
      </Text>

      <Box position="relative" ref={dropdownRef}>
        <Group attached w="full">
          <Input
            size="sm"
            placeholder="Начните вводить город..."
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value)
              if (selectedCity && e.target.value !== selectedCity.city) {
                setSelectedCity(null)
                setPoints([])
              }
            }}
            disabled={disabled || isGeoBusy}
            flex={1}
          />

          <Button
            size="sm"
            variant={geoState === 'done' ? 'solid' : 'subtle'}
            colorPalette={geoState === 'done' ? 'green' : geoState === 'error' ? 'orange' : 'gray'}
            onClick={handleGeolocate}
            disabled={disabled || isGeoBusy}
            title="Определить город по геолокации"
            gap={1.5}
            flexShrink={0}
            minW="auto"
            px={3}
            transition="all 0.2s"
          >
            {isGeoBusy ? <Spinner size="xs" /> : geoState === 'done'
              ? (
                <Icon>
                  <CheckIcon />
                </Icon>
              )
              : (
                <Icon>
                  <CrosshairIcon />
                </Icon>
              )}
            <chakra.span display={{ base: 'none', sm: 'inline' }} fontSize="xs">
              {geoState === 'requesting'
                ? 'Геолокация…'
                : geoState === 'searching'
                ? 'Ищем…'
                : geoState === 'done'
                ? 'Найден'
                : 'Мой город'}
            </chakra.span>
          </Button>
        </Group>

        {cityQuery.length >= 2 && !selectedCity && !cityLoading && !showDropdown && !isGeoBusy && (
          <Text fontSize="xs" color="fg.muted" mt={1}>
            Выберите город из подсказок ↑ или продолжайте вводить
          </Text>
        )}

        {geoState === 'error' && geoError && (
          <Text fontSize="xs" color="orange.fg" mt={1}>
            {geoError}
          </Text>
        )}

        {cityLoading && !isGeoBusy && (
          <Box position="absolute" right={2} top="50%" transform="translateY(-50%)" pointerEvents="none">
            <Spinner size="xs" />
          </Box>
        )}

        {showDropdown && (
          <Box
            position="absolute"
            top="100%"
            left={0}
            right={0}
            zIndex={10}
            bg="bg"
            borderWidth="1px"
            borderColor="border"
            borderRadius="md"
            shadow="md"
            maxH="200px"
            overflowY="auto"
            mt={1}
            onMouseDown={(e) => e.preventDefault()}
          >
            {citySuggestions.map((suggestion) => (
              <Box
                key={suggestion.city + suggestion.region}
                px={3}
                py={2}
                cursor="pointer"
                _hover={{ bg: 'bg.subtle' }}
                onClick={() => handleDadataCitySelect(suggestion)}
              >
                <Text fontSize="sm">{suggestion.city}</Text>
                {suggestion.region && suggestion.region !== suggestion.city && (
                  <Text fontSize="xs" color="fg.muted">
                    {suggestion.region}
                  </Text>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {pvzLoading && (
        <Box py={4} textAlign="center">
          <Spinner size="sm" />
          <Text fontSize="sm" color="fg.muted" mt={2}>
            Загружаем ПВЗ...
          </Text>
        </Box>
      )}

      {pvzError && !pvzLoading && (
        <Box p={3} bg="orange.subtle" borderRadius="md">
          <Text fontSize="sm" color="orange.fg">
            {pvzError}
          </Text>
        </Box>
      )}

      {points.length > 0 && !pvzLoading && (
        <>
          <PvzMap points={points} selectedCode={selectedPvzCode} onSelect={handlePointSelect} />

          <Input
            size="sm"
            placeholder={`Поиск среди ${points.length} пунктов...`}
            value={pvzFilter}
            onChange={(e) => setPvzFilter(e.target.value)}
            disabled={disabled}
          />

          {(() => {
            const q = pvzFilter.trim().toLowerCase()
            const filtered = q
              ? points.filter((p) => {
                const addr = p.location.address_full || p.location.address
                return p.name.toLowerCase().includes(q) || addr.toLowerCase().includes(q)
              })
              : points
            return (
              <Box overflowY="auto" maxH="240px" borderWidth="1px" borderRadius="md" borderColor="border">
                {filtered.length === 0 && (
                  <Box px={3} py={4} textAlign="center">
                    <Text fontSize="sm" color="fg.muted">
                      Ничего не найдено
                    </Text>
                  </Box>
                )}
                {filtered.map((point) => {
                  const addr = point.location.address_full || point.location.address
                  const isSelected = selectedPvzCode === point.code
                  return (
                    <Box
                      key={point.code}
                      p={3}
                      cursor={disabled ? 'default' : 'pointer'}
                      borderBottomWidth="1px"
                      borderColor="border"
                      _last={{ borderBottomWidth: 0 }}
                      bg={isSelected ? 'colorPalette.subtle' : 'transparent'}
                      borderLeftWidth="3px"
                      borderLeftColor={isSelected ? 'colorPalette.500' : 'transparent'}
                      colorPalette={colorPalette}
                      _hover={disabled ? {} : { bg: 'bg.subtle' }}
                      onClick={() => {
                        if (!disabled) {
                          if (isSelected) {
                            handleClearPoint()
                          } else {
                            handlePointSelect(point)
                          }
                        }
                      }}
                    >
                      <Text fontSize="sm" fontWeight="medium">
                        {point.name}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {addr}
                      </Text>
                      {point.work_time && (
                        <Text fontSize="xs" color="fg.muted">
                          {point.work_time}
                        </Text>
                      )}
                    </Box>
                  )
                })}
              </Box>
            )
          })()}
        </>
      )}

      {selectedAddr && (
        <Box p={3} bg="green.subtle" borderRadius="md" borderWidth="1px" borderColor="green.muted" position="relative">
          <Button
            size="xs"
            variant="ghost"
            position="absolute"
            top={1}
            right={1}
            onClick={handleClearPoint}
            aria-label="Отменить выбор ПВЗ"
            color="fg.muted"
            _hover={{ color: 'fg' }}
            disabled={disabled}
          >
            ✕
          </Button>
          <Text fontSize="xs" color="fg.muted" mb={0.5}>
            Выбранный пункт выдачи:
          </Text>
          <Text fontSize="sm" fontWeight="medium" color="green.fg">
            {selectedPoint?.name}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {selectedAddr}
          </Text>
        </Box>
      )}
    </Stack>
  )
}
