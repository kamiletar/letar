'use client'

import { FieldCombobox } from '@letar/forms'
import { type ReactElement, useEffect, useState } from 'react'

interface BrandItem {
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
}

/**
 * Хук для загрузки марок автомобилей
 */
function useVehicleBrands(search: string) {
  const [data, setData] = useState<BrandItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!search) {
      setData([])
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    fetch(`/api/vehicles/brands?search=${encodeURIComponent(search)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((brands: BrandItem[]) => {
        setData(brands)
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
  }, [search])

  return { data, isLoading, error }
}

/**
 * Combobox для поиска марки автомобиля
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Combobox.VehicleBrand
 *   name="brand"
 *   label="Марка автомобиля"
 * />
 * ```
 */
export function ComboboxVehicleBrand({ name, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      // oxlint-disable-next-line react-hooks/rules-of-hooks -- хук вызывается внутри FieldCombobox при рендере
      useQuery={(search: string) => useVehicleBrands(search)}
      getLabel={(item) => (item as BrandItem).label}
      getValue={(item) => (item as BrandItem).id}
      minChars={1}
      debounce={300}
      emptyMessage="Марки не найдены"
      allowCustomValue
      {...props}
    />
  )
}
