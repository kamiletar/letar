'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { HStack, IconButton, Text } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { LuArrowDownWideNarrow, LuLayoutGrid } from 'react-icons/lu'

/** Переключатель: пагинация (по умолчанию) ↔ бесконечная прокрутка */
export function ViewModeToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isScrollMode = searchParams.get('view') === 'scroll'

  const setMode = useCallback(
    (mode: 'pages' | 'scroll') => {
      const params = new URLSearchParams(searchParams.toString())

      if (mode === 'scroll') {
        params.set('view', 'scroll')
      } else {
        params.delete('view')
      }

      // Сбрасываем страницу при переключении
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <HStack gap={1}>
      <Text fontSize="xs" color="fg.muted" display={{ base: 'none', md: 'block' }}>
        Вид:
      </Text>
      <IconButton
        aria-label="Постраничный просмотр"
        size="xs"
        variant={!isScrollMode ? 'solid' : 'outline'}
        colorPalette="fg"
        onClick={() => setMode('pages')}
      >
        <LuLayoutGrid />
      </IconButton>
      <IconButton
        aria-label="Бесконечная прокрутка"
        size="xs"
        variant={isScrollMode ? 'solid' : 'outline'}
        colorPalette="fg"
        onClick={() => setMode('scroll')}
      >
        <LuArrowDownWideNarrow />
      </IconButton>
    </HStack>
  )
}
