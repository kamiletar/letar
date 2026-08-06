'use client'

import { Pagination } from '@/app/_components/ui/pagination'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { Box, Button, Card, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Props для AdminPageLayout
 */
export interface AdminPageLayoutProps {
  /** Заголовок страницы */
  title: string
  /** Контент страницы (таблица, список и т.д.) */
  children: ReactNode
  /** Общее количество записей для пагинации */
  total: number
  /** Базовый путь для пагинации */
  basePath: string
  /** Путь для кнопки добавления (опционально) */
  addPath?: string
  /** Текст для пустого состояния */
  emptyText?: string
  /** Показывать ли пустое состояние */
  isEmpty?: boolean
  /** Дополнительный контент в header (фильтры и т.д.) */
  headerExtra?: ReactNode
  /** Размер страницы для пагинации */
  pageSize?: number
}

/**
 * Общий layout для admin страниц с таблицами
 */
export function AdminPageLayout({
  title,
  children,
  total,
  basePath,
  addPath,
  emptyText = 'Записей пока нет',
  isEmpty = false,
  headerExtra,
  pageSize = ADMIN_PAGE_SIZE,
}: AdminPageLayoutProps) {
  return (
    <VStack gap={6} align="stretch">
      {/* Header с заголовком и кнопкой добавления */}
      <HStack justify="space-between">
        <HStack gap={4}>
          <Heading size="xl">{title}</Heading>
          {total > 0 && <Text color="fg.muted">({total})</Text>}
        </HStack>
        {addPath && (
          <Button asChild colorPalette="purple">
            <Link href={addPath}>
              <Icon>
                <Plus />
              </Icon>
              Добавить
            </Link>
          </Button>
        )}
      </HStack>

      {/* Дополнительный контент (фильтры) */}
      {headerExtra}

      {/* Основной контент в Card */}
      <Card.Root>
        <Card.Body p={0}>
          {isEmpty
            ? (
              <Box p={6}>
                <Text color="fg.muted">{emptyText}</Text>
              </Box>
            )
            : children}
        </Card.Body>
      </Card.Root>

      {/* Пагинация */}
      <Pagination total={total} pageSize={pageSize} basePath={basePath} />
    </VStack>
  )
}
