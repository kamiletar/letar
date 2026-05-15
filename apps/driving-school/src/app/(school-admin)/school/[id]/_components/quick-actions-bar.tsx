'use client'

/**
 * Панель быстрых действий для Manager Dashboard
 *
 * Позволяет менеджеру быстро:
 * - Добавить нового ученика
 * - Создать групповое занятие
 * - Записать на экзамен
 * - Отправить уведомление
 *
 * @module quick-actions-bar
 */

import { Button, Card, HStack, Icon, Text, VStack, Wrap } from '@chakra-ui/react'
import Link from 'next/link'
import { LuBell, LuCalendarPlus, LuClipboardList, LuGraduationCap, LuUserPlus, LuUsers } from 'react-icons/lu'

// === Типы ===

interface QuickActionsBarProps {
  schoolId: string
}

interface QuickActionProps {
  icon: React.ReactNode
  label: string
  href: string
  colorPalette?: string
}

// === Компонент действия ===

function QuickAction({ icon, label, href, colorPalette = 'gray' }: QuickActionProps) {
  return (
    <Button asChild variant="outline" size="sm" colorPalette={colorPalette}>
      <Link href={href}>
        <Icon boxSize={4}>{icon}</Icon>
        <Text>{label}</Text>
      </Link>
    </Button>
  )
}

// === Основной компонент ===

export function QuickActionsBar({ schoolId }: QuickActionsBarProps) {
  const actions: QuickActionProps[] = [
    {
      icon: <LuUserPlus />,
      label: 'Добавить ученика',
      href: `/school/students/new?schoolId=${schoolId}`,
      colorPalette: 'green',
    },
    {
      icon: <LuCalendarPlus />,
      label: 'Теоретическое занятие',
      href: `/school/theory-lessons/new?schoolId=${schoolId}`,
      colorPalette: 'blue',
    },
    {
      icon: <LuGraduationCap />,
      label: 'Записать на экзамен',
      href: `/school/progress/${schoolId}?action=schedule-exam`,
      colorPalette: 'purple',
    },
    {
      icon: <LuUsers />,
      label: 'Учебные группы',
      href: `/school/study-groups/${schoolId}`,
      colorPalette: 'orange',
    },
    {
      icon: <LuClipboardList />,
      label: 'Прогресс учеников',
      href: `/school/progress/${schoolId}`,
    },
    {
      icon: <LuBell />,
      label: 'Уведомления',
      href: `/school/${schoolId}/settings?tab=notifications`,
    },
  ]

  return (
    <Card.Root>
      <Card.Body p={4}>
        <VStack gap={3} align="stretch">
          <Text fontSize="sm" fontWeight="semibold" color="fg.muted">
            Быстрые действия
          </Text>

          <Wrap gap={2}>
            {actions.map((action) => (
              <QuickAction key={action.href} {...action} />
            ))}
          </Wrap>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

// === Компактная версия для мобильных ===

export function QuickActionsCompact({ schoolId }: QuickActionsBarProps) {
  const mainActions: QuickActionProps[] = [
    {
      icon: <LuUserPlus />,
      label: 'Ученик',
      href: `/school/students/new?schoolId=${schoolId}`,
      colorPalette: 'green',
    },
    {
      icon: <LuCalendarPlus />,
      label: 'Занятие',
      href: `/school/theory-lessons/new?schoolId=${schoolId}`,
      colorPalette: 'blue',
    },
    {
      icon: <LuGraduationCap />,
      label: 'Экзамен',
      href: `/school/progress/${schoolId}?action=schedule-exam`,
      colorPalette: 'purple',
    },
  ]

  return (
    <HStack gap={2} justify="center">
      {mainActions.map((action) => (
        <Button asChild key={action.href} variant="solid" size="sm" colorPalette={action.colorPalette} flex={1}>
          <Link href={action.href}>
            <Icon boxSize={4}>{action.icon}</Icon>
            <Text>{action.label}</Text>
          </Link>
        </Button>
      ))}
    </HStack>
  )
}
