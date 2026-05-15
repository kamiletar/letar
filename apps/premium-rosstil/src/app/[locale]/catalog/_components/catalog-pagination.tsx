'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { Button, HStack, Text } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

interface CatalogPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export function CatalogPagination({ currentPage, totalPages, totalItems, itemsPerPage }: CatalogPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString())

      if (page <= 1) {
        params.delete('page')
      } else {
        params.set('page', String(page))
      }

      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  // Не показываем пагинацию, если всего одна страница
  if (totalPages <= 1) {
    return null
  }

  // Вычисляем диапазон показываемых элементов
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Генерируем номера страниц для отображения
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5 // Максимум видимых номеров

    if (totalPages <= maxVisible) {
      // Показываем все страницы
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Показываем первую, последнюю и несколько вокруг текущей
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      pages.push(totalPages)
    }

    return pages
  }

  return (
    <HStack justify="center" gap={4} py={8} data-testid="catalog-pagination">
      {/* Кнопка "Назад" */}
      <Button
        size="sm"
        variant="outline"
        disabled={currentPage <= 1}
        onClick={() => goToPage(currentPage - 1)}
        data-testid="pagination-prev"
      >
        <LuChevronLeft />
        Назад
      </Button>

      {/* Номера страниц */}
      <HStack gap={1}>
        {getPageNumbers().map((page, pageIndex) =>
          page === 'ellipsis' ? (
            // oxlint-disable-next-line eslint-plugin-react(no-array-index-key) -- ellipsis элементы без уникальных ID
            <Text key={`ellipsis-${pageIndex}`} px={2} color="fg.muted">
              …
            </Text>
          ) : (
            <Button
              key={page}
              size="sm"
              variant={page === currentPage ? 'solid' : 'outline'}
              colorPalette={page === currentPage ? 'fg' : 'gray'}
              onClick={() => goToPage(page)}
              minW="40px"
            >
              {page}
            </Button>
          )
        )}
      </HStack>

      {/* Кнопка "Вперёд" */}
      <Button
        size="sm"
        variant="outline"
        disabled={currentPage >= totalPages}
        onClick={() => goToPage(currentPage + 1)}
        data-testid="pagination-next"
      >
        Вперёд
        <LuChevronRight />
      </Button>

      {/* Информация о странице */}
      <Text fontSize="sm" color="fg.muted" display={{ base: 'none', md: 'block' }}>
        {startItem}–{endItem} из {totalItems}
      </Text>
    </HStack>
  )
}
