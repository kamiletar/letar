'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, Card, HStack, Stack, Text, VStack } from '@chakra-ui/react'
import { LicenseCategoryLabels } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { formatDuration } from '@letar/format-utils'
import Link from 'next/link'
import { useTransition } from 'react'
import { LuArchive, LuClock, LuPencil, LuRotateCcw, LuRussianRuble, LuSettings } from 'react-icons/lu'
import type { LessonTypeWithStats } from '../_actions/lesson-type.action'
import { deleteLessonType, restoreLessonType } from '../_actions/lesson-type.action'

interface LessonTypeCardProps {
  lessonType: LessonTypeWithStats
  isArchived?: boolean
}

export function LessonTypeCard({ lessonType, isArchived }: LessonTypeCardProps) {
  const [isPending, startTransition] = useTransition()

  const handleArchive = () => {
    startTransition(async () => {
      const result = await deleteLessonType(lessonType.id)
      if (result.success) {
        toaster.success({ title: 'Тип занятия архивирован' })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreLessonType(lessonType.id)
      if (result.success) {
        toaster.success({ title: 'Тип занятия восстановлен' })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price)
  }

  return (
    <Card.Root opacity={isArchived ? 0.7 : 1} borderColor={isArchived ? 'border.muted' : undefined}>
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {/* Заголовок и категория */}
          <HStack justify="space-between" align="start">
            <Box>
              <Text fontWeight="bold" fontSize="lg">
                {lessonType.name}
              </Text>
              {lessonType.licenseCategory && (
                <Badge colorPalette="blue" mt={1}>
                  {LicenseCategoryLabels[lessonType.licenseCategory] || lessonType.licenseCategory}
                </Badge>
              )}
            </Box>
            {isArchived && (
              <Badge colorPalette="gray" variant="subtle">
                Архив
              </Badge>
            )}
          </HStack>

          {/* Описание */}
          {lessonType.description && (
            <Text color="fg.muted" fontSize="sm" lineClamp={2}>
              {lessonType.description}
            </Text>
          )}

          {/* Цена и длительность */}
          <HStack gap={4}>
            <HStack color="fg.muted">
              <LuRussianRuble />
              <Text fontWeight="semibold" color="fg">
                {lessonType.pricingOptions.length > 0
                  ? `от ${formatPrice(Math.min(...lessonType.pricingOptions.map((o) => o.pricePerLesson)))} ₽`
                  : 'Цена не задана'}
              </Text>
            </HStack>
            <HStack color="fg.muted">
              <LuClock />
              <Text>{formatDuration(lessonType.durationMinutes)}</Text>
            </HStack>
          </HStack>

          {/* Статистика */}
          <Text fontSize="sm" color="fg.muted">
            Проведено занятий: {lessonType._count.lessons}
          </Text>
        </VStack>
      </Card.Body>

      <Card.Footer>
        <Stack direction={{ base: 'column', sm: 'row' }} gap={2} wrap={{ sm: 'wrap' }} width="100%">
          {!isArchived && (
            <>
              <Button asChild variant="outline" size="md">
                <Link href={`/lesson-types/${lessonType.id}/edit`}>
                  <LuPencil />
                  Редактировать
                </Link>
              </Button>
              <Button asChild variant="outline" size="md" colorPalette="brand">
                <Link href={`/lesson-types/${lessonType.id}/pricing`}>
                  <LuSettings />
                  Настроить цены
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="md"
                colorPalette="red"
                onClick={handleArchive}
                disabled={isPending}
                loading={isPending}
              >
                <LuArchive />В архив
              </Button>
            </>
          )}
          {isArchived && (
            <Button
              variant="outline"
              size="md"
              colorPalette="green"
              onClick={handleRestore}
              disabled={isPending}
              loading={isPending}
            >
              <LuRotateCcw />
              Восстановить
            </Button>
          )}
        </Stack>
      </Card.Footer>
    </Card.Root>
  )
}
