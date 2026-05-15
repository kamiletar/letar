'use client'

/**
 * Контейнер сплитскрин-панели
 *
 * Отображает контекстную панель справа от чата на desktop (lg+).
 * Панель выбирается автоматически на основе типа чата.
 */

import { Box, Heading, HStack, IconButton, Tabs } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import { Suspense, useMemo, useState } from 'react'
import { LuBookOpen, LuCalendar, LuChevronLeft, LuChevronRight, LuUser, LuUsers } from 'react-icons/lu'
import { useActiveChatSafe } from '../../_context/active-chat-context'
import { PanelSkeleton } from './panel-skeleton'
import { getPanelTypeForChat, type SplitPanelTab, type SplitPanelType } from './types'

import type { UserRole } from '@letar/driving-school-db/prisma'

// Динамический импорт панелей для code splitting
const ProfilePanel = dynamic(() => import('../../_split-panels/profile-panel').then((m) => m.ProfilePanel), {
  ssr: false,
  loading: () => <PanelSkeleton variant="profile" />,
})

const LessonsPanel = dynamic(() => import('../../_split-panels/lessons-panel').then((m) => m.LessonsPanel), {
  ssr: false,
  loading: () => <PanelSkeleton variant="lessons" />,
})

const SchedulePanel = dynamic(() => import('../../_split-panels/schedule-panel').then((m) => m.SchedulePanel), {
  ssr: false,
  loading: () => <PanelSkeleton variant="schedule" />,
})

const StudentsPanel = dynamic(() => import('../../_split-panels/students-panel').then((m) => m.StudentsPanel), {
  ssr: false,
  loading: () => <PanelSkeleton variant="students" />,
})

interface SplitPanelContainerProps {
  /** Роли текущего пользователя */
  userRoles: UserRole[]
  /** ID текущего пользователя */
  currentUserId: string
  /** Имеет ли пользователь профиль инструктора */
  hasInstructorProfile: boolean
}

export function SplitPanelContainer({ userRoles, currentUserId, hasInstructorProfile }: SplitPanelContainerProps) {
  const activeChatContext = useActiveChatSafe()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Определяем тип панели на основе типа чата
  const panelType = useMemo<SplitPanelType>(() => {
    if (!activeChatContext?.activeChat) {
      return 'none'
    }

    return getPanelTypeForChat(activeChatContext.activeChat.chatType, userRoles, hasInstructorProfile)
  }, [activeChatContext?.activeChat, userRoles, hasInstructorProfile])

  // Доступные табы для текущего типа чата
  const availableTabs = useMemo<SplitPanelTab[]>(() => {
    const tabs: SplitPanelTab[] = []

    if (!activeChatContext?.activeChat) {
      return tabs
    }

    const chatType = activeChatContext.activeChat.chatType

    // Для PRIVATE чатов — профиль и уроки
    if (chatType === 'PRIVATE') {
      if (hasInstructorProfile) {
        tabs.push({ id: 'profile', label: 'Профиль', icon: <LuUser /> })
      }
      tabs.push({ id: 'lessons', label: 'Уроки', icon: <LuBookOpen /> })
    }

    // Для INSTRUCTOR_STUDENTS — студенты и уроки
    if (chatType === 'INSTRUCTOR_STUDENTS') {
      if (hasInstructorProfile) {
        tabs.push({ id: 'students', label: 'Ученики', icon: <LuUsers /> })
      }
      tabs.push({ id: 'lessons', label: 'Уроки', icon: <LuBookOpen /> })
    }

    // Для STUDY_GROUP и SCHOOL — расписание
    if (chatType === 'STUDY_GROUP' || chatType === 'SCHOOL') {
      tabs.push({ id: 'schedule', label: 'Расписание', icon: <LuCalendar /> })
    }

    return tabs
  }, [activeChatContext?.activeChat, hasInstructorProfile])

  const [activeTab, setActiveTab] = useState<SplitPanelType>(panelType)

  // Если нет активного чата или панель не нужна — не рендерим
  if (!activeChatContext?.activeChat || panelType === 'none' || availableTabs.length === 0) {
    return null
  }

  // Если панель свёрнута — показываем только кнопку разворачивания
  if (isCollapsed) {
    return (
      <Box borderLeftWidth={1} h="full" display="flex" alignItems="center" justifyContent="center" px={1}>
        <IconButton aria-label="Развернуть панель" variant="ghost" size="sm" onClick={() => setIsCollapsed(false)}>
          <LuChevronLeft />
        </IconButton>
      </Box>
    )
  }

  const currentTab = availableTabs.find((t) => t.id === activeTab) ? activeTab : availableTabs[0]?.id || 'none'

  return (
    <Box borderLeftWidth={1} h="full" display="flex" flexDirection="column" overflow="hidden">
      {/* Заголовок панели */}
      <HStack p={3} borderBottomWidth={1} justify="space-between">
        <Heading size="sm" color="fg.muted">
          Контекст
        </Heading>
        <IconButton aria-label="Свернуть панель" variant="ghost" size="xs" onClick={() => setIsCollapsed(true)}>
          <LuChevronRight />
        </IconButton>
      </HStack>

      {/* Табы навигации (если больше одного таба) */}
      {availableTabs.length > 1 && (
        <Tabs.Root
          value={currentTab}
          onValueChange={(details) => setActiveTab(details.value as SplitPanelType)}
          size="sm"
        >
          <Tabs.List px={2}>
            {availableTabs.map((tab) => (
              <Tabs.Trigger key={tab.id} value={tab.id}>
                <HStack gap={1}>
                  {tab.icon}
                  <span>{tab.label}</span>
                </HStack>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      )}

      {/* Контент панели */}
      <Box flex={1} overflow="auto">
        <Suspense fallback={<PanelSkeleton variant={currentTab as 'profile' | 'lessons' | 'students' | 'schedule'} />}>
          {currentTab === 'profile' && activeChatContext.activeChat.otherParticipantId && (
            <ProfilePanel userId={activeChatContext.activeChat.otherParticipantId} />
          )}
          {currentTab === 'lessons' && (
            <LessonsPanel userId={currentUserId} otherUserId={activeChatContext.activeChat.otherParticipantId} />
          )}
          {currentTab === 'schedule' && (
            <SchedulePanel
              studyGroupId={activeChatContext.activeChat.studyGroupId}
              organizationId={activeChatContext.activeChat.organizationId}
            />
          )}
          {currentTab === 'students' && activeChatContext.activeChat.instructorId && (
            <StudentsPanel
              instructorId={activeChatContext.activeChat.instructorId}
              organizationId={activeChatContext.activeChat.organizationId}
            />
          )}
        </Suspense>
      </Box>
    </Box>
  )
}

// Реэкспорт типов
export { type SplitPanelTab, type SplitPanelType } from './types'
