'use client'

import { Button, Checkbox, Dialog, HStack, Icon, Portal, Stack, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useTransition } from 'react'
import { LuCheck, LuPencil, LuX } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { updateUserRolesAction } from '../_actions/user.action'

import type { UserRole } from '@letar/driving-school-db/prisma'

interface Props {
  userId: string
  currentRoles: UserRole[]
  userName: string
}

export function UpdateUserRolesButton({ userId, currentRoles, userName }: Props) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(currentRoles)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const allRoles: UserRole[] = ['USER', 'FREELANCE_INSTRUCTOR', 'MODERATOR', 'OWNER']

  const roleLabels: Record<UserRole, string> = {
    USER: 'Пользователь',
    FREELANCE_INSTRUCTOR: 'Инструктор',
    MODERATOR: 'Модератор',
    OWNER: 'Владелец',
  }

  const roleDescriptions: Record<UserRole, string> = {
    USER: 'Базовый пользователь: запись на занятия, просмотр каталога',
    FREELANCE_INSTRUCTOR: 'Независимый инструктор: управление расписанием, ученики',
    MODERATOR: 'Модератор контента: управление отзывами, жалобами',
    OWNER: 'Полный доступ ко всем функциям платформы',
  }

  const handleRoleChange = (role: UserRole, checked: boolean) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, role])
    } else {
      setSelectedRoles(selectedRoles.filter((r) => r !== role))
    }
  }

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateUserRolesAction({
        userId,
        roles: selectedRoles as ('USER' | 'FREELANCE_INSTRUCTOR' | 'MODERATOR' | 'OWNER')[],
      })

      if (result.success) {
        setIsOpen(false)
        toaster.success({
          title: 'Роли обновлены',
          description: `Роли пользователя ${userName} успешно обновлены`,
        })
        // Инвалидируем кэш списка пользователей
        queryClient.invalidateQueries({ queryKey: ['findManyUser'] })
      } else {
        setError(result.error ?? 'Произошла ошибка')
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
      }
    })
  }

  return (
    <>
      <Button size="xs" variant="outline" onClick={() => setIsOpen(true)} title="Изменить роли">
        <Icon as={LuPencil} />
      </Button>

      <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && setIsOpen(false)} size={{ base: 'full', md: 'md' }}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Изменение ролей пользователя</Dialog.Title>
                <Text fontSize="sm" color="fg.muted" mt={1}>
                  {userName}
                </Text>
              </Dialog.Header>
              <Dialog.CloseTrigger />

              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  {/* Чекбоксы для выбора ролей */}
                  {allRoles.map((role) => {
                    const isChecked = selectedRoles.includes(role)

                    return (
                      <Checkbox.Root
                        key={role}
                        checked={isChecked}
                        onCheckedChange={(e) => handleRoleChange(role, !!e.checked)}
                        gap={4}
                        alignItems="flex-start"
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Stack gap={0}>
                          <Checkbox.Label fontWeight="medium">{roleLabels[role]}</Checkbox.Label>
                          <Text fontSize="xs" color="fg.muted">
                            {roleDescriptions[role]}
                          </Text>
                        </Stack>
                      </Checkbox.Root>
                    )
                  })}

                  {/* Ошибки */}
                  {error && (
                    <Text color="fg.error" fontSize="sm">
                      {error}
                    </Text>
                  )}
                </VStack>
              </Dialog.Body>

              <Dialog.Footer>
                <HStack gap={2}>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                    <Icon as={LuX} />
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    colorPalette="brand"
                    disabled={isPending || selectedRoles.length === 0}
                    loading={isPending}
                    onClick={handleSubmit}
                  >
                    <Icon as={LuCheck} />
                    Сохранить
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
