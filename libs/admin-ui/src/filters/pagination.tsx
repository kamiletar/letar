'use client'

import { Button, HStack, IconButton, Text, useBreakpointValue } from '@chakra-ui/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { LuChevronLeft, LuChevronRight, LuChevronsLeft, LuChevronsRight } from 'react-icons/lu'

interface PaginationProps {
  /** Общее количество элементов */
  total: number
  /** Количество элементов на странице */
  pageSize?: number
  /** Имя параметра страницы в URL */
  paramName?: string
  /** Цветовая палитра */
  colorPalette?: string
}

/**
 * Компонент пагинации с URL-синхронизацией
 *
 * @example
 * ```tsx
 * // В page.tsx
 * const PAGE_SIZE = 10
 * const page = Number(searchParams.page) || 1
 * const total = await db.product.count({ where })
 * const products = await db.product.findMany({
 *   where,
 *   skip: (page - 1) * PAGE_SIZE,
 *   take: PAGE_SIZE,
 * })
 *
 * return (
 *   <>
 *     <ProductsTable products={products} />
 *     <Pagination total={total} pageSize={PAGE_SIZE} />
 *   </>
 * )
 * ```
 */
export function Pagination({ total, pageSize = 10, paramName = 'page', colorPalette = 'purple' }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentPage = Number(searchParams.get(paramName)) || 1
  const totalPages = Math.ceil(total / pageSize)

  // На мобильных показываем упрощённую пагинацию (хук должен быть до early return)
  const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: 'md' })

  // Не показываем пагинацию если всего 1 страница или меньше
  if (totalPages <= 1) {
    return null
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())

    if (page <= 1) {
      params.delete(paramName)
    } else {
      params.set(paramName, String(page))
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  // Генерируем номера страниц для отображения
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5 // Количество отображаемых страниц

    if (totalPages <= showPages) {
      // Показываем все страницы
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Показываем первую, последнюю и страницы вокруг текущей
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      pages.push(1)

      if (start > 2) {
        pages.push('ellipsis')
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (end < totalPages - 1) {
        pages.push('ellipsis')
      }

      pages.push(totalPages)
    }

    return pages
  }

  // Мобильная версия: только Prev/Next и счётчик
  if (isMobile) {
    return (
      <HStack gap={3} justify="center" py={4}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={!canGoPrev || isPending}
        >
          <LuChevronLeft />
          Назад
        </Button>

        <Text fontSize="sm" color="fg.muted" minW="60px" textAlign="center">
          {currentPage} / {totalPages}
        </Text>

        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={!canGoNext || isPending}
        >
          Вперёд
          <LuChevronRight />
        </Button>
      </HStack>
    )
  }

  // Десктопная версия: полная пагинация
  return (
    <HStack gap={2} justify="center" py={4}>
      {/* Первая страница */}
      <IconButton
        aria-label="Первая страница"
        variant="ghost"
        size="sm"
        onClick={() => goToPage(1)}
        disabled={!canGoPrev || isPending}
      >
        <LuChevronsLeft />
      </IconButton>

      {/* Предыдущая страница */}
      <IconButton
        aria-label="Предыдущая страница"
        variant="ghost"
        size="sm"
        onClick={() => goToPage(currentPage - 1)}
        disabled={!canGoPrev || isPending}
      >
        <LuChevronLeft />
      </IconButton>

      {/* Номера страниц */}
      <HStack gap={1}>
        {getPageNumbers().map((page, index) =>
          page === 'ellipsis'
            ? (
              <Text key={`ellipsis-${index}`} px={2} color="fg.muted">
                ...
              </Text>
            )
            : (
              <Button
                key={page}
                size="sm"
                variant={page === currentPage ? 'solid' : 'ghost'}
                colorPalette={page === currentPage ? colorPalette : 'gray'}
                onClick={() => goToPage(page)}
                disabled={isPending}
                minW="32px"
              >
                {page}
              </Button>
            )
        )}
      </HStack>

      {/* Следующая страница */}
      <IconButton
        aria-label="Следующая страница"
        variant="ghost"
        size="sm"
        onClick={() => goToPage(currentPage + 1)}
        disabled={!canGoNext || isPending}
      >
        <LuChevronRight />
      </IconButton>

      {/* Последняя страница */}
      <IconButton
        aria-label="Последняя страница"
        variant="ghost"
        size="sm"
        onClick={() => goToPage(totalPages)}
        disabled={!canGoNext || isPending}
      >
        <LuChevronsRight />
      </IconButton>

      {/* Информация о странице */}
      <Text fontSize="sm" color="fg.muted" ml={2}>
        {currentPage} из {totalPages}
      </Text>
    </HStack>
  )
}
