import type { TransformationPlan } from '@/generated/prisma'
import { TransformationStage } from '@/generated/prisma'
import { Badge, Box, Button, Table, Text } from '@chakra-ui/react'
import NextLink from 'next/link'

interface ClientPlansTabProps {
  clientId: string
  plans: TransformationPlan[]
}

// Форматирование этапа трансформации
function formatStage(stage: TransformationStage): { label: string; colorPalette: string } {
  switch (stage) {
    case TransformationStage.DIAGNOSTICS:
      return { label: 'Диагностика', colorPalette: 'blue' }
    case TransformationStage.INTEGRATION:
      return { label: 'Интеграция', colorPalette: 'purple' }
    case TransformationStage.STRATEGY:
      return { label: 'Стратегия', colorPalette: 'cyan' }
    case TransformationStage.PRACTICE:
      return { label: 'Практика', colorPalette: 'orange' }
    case TransformationStage.RESULT:
      return { label: 'Результат', colorPalette: 'green' }
    default:
      return { label: stage, colorPalette: 'gray' }
  }
}

// Форматирование даты
function formatDate(date: Date | null): string {
  if (!date) {
    return '—'
  }
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Компонент вкладки "План трансформации" на карточке клиента.
 * Показывает список всех планов трансформации клиента.
 */
export function ClientPlansTab({ clientId, plans }: ClientPlansTabProps) {
  const activePlan = plans.find((p) => p.isActive && !p.isCompleted)

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontSize="lg" fontWeight="medium">
          Планы трансформации
        </Text>
        <Button asChild size="sm" colorPalette="fg">
          <NextLink href={`/plans/new?clientId=${clientId}`}>Создать план</NextLink>
        </Button>
      </Box>

      {/* Активный план */}
      {activePlan && (
        <Box p={4} mb={4} bg="blue.subtle" borderWidth="1px" borderColor="blue.solid" borderRadius="md">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Text fontWeight="semibold">Текущий активный план</Text>
            <Badge colorPalette="blue">Активен</Badge>
          </Box>
          <Box mb={2}>
            <Text fontSize="sm" color="fg.muted" mb={1}>
              Текущий этап:
            </Text>
            <Badge colorPalette={formatStage(activePlan.currentStage).colorPalette}>
              {formatStage(activePlan.currentStage).label}
            </Badge>
          </Box>
          <Box display="flex" gap={4} mb={3}>
            <Text fontSize="sm" color="fg.muted">
              Начало: {formatDate(activePlan.startDate)}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Завершение: {formatDate(activePlan.expectedEndDate)}
            </Text>
          </Box>
          <Button asChild size="sm" variant="outline">
            <NextLink href={`/plans/${activePlan.id}`}>Открыть план</NextLink>
          </Button>
        </Box>
      )}

      {/* Таблица всех планов */}
      {plans.length > 0 ? (
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader>Текущий этап</Table.ColumnHeader>
                <Table.ColumnHeader>Дата начала</Table.ColumnHeader>
                <Table.ColumnHeader>Завершение</Table.ColumnHeader>
                <Table.ColumnHeader>Действия</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {plans.map((plan) => {
                const stageInfo = formatStage(plan.currentStage)
                return (
                  <Table.Row key={plan.id}>
                    <Table.Cell>
                      {plan.isCompleted ? (
                        <Badge colorPalette="green">Завершен</Badge>
                      ) : plan.isActive ? (
                        <Badge colorPalette="blue">Активен</Badge>
                      ) : (
                        <Badge colorPalette="gray">Неактивен</Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={stageInfo.colorPalette}>{stageInfo.label}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{formatDate(plan.startDate)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{formatDate(plan.expectedEndDate)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Button asChild size="sm" variant="outline">
                        <NextLink href={`/plans/${plan.id}`}>Открыть</NextLink>
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        </Box>
      ) : (
        <Box textAlign="center" py={8} bg="bg.subtle" borderWidth="1px" borderRadius="md">
          <Text color="fg.muted" mb={4}>
            У клиента пока нет планов трансформации
          </Text>
          <Button asChild colorPalette="fg">
            <NextLink href={`/plans/new?clientId=${clientId}`}>Создать первый план</NextLink>
          </Button>
        </Box>
      )}
    </Box>
  )
}
