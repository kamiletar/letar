'use client'

import { Button, HStack, Icon, Text } from '@chakra-ui/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { memo, useMemo } from 'react'

interface PaginationProps {
  /** Общее количество элементов */
  total: number
  /** Элементов на странице */
  pageSize?: number
  /** Текущая страница (1-based) */
  currentPage?: number
  /** Базовый путь для ссылок */
  basePath: string
}

/**
 * Компонент пагинации для админки
 *
 * @example
 * ```tsx
 * <Pagination
 *   total={100}
 *   pageSize={20}
 *   basePath="/ru/admin/requests"
 * />
 * ```
 */
export const Pagination = memo(function Pagination({ total, pageSize = 20, currentPage, basePath }: PaginationProps) {
  const searchParams = useSearchParams()

  const page = (currentPage ?? Number(searchParams.get('page'))) || 1
  const totalPages = Math.ceil(total / pageSize)

  // Вычисляем видимые страницы (показываем 5 страниц вокруг текущей)
  const visiblePages = useMemo(() => {
    const pages: number[] = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return pages
  }, [page, totalPages])

  // Формируем URL с сохранением остальных параметров
  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(targetPage))
    return `${basePath}?${params.toString()}`
  }

  // Не показываем пагинацию, если одна страница
  if (totalPages <= 1) {
    return null
  }

  return (
    <HStack justify="center" gap={2} py={4}>
      {/* Предыдущая страница */}
      <Button asChild={page > 1} variant="ghost" size="sm" disabled={page <= 1} aria-label="Предыдущая страница">
        {page > 1
          ? (
            <Link href={getPageUrl(page - 1)}>
              <Icon>
                <ChevronLeft />
              </Icon>
            </Link>
          )
          : (
            <Icon>
              <ChevronLeft />
            </Icon>
          )}
      </Button>

      {/* Первая страница и многоточие */}
      {visiblePages[0] > 1 && (
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href={getPageUrl(1)}>1</Link>
          </Button>
          {visiblePages[0] > 2 && (
            <Text color="fg.muted" px={1}>
              ...
            </Text>
          )}
        </>
      )}

      {/* Номера страниц */}
      {visiblePages.map((pageNum) => (
        <Button
          key={pageNum}
          asChild={pageNum !== page}
          variant={pageNum === page ? 'solid' : 'ghost'}
          colorPalette={pageNum === page ? 'purple' : undefined}
          size="sm"
        >
          {pageNum === page ? <span>{pageNum}</span> : <Link href={getPageUrl(pageNum)}>{pageNum}</Link>}
        </Button>
      ))}

      {/* Последняя страница и многоточие */}
      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <Text color="fg.muted" px={1}>
              ...
            </Text>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href={getPageUrl(totalPages)}>{totalPages}</Link>
          </Button>
        </>
      )}

      {/* Следующая страница */}
      <Button
        asChild={page < totalPages}
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        aria-label="Следующая страница"
      >
        {page < totalPages
          ? (
            <Link href={getPageUrl(page + 1)}>
              <Icon>
                <ChevronRight />
              </Icon>
            </Link>
          )
          : (
            <Icon>
              <ChevronRight />
            </Icon>
          )}
      </Button>
    </HStack>
  )
})
