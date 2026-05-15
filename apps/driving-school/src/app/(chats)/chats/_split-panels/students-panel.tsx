'use client'

/**
 * Панель студентов для сплитскрин-режима
 *
 * Отображает список учеников инструктора в чате INSTRUCTOR_STUDENTS.
 */

import { Avatar, Badge, Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { use } from 'react'
import { LuCheck, LuMessageCircle, LuPause, LuUsers, LuWallet } from 'react-icons/lu'
import { getPanelStudentsAction, type PanelStudent } from '../_actions/split-panel.action'

interface StudentsPanelProps {
  /** ID инструктора (userId) */
  instructorId: string
  /** ID организации (для фильтрации по школе) */
  organizationId?: string
}

export function StudentsPanel({ instructorId, organizationId }: StudentsPanelProps) {
  // Загружаем студентов через React 19 use()
  const result = use(getPanelStudentsAction({ instructorId, organizationId }))

  if (!result.success) {
    return (
      <VStack p={4} gap={4}>
        <Text color="fg.muted">Не удалось загрузить учеников</Text>
      </VStack>
    )
  }

  const { students } = result

  // Разделяем активных и приостановленных
  const activeStudents = students.filter((s) => s.status === 'ACTIVE')
  const pausedStudents = students.filter((s) => s.status === 'PAUSED')

  return (
    <VStack p={4} gap={3} align="stretch">
      <HStack justify="space-between">
        <HStack gap={2}>
          <Icon color="fg.muted">
            <LuUsers />
          </Icon>
          <Text fontWeight="medium">Ученики</Text>
          <Badge colorPalette="gray" size="sm">
            {students.length}
          </Badge>
        </HStack>
        <Button asChild size="xs" variant="ghost">
          <Link href="/students">Все →</Link>
        </Button>
      </HStack>

      {students.length === 0 ? (
        <Box py={6} textAlign="center">
          <Text color="fg.muted" fontSize="sm">
            У вас пока нет учеников
          </Text>
          <Button asChild size="sm" variant="outline" mt={3}>
            <Link href="/students/invite">Пригласить ученика</Link>
          </Button>
        </Box>
      ) : (
        <VStack gap={3} align="stretch">
          {/* Активные ученики */}
          {activeStudents.length > 0 && (
            <VStack gap={2} align="stretch">
              {activeStudents.map((student) => (
                <StudentCard key={student.userId} student={student} />
              ))}
            </VStack>
          )}

          {/* Приостановленные ученики */}
          {pausedStudents.length > 0 && (
            <Box>
              <HStack gap={1} mb={2}>
                <Icon size="sm" color="fg.muted">
                  <LuPause />
                </Icon>
                <Text fontSize="xs" color="fg.muted">
                  Приостановлены ({pausedStudents.length})
                </Text>
              </HStack>
              <VStack gap={2} align="stretch">
                {pausedStudents.map((student) => (
                  <StudentCard key={student.userId} student={student} isPaused />
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      )}
    </VStack>
  )
}

interface StudentCardProps {
  student: PanelStudent
  isPaused?: boolean
}

function StudentCard({ student, isPaused }: StudentCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      p={2}
      opacity={isPaused ? 0.7 : 1}
      _hover={{ bg: 'bg.subtle' }}
      transition="background 0.2s"
    >
      <HStack gap={3}>
        {/* Аватар */}
        <Avatar.Root size="sm">
          {student.image && <Avatar.Image src={student.image} />}
          <Avatar.Fallback>{student.name.charAt(0)}</Avatar.Fallback>
        </Avatar.Root>

        {/* Инфо */}
        <VStack gap={0} align="start" flex={1}>
          <Text fontSize="sm" fontWeight="medium" truncate maxW="120px">
            {student.name}
          </Text>
          <HStack gap={2}>
            <HStack gap={1}>
              <Icon size="xs" color={student.balance > 0 ? 'success.fg' : 'fg.muted'}>
                <LuWallet />
              </Icon>
              <Text fontSize="xs" color={student.balance > 0 ? 'success.fg' : 'fg.muted'}>
                {student.balance}
              </Text>
            </HStack>
            <HStack gap={1}>
              <Icon size="xs" color="fg.muted">
                <LuCheck />
              </Icon>
              <Text fontSize="xs" color="fg.muted">
                {student.completedLessons}
              </Text>
            </HStack>
          </HStack>
        </VStack>

        {/* Кнопка чата */}
        <Button asChild size="xs" variant="ghost" aria-label="Написать">
          <Link href={`/chats?user=${student.userId}`}>
            <LuMessageCircle size={14} />
          </Link>
        </Button>
      </HStack>
    </Box>
  )
}
