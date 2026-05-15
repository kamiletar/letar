'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Avatar, Box, Button, Checkbox, HStack, Stack, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuCheck, LuUser } from 'react-icons/lu'

import type { AttendanceMember } from '../../../_actions/theory-lesson.action'
import { useBulkAttendance } from '../../../_hooks/use-bulk-attendance'

interface AttendanceFormProps {
  lessonId: string
  initialAttendance: AttendanceMember[]
}

export function AttendanceForm({ lessonId, initialAttendance }: AttendanceFormProps) {
  const mutation = useBulkAttendance()
  const [attendance, setAttendance] = useState<Record<string, boolean>>(
    Object.fromEntries(initialAttendance.map((a) => [a.memberId, a.isPresent]))
  )

  const handleToggle = (memberId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }))
  }

  const handleSelectAll = () => {
    const allSelected = initialAttendance.every((a) => attendance[a.memberId])
    const newValue = !allSelected

    setAttendance(Object.fromEntries(initialAttendance.map((a) => [a.memberId, newValue])))
  }

  const handleSave = () => {
    const attendanceList = Object.entries(attendance).map(([memberId, isPresent]) => ({
      memberId,
      isPresent,
    }))

    mutation.mutate(
      { lessonId, attendance: attendanceList },
      {
        onSuccess: (result) => {
          if (result.success) {
            toaster.success({ title: 'Посещаемость сохранена' })
          } else {
            toaster.error({ title: 'Ошибка', description: result.error })
          }
        },
        onError: () => {
          toaster.error({ title: 'Ошибка', description: 'Не удалось сохранить' })
        },
      }
    )
  }

  const presentCount = Object.values(attendance).filter(Boolean).length
  const totalCount = initialAttendance.length
  const allSelected = presentCount === totalCount

  return (
    <VStack align="stretch" gap={4}>
      {/* Статистика и кнопки */}
      <HStack justify="space-between" wrap="wrap" gap={2}>
        <Text color="fg.muted">
          Присутствуют: {presentCount} из {totalCount}
        </Text>
        <HStack gap={2}>
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {allSelected ? 'Снять все отметки' : 'Отметить всех'}
          </Button>
        </HStack>
      </HStack>

      {/* Список учеников */}
      <Stack gap={2}>
        {initialAttendance.map((member) => (
          <Box
            key={member.memberId}
            p={4}
            borderRadius="md"
            borderWidth="1px"
            bg={attendance[member.memberId] ? 'green.50' : 'bg.panel'}
            _dark={{
              bg: attendance[member.memberId] ? 'green.900/20' : 'bg.panel',
            }}
            cursor="pointer"
            onClick={() => handleToggle(member.memberId)}
            _hover={{ borderColor: 'fg.muted' }}
            transition="all 0.2s"
          >
            <HStack justify="space-between">
              <HStack gap={3}>
                <Avatar.Root size="sm">
                  <Avatar.Fallback>
                    <LuUser />
                  </Avatar.Fallback>
                  {member.userImage && <Avatar.Image src={member.userImage} />}
                </Avatar.Root>
                <VStack align="start" gap={0}>
                  <Text fontWeight="medium">{member.userName}</Text>
                  {member.userEmail && (
                    <Text fontSize="sm" color="fg.muted">
                      {member.userEmail}
                    </Text>
                  )}
                </VStack>
              </HStack>

              <Checkbox.Root
                checked={attendance[member.memberId]}
                onCheckedChange={() => handleToggle(member.memberId)}
                colorPalette="green"
                size="lg"
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control>
                  <Checkbox.Indicator>
                    <LuCheck />
                  </Checkbox.Indicator>
                </Checkbox.Control>
              </Checkbox.Root>
            </HStack>
          </Box>
        ))}
      </Stack>

      {/* Кнопка сохранения */}
      <Button colorPalette="brand" size="lg" onClick={handleSave} loading={mutation.isPending}>
        Сохранить посещаемость
      </Button>
    </VStack>
  )
}
