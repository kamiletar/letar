'use client'

/**
 * Поле поиска по имени — обновляет searchParams в URL.
 * Debounce 300ms для серверной фильтрации.
 */

import { Box, Input } from '@chakra-ui/react'
import { useDebounce } from '@letar/hooks'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuSearch } from 'react-icons/lu'

interface SearchInputProps {
  /** Placeholder текст */
  placeholder?: string
  /** Базовый путь для навигации */
  basePath: string
  /** Имя параметра в URL (по умолчанию 'q') */
  paramName?: string
}

export function SearchInput({ placeholder = 'Поиск...', basePath, paramName = 'q' }: SearchInputProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get(paramName) ?? '')
  const debouncedValue = useDebounce(value, 300)

  const updateUrl = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (query.trim()) {
        params.set(paramName, query.trim())
      } else {
        params.delete(paramName)
      }
      const qs = params.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath)
    },
    [router, searchParams, basePath, paramName],
  )

  /** Debounce 300ms — обновляем URL только когда пользователь перестал печатать */
  useEffect(() => {
    if (debouncedValue !== (searchParams.get(paramName) ?? '')) {
      updateUrl(debouncedValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- обновление URL только по debouncedValue, не при каждом изменении searchParams/updateUrl
  }, [debouncedValue])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
  }

  return (
    <Box position="relative" maxW="320px">
      <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted" pointerEvents="none">
        <LuSearch size={16} />
      </Box>
      <Input value={value} onChange={handleChange} placeholder={placeholder} size="sm" pl={9} borderRadius="lg" />
    </Box>
  )
}
