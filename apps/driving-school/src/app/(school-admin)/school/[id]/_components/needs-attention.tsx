'use client'

/**
 * Виджет "Требуют внимания" для Manager Dashboard
 *
 * Группирует проблемы по категориям:
 * - Документы (истекающие, ожидающие проверки)
 * - Финансы (просроченные платежи)
 * - Обучение (неактивные ученики, готовые к экзамену)
 *
 * @module needs-attention
 */

import { Badge, Box, Button, Card, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuBanknote, LuChevronRight, LuFileWarning, LuUserX } from 'react-icons/lu'
import type { NeedsAttentionData } from '../_actions/dashboard.action'

// === Типы ===

interface NeedsAttentionWidgetProps {
  data: NeedsAttentionData
  schoolId: string
}

interface CategoryProps {
  title: string
  icon: React.ReactNode
  colorPalette: string
  items: CategoryItemProps[]
}

interface CategoryItemProps {
  label: string
  count: number
  subLabel?: string
  link: string
}

// === Компонент элемента категории ===

function CategoryItem({ label, count, subLabel, link }: CategoryItemProps) {
  if (count === 0) {
    return null
  }

  return (
    <Button asChild variant="ghost" size="sm" justifyContent="space-between" w="full" h="auto" py={2}>
      <Link href={link}>
        <VStack gap={0} align="start">
          <Text fontSize="sm">{label}</Text>
          {subLabel && (
            <Text fontSize="xs" color="fg.muted">
              {subLabel}
            </Text>
          )}
        </VStack>
        <HStack gap={2}>
          <Badge colorPalette="red" size="sm">
            {count}
          </Badge>
          <Icon as={LuChevronRight} boxSize={4} color="fg.muted" />
        </HStack>
      </Link>
    </Button>
  )
}

// === Компонент категории ===

function Category({ title, icon, colorPalette, items }: CategoryProps) {
  const visibleItems = items.filter((item) => item.count > 0)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <Card.Root variant="outline">
      <Card.Body p={3}>
        <VStack gap={2} align="stretch">
          <HStack gap={2}>
            <Box p={1.5} bg={`${colorPalette}.100`} borderRadius="md" _dark={{ bg: `${colorPalette}.900/30` }}>
              <Box color={`${colorPalette}.600`} _dark={{ color: `${colorPalette}.300` }}>
                {icon}
              </Box>
            </Box>
            <Text fontWeight="semibold" fontSize="sm">
              {title}
            </Text>
          </HStack>

          <VStack gap={0} align="stretch">
            {visibleItems.map((item) => (
              <CategoryItem key={item.label} {...item} />
            ))}
          </VStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

// === Форматирование суммы ===

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

// === Основной компонент ===

export function NeedsAttentionWidget({ data, schoolId }: NeedsAttentionWidgetProps) {
  const { documents, finances, training } = data

  // Проверяем, есть ли вообще проблемы
  const totalProblems =
    documents.expiringSoon +
    documents.pendingReview +
    finances.overduePayments +
    training.inactiveStudents +
    training.readyForExam

  if (totalProblems === 0) {
    return (
      <Card.Root>
        <Card.Body p={6}>
          <VStack gap={2}>
            <Text fontSize="4xl">✅</Text>
            <Heading size="md">Всё под контролем</Heading>
            <Text color="fg.muted" textAlign="center">
              Нет проблем, требующих внимания
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Требуют внимания</Heading>
        <Badge colorPalette="red" size="lg">
          {totalProblems}
        </Badge>
      </HStack>

      <VStack gap={3} align="stretch">
        {/* Документы */}
        <Category
          title="Документы"
          icon={<Icon as={LuFileWarning} boxSize={4} />}
          colorPalette="red"
          items={[
            {
              label: 'Истекающие медсправки',
              count: documents.expiringSoon,
              subLabel: 'в ближайшие 30 дней',
              link: `/school/progress/${schoolId}?filter=documents-expiring`,
            },
            {
              label: 'Ожидают проверки',
              count: documents.pendingReview,
              link: `/school/progress/${schoolId}?filter=documents-pending`,
            },
          ]}
        />

        {/* Финансы */}
        <Category
          title="Финансы"
          icon={<Icon as={LuBanknote} boxSize={4} />}
          colorPalette="orange"
          items={[
            {
              label: 'Просроченные платежи',
              count: finances.overduePayments,
              subLabel: finances.overdueAmount > 0 ? `на сумму ${formatAmount(finances.overdueAmount)}` : undefined,
              link: `/school/progress/${schoolId}?filter=debt`,
            },
          ]}
        />

        {/* Обучение */}
        <Category
          title="Обучение"
          icon={<Icon as={LuUserX} boxSize={4} />}
          colorPalette="yellow"
          items={[
            {
              label: 'Без занятий более 14 дней',
              count: training.inactiveStudents,
              link: `/school/progress/${schoolId}?filter=inactive`,
            },
            {
              label: 'Готовы к экзамену',
              count: training.readyForExam,
              subLabel: 'но не записаны',
              link: `/school/progress/${schoolId}?filter=ready-for-exam`,
            },
          ]}
        />
      </VStack>
    </Box>
  )
}
