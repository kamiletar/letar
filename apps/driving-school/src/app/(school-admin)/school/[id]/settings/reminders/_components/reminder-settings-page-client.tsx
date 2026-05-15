'use client'

/**
 * Клиентский компонент страницы настроек напоминаний (Фаза 18)
 */

import { Box, Button, Dialog, Heading, HStack, SimpleGrid, Tabs, Text, VStack } from '@chakra-ui/react'
import type { ReminderType } from '@letar/driving-school-db/prisma'
import { useState } from 'react'
import { LuBell, LuHistory } from 'react-icons/lu'
import type { ReminderRuleSummary } from '../_actions/reminder-rules.action'
import { REMINDER_TYPE_METADATA, type ReminderTypeValue } from '../_schemas/reminder-rules.schema'
import { ReminderRuleCard } from './reminder-rule-card'
import { ReminderRuleForm } from './reminder-rule-form'

interface ReminderSettingsPageClientProps {
  organizationId: string
  rules: ReminderRuleSummary[]
}

// Все типы напоминаний
const ALL_REMINDER_TYPES: ReminderTypeValue[] = [
  'DOCUMENT_EXPIRING',
  'PAYMENT_OVERDUE',
  'INACTIVE_STUDENT',
  'EXAM_UPCOMING',
  'LESSON_TOMORROW',
  'DOCUMENTS_PENDING_LONG',
]

export function ReminderSettingsPageClient({ organizationId, rules }: ReminderSettingsPageClientProps) {
  const [editingType, setEditingType] = useState<ReminderType | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Группируем правила по типу
  const rulesByType = rules.reduce(
    (acc, rule) => {
      acc[rule.type] = rule
      return acc
    },
    {} as Record<ReminderType, ReminderRuleSummary>
  )

  const handleEdit = (type: ReminderType) => {
    setEditingType(type)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingType(null)
  }

  const handleSuccess = () => {
    handleCloseDialog()
    // Страница перезагрузится через revalidatePath
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <HStack justify="space-between">
        <VStack align="start" gap={1}>
          <Heading size="lg">Автоматические напоминания</Heading>
          <Text color="fg.muted">Настройте правила автоматических уведомлений для учеников и сотрудников</Text>
        </VStack>
      </HStack>

      {/* Табы */}
      <Tabs.Root defaultValue="rules">
        <Tabs.List>
          <Tabs.Trigger value="rules">
            <HStack gap={2}>
              <LuBell />
              <span>Правила</span>
            </HStack>
          </Tabs.Trigger>
          <Tabs.Trigger value="history">
            <HStack gap={2}>
              <LuHistory />
              <span>История</span>
            </HStack>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="rules" pt={6}>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {ALL_REMINDER_TYPES.map((type) => (
              <ReminderRuleCard
                key={type}
                type={type}
                rule={rulesByType[type]}
                organizationId={organizationId}
                onEdit={() => handleEdit(type)}
              />
            ))}
          </SimpleGrid>
        </Tabs.Content>

        <Tabs.Content value="history" pt={6}>
          <Box p={8} textAlign="center" borderWidth="1px" borderRadius="lg" borderStyle="dashed">
            <Text color="fg.muted">История отправленных напоминаний будет доступна после настройки правил</Text>
          </Box>
        </Tabs.Content>
      </Tabs.Root>

      {/* Диалог редактирования */}
      <Dialog.Root open={isDialogOpen} onOpenChange={(details) => !details.open && handleCloseDialog()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="lg">
            <Dialog.Header>
              <Dialog.Title>
                {editingType ? REMINDER_TYPE_METADATA[editingType as ReminderTypeValue]?.title : 'Настройка правила'}
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleCloseDialog}>
                  ✕
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              {editingType && (
                <ReminderRuleForm
                  organizationId={organizationId}
                  type={editingType}
                  rule={rulesByType[editingType]}
                  onSuccess={handleSuccess}
                  onCancel={handleCloseDialog}
                />
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  )
}
