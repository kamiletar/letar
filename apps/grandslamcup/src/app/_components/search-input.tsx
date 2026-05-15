'use client'

/**
 * Поле поиска по имени — обновляет searchParams в URL.
 * Debounce 300ms для серверной фильтрации.
 */

import { Box, Input } from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    [router, searchParams, basePath, paramName]
  )

  /** Debounce 300ms */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    setValue(newValue)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => updateUrl(newValue), 300)
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
