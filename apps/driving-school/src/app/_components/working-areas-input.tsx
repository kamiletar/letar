'use client'

import { CityInput } from '@/app/_components/city-input'
import { DistrictInput } from '@/app/_components/district-input'
import { Box, Button, Card, Checkbox, Heading, HStack, IconButton, Tag, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuMapPin, LuPlus, LuTrash2, LuX } from 'react-icons/lu'

/**
 * Структура одной рабочей зоны (город + районы)
 */
export interface WorkingArea {
  cityId: string // FIAS ID города
  cityName: string // Название города
  districts: string[] // Районы или ["*"] для всех районов
}

export interface WorkingAreasInputProps {
  value: WorkingArea[]
  onChange: (areas: WorkingArea[]) => void
  maxCities?: number
  disabled?: boolean
}

/**
 * Компонент для выбора рабочих зон инструктора.
 *
 * Позволяет:
 * - Добавить несколько городов
 * - Для каждого города выбрать районы или "все районы"
 * - Сохраняет FIAS ID для индексации
 */
export function WorkingAreasInput({ value, onChange, maxCities = 5, disabled }: WorkingAreasInputProps) {
  const [newCity, setNewCity] = useState('')
  const [pendingCityData, setPendingCityData] = useState<{ id: string; name: string } | null>(null)

  // Добавить новый город
  const handleAddCity = useCallback(() => {
    if (!pendingCityData || value.some((a) => a.cityId === pendingCityData.id)) {
      return
    }

    onChange([
      ...value,
      {
        cityId: pendingCityData.id,
        cityName: pendingCityData.name,
        districts: ['*'], // По умолчанию - все районы
      },
    ])
    setNewCity('')
    setPendingCityData(null)
  }, [pendingCityData, value, onChange])

  // Удалить город
  const handleRemoveCity = useCallback(
    (cityId: string) => {
      // Подтверждение удаления
      if (!window.confirm('Вы уверены, что хотите удалить этот город?')) {
        return
      }
      onChange(value.filter((a) => a.cityId !== cityId))
    },
    [value, onChange]
  )

  // Переключить "все районы"
  const handleToggleAllDistricts = useCallback(
    (cityId: string, allDistricts: boolean) => {
      onChange(value.map((area) => (area.cityId === cityId ? { ...area, districts: allDistricts ? ['*'] : [] } : area)))
    },
    [value, onChange]
  )

  // Обновить районы города
  const handleUpdateDistricts = useCallback(
    (cityId: string, districts: string[]) => {
      onChange(value.map((area) => (area.cityId === cityId ? { ...area, districts } : area)))
    },
    [value, onChange]
  )

  // Удалить район
  const handleRemoveDistrict = useCallback(
    (cityId: string, district: string) => {
      onChange(
        value.map((area) =>
          area.cityId === cityId ? { ...area, districts: area.districts.filter((d) => d !== district) } : area
        )
      )
    },
    [value, onChange]
  )

  return (
    <VStack align="stretch" gap={4}>
      {/* Список добавленных городов */}
      {value.map((area) => {
        const isAllDistricts = area.districts.length === 1 && area.districts[0] === '*'

        return (
          <Card.Root key={area.cityId} size="sm">
            <Card.Header py={3}>
              <HStack justify="space-between">
                <HStack gap={2}>
                  <LuMapPin />
                  <Heading size="sm">{area.cityName}</Heading>
                </HStack>
                <IconButton
                  aria-label="Удалить город"
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={() => handleRemoveCity(area.cityId)}
                  disabled={disabled}
                >
                  <LuTrash2 />
                </IconButton>
              </HStack>
            </Card.Header>
            <Card.Body py={3}>
              <VStack align="stretch" gap={3}>
                {/* Чекбокс "Все районы" */}
                <Checkbox.Root
                  checked={isAllDistricts}
                  onCheckedChange={(details) => handleToggleAllDistricts(area.cityId, !!details.checked)}
                  disabled={disabled}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Все районы города</Checkbox.Label>
                </Checkbox.Root>

                {/* Выбор конкретных районов */}
                {!isAllDistricts && (
                  <>
                    <DistrictInput
                      city={area.cityName}
                      values={area.districts}
                      onChange={(districts) => handleUpdateDistricts(area.cityId, districts)}
                      hideSelectedTags
                      placeholder="Добавить район..."
                    />

                    {/* Выбранные районы */}
                    {area.districts.length > 0 && (
                      <HStack flexWrap="wrap" gap={2}>
                        {area.districts.map((district) => (
                          <Tag.Root key={district} size="lg" colorPalette="brand">
                            <Tag.Label>{district}</Tag.Label>
                            <Tag.CloseTrigger onClick={() => handleRemoveDistrict(area.cityId, district)}>
                              <LuX />
                            </Tag.CloseTrigger>
                          </Tag.Root>
                        ))}
                      </HStack>
                    )}

                    {area.districts.length === 0 && (
                      <Text fontSize="sm" color="fg.muted">
                        Выберите районы или включите "Все районы"
                      </Text>
                    )}
                  </>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        )
      })}

      {/* Добавление нового города */}
      {value.length < maxCities && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Добавить город
          </Text>
          <HStack>
            <Box flex={1}>
              <CityInput
                value={newCity}
                onChange={setNewCity}
                onCitySelect={(suggestion) => {
                  const cityName = suggestion.data.city || suggestion.data.settlement || suggestion.value
                  const cityId = suggestion.data.city_fias_id || cityName
                  setPendingCityData({ id: cityId, name: cityName })
                }}
                placeholder="Введите город..."
              />
            </Box>
            <Button onClick={handleAddCity} disabled={!pendingCityData || disabled} colorPalette="brand" size="sm">
              <LuPlus />
              Добавить
            </Button>
          </HStack>
          {pendingCityData && pendingCityData.name !== newCity && (
            <Text fontSize="xs" color="fg.muted" mt={1}>
              Будет добавлен: {pendingCityData.name}
            </Text>
          )}
        </Box>
      )}

      {value.length >= maxCities && (
        <Text fontSize="sm" color="fg.muted">
          Достигнут лимит городов ({maxCities})
        </Text>
      )}

      {value.length === 0 && (
        <Text fontSize="sm" color="fg.muted">
          Добавьте хотя бы один город, где вы работаете
        </Text>
      )}
    </VStack>
  )
}
