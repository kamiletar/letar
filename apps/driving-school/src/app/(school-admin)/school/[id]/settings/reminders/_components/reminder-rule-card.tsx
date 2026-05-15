'use client'

/**
 * Карточка правила напоминания (Фаза 18)
 *
 * Отображает настройки правила с возможностью редактирования:
 * - Переключатель вкл/выкл
 * - Дни триггера
 * - Каналы доставки
 * - Получатели
 */

import { Badge, Box, Card, HStack, Icon, Switch, Text, VStack } from '@chakra-ui/react'
import type { ReminderType } from '@letar/driving-school-db/prisma'
import { useState, useTransition } from 'react'
import {
  LuBell,
  LuCalendar,
  LuCheck,
  LuClock,
  LuCreditCard,
  LuFileWarning,
  LuMail,
  LuMessageSquare,
  LuSettings,
  LuUserX,
} from 'react-icons/lu'
import type { ReminderRuleSummary } from '../_actions/reminder-rules.action'
import { toggleReminderRuleAction } from '../_actions/reminder-rules.action'
import { REMINDER_TYPE_METADATA, type ReminderTypeValue } from '../_schemas/reminder-rules.schema'

// Иконки для типов напоминаний
const TYPE_ICONS: Record<ReminderTypeValue, React.ElementType> = {
  DOCUMENT_EXPIRING: LuFileWarning,
  PAYMENT_OVERDUE: LuCreditCard,
  INACTIVE_STUDENT: LuUserX,
  EXAM_UPCOMING: LuCheck,
  LESSON_TOMORROW: LuCalendar,
  DOCUMENTS_PENDING_LONG: LuClock,
}

interface ReminderRuleCardProps {
  type: ReminderType
  rule?: ReminderRuleSummary
  organizationId: string
  onEdit?: () => void
}

export function ReminderRuleCard({ type, rule, organizationId: _organizationId, onEdit }: ReminderRuleCardProps) {
  const metadata = REMINDER_TYPE_METADATA[type as ReminderTypeValue]
  const IconComponent = TYPE_ICONS[type as ReminderTypeValue] || LuBell
  const [isEnabled, setIsEnabled] = useState(rule?.enabled ?? false)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (details: { checked: boolean }) => {
    if (!rule) {
      return
    }

    const newValue = details.checked
    setIsEnabled(newValue)

    startTransition(async () => {
      const result = await toggleReminderRuleAction({
        ruleId: rule.id,
        enabled: newValue,
      })

      if (!result.success) {
        // Откатываем при ошибке
        setIsEnabled(!newValue)
      }
    })
  }

  return (
    <Card.Root
      size="sm"
      variant={isEnabled ? 'elevated' : 'outline'}
      opacity={isEnabled ? 1 : 0.7}
      borderColor={isEnabled ? 'green.500' : undefined}
      borderWidth={isEnabled ? '2px' : undefined}
    >
      <Card.Body p={4}>
        <HStack justify="space-between" mb={3}>
          <HStack gap={3}>
            <Box
              p={2}
              borderRadius="lg"
              bg={isEnabled ? 'green.100' : 'gray.100'}
              color={isEnabled ? 'green.600' : 'gray.500'}
            >
              <Icon boxSize={5}>
                <IconComponent />
              </Icon>
            </Box>
            <VStack align="start" gap={0}>
              <Text fontWeight="semibold" fontSize="sm">
                {metadata.title}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {metadata.description}
              </Text>
            </VStack>
          </HStack>

          <Switch.Root checked={isEnabled} onCheckedChange={handleToggle} disabled={!rule || isPending} size="lg">
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </HStack>

        {rule && (
          <>
            {/* Дни триггера */}
            <Box mb={3}>
              <Text fontSize="xs" color="fg.muted" mb={1}>
                За сколько дней напоминать
              </Text>
              <HStack gap={1} flexWrap="wrap">
                {rule.triggerDays.map((days) => (
                  <Badge key={days} size="sm" variant="subtle" colorPalette="blue">
                    {days} дн.
                  </Badge>
                ))}
              </HStack>
            </Box>

            {/* Каналы доставки */}
            <Box mb={3}>
              <Text fontSize="xs" color="fg.muted" mb={1}>
                Каналы доставки
              </Text>
              <HStack gap={2}>
                <HStack gap={1} opacity={rule.pushEnabled ? 1 : 0.3}>
                  <Icon boxSize={4}>
                    <LuBell />
                  </Icon>
                  <Text fontSize="xs">Push</Text>
                </HStack>
                <HStack gap={1} opacity={rule.emailEnabled ? 1 : 0.3}>
                  <Icon boxSize={4}>
                    <LuMail />
                  </Icon>
                  <Text fontSize="xs">Email</Text>
                </HStack>
                <HStack gap={1} opacity={rule.telegramEnabled ? 1 : 0.3}>
                  <Icon boxSize={4}>
                    <LuMessageSquare />
                  </Icon>
                  <Text fontSize="xs">Telegram</Text>
                </HStack>
              </HStack>
            </Box>

            {/* Получатели */}
            <Box>
              <Text fontSize="xs" color="fg.muted" mb={1}>
                Получатели
              </Text>
              <HStack gap={2}>
                {rule.sendToStudent && (
                  <Badge size="sm" variant="outline" colorPalette="purple">
                    Ученик
                  </Badge>
                )}
                {rule.sendToManager && (
                  <Badge size="sm" variant="outline" colorPalette="orange">
                    Менеджер
                  </Badge>
                )}
              </HStack>
            </Box>
          </>
        )}

        {!rule && (
          <Box p={3} bg="gray.50" borderRadius="md" textAlign="center">
            <Text fontSize="sm" color="fg.muted">
              Правило не настроено
            </Text>
          </Box>
        )}

        {/* Кнопка настройки */}
        {onEdit && (
          <HStack justify="end" mt={3}>
            <Box
              as="button"
              onClick={onEdit}
              display="flex"
              alignItems="center"
              gap={1}
              fontSize="sm"
              color="blue.500"
              cursor="pointer"
              _hover={{ textDecoration: 'underline' }}
            >
              <Icon boxSize={4}>
                <LuSettings />
              </Icon>
              Настроить
            </Box>
          </HStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}
