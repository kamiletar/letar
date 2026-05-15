'use client'

import { Button, HStack } from '@chakra-ui/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import type { FilterOption } from '../types'

interface StatusFilterProps {
  /** Имя параметра в URL */
  paramName: string
  /** Опции фильтра */
  options: FilterOption[]
  /** Показывать кнопку "Все" */
  showAll?: boolean
  /** Цветовая палитра */
  colorPalette?: string
}

/**
 * Фильтр по статусу с URL-синхронизацией
 *
 * @example
 * ```tsx
 * <StatusFilter
 *   paramName="published"
 *   options={[
 *     { value: 'true', label: 'Опубликовано' },
 *     { value: 'false', label: 'Скрыто' },
 *   ]}
 * />
 * ```
 */
export function StatusFilter({ paramName, options, showAll = true, colorPalette = 'purple' }: StatusFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentValue = searchParams.get(paramName)

  const handleSelect = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set(paramName, value)
    } else {
      params.delete(paramName)
    }

    // Сбрасываем страницу при изменении фильтра
    params.delete('page')

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <HStack gap={1}>
      {showAll && (
        <Button
          size="xs"
          variant={currentValue === null ? 'solid' : 'ghost'}
          colorPalette={currentValue === null ? colorPalette : 'gray'}
          onClick={() => handleSelect(null)}
          disabled={isPending}
        >
          Все
        </Button>
      )}
      {options.map((option) => (
        <Button
          key={option.value}
          size="xs"
          variant={currentValue === option.value ? 'solid' : 'ghost'}
          colorPalette={currentValue === option.value ? colorPalette : 'gray'}
          onClick={() => handleSelect(option.value)}
          disabled={isPending}
        >
          {option.label}
        </Button>
      ))}
    </HStack>
  )
}
