'use client'

import { FieldCombobox } from '@letar/forms'
import { type ReactElement, useEffect, useState } from 'react'

interface ModelItem {
  id: string
  label: string
}

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Марка автомобиля для фильтрации моделей */
  brand?: string
}

/**
 * Хук для загрузки моделей автомобилей
 */
function useVehicleModels(search: string, brand?: string) {
  const [data, setData] = useState<ModelItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Без марки не загружаем модели
    if (!brand) {
      setData([])
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    const params = new URLSearchParams({ brand })
    if (search) {
      params.set('search', search)
    }

    fetch(`/api/vehicles/models?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((models: ModelItem[]) => {
        setData(models)
        setError(null)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err)
        }
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [search, brand])

  return { data, isLoading, error }
}

/**
 * Combobox для поиска модели автомобиля
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Combobox.VehicleModel
 *   name="model"
 *   label="Модель автомобиля"
 *   brand={selectedBrand}
 * />
 * ```
 */
export function ComboboxVehicleModel({ name, brand, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      // oxlint-disable-next-line react-hooks/rules-of-hooks -- хук вызывается внутри FieldCombobox при рендере
      useQuery={(search: string) => useVehicleModels(search, brand)}
      getLabel={(item) => (item as ModelItem).label}
      getValue={(item) => (item as ModelItem).id}
      minChars={0}
      debounce={300}
      emptyMessage={brand ? 'Модели не найдены' : 'Сначала выберите марку'}
      allowCustomValue
      disabled={!brand}
      {...props}
    />
  )
}
