'use client'

import { HStack, IconButton, Input } from '@chakra-ui/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { LuSearch, LuX } from 'react-icons/lu'

interface SearchFilterProps {
  /** Placeholder для поля поиска */
  placeholder?: string
  /** Имя параметра в URL (по умолчанию 'q') */
  paramName?: string
}

/**
 * Компонент поиска с debounce и URL-синхронизацией
 *
 * Использует searchParams для server-side фильтрации.
 * При вводе обновляет URL, что триггерит перезагрузку страницы с фильтрованными данными.
 *
 * @example
 * ```tsx
 * // В page.tsx
 * export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
 *   const { q } = await searchParams
 *   const products = await db.product.findMany({
 *     where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
 *   })
 *
 *   return (
 *     <>
 *       <SearchFilter placeholder="Поиск товаров..." />
 *       <ProductsTable products={products} />
 *     </>
 *   )
 * }
 * ```
 */
export function SearchFilter({ placeholder = 'Поиск...', paramName = 'q' }: SearchFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentValue = searchParams.get(paramName) || ''
  const [inputValue, setInputValue] = useState(currentValue)
  const isUserInput = useRef(false)

  const updateSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value) {
        params.set(paramName, value)
      } else {
        params.delete(paramName)
      }

      // Сбрасываем страницу при новом поиске
      params.delete('page')

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams, paramName]
  )

  // Debounce через useEffect — правильная очистка таймаута
  useEffect(() => {
    // Пропускаем если это не пользовательский ввод
    if (!isUserInput.current) {
      return
    }

    const timeoutId = setTimeout(() => {
      updateSearch(inputValue)
      isUserInput.current = false
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [inputValue, updateSearch])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isUserInput.current = true
    setInputValue(e.target.value)
  }

  const handleClear = () => {
    isUserInput.current = false
    setInputValue('')
    updateSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      isUserInput.current = false // Отменяем debounce, сразу отправляем
      updateSearch(inputValue)
    }
    if (e.key === 'Escape') {
      handleClear()
    }
  }

  return (
    <HStack gap={2} w={{ base: 'full', md: 'auto' }} maxW={{ base: 'full', md: '320px' }}>
      <Input
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        size="sm"
        bg={{ _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }}
        borderColor="border.subtle"
        _placeholder={{ color: 'fg.muted' }}
        disabled={isPending}
        flex={1}
      />
      {inputValue ? (
        <IconButton aria-label="Очистить поиск" variant="ghost" size="sm" onClick={handleClear} disabled={isPending}>
          <LuX />
        </IconButton>
      ) : (
        <IconButton aria-label="Поиск" variant="ghost" size="sm" disabled>
          <LuSearch />
        </IconButton>
      )}
    </HStack>
  )
}
