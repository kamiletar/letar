'use client'

import { Button, Dialog, HStack, Icon, Portal, Text } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useTransition } from 'react'
import { LuBan, LuCircleCheck, LuX } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { toggleUserBlockAction } from '../_actions/user.action'

interface Props {
  userId: string
  userName: string
  isBlocked: boolean
}

export function ToggleUserBlockButton({ userId, userName, isBlocked }: Props) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const result = await toggleUserBlockAction({ userId })

      if (result.success) {
        setIsOpen(false)
        toaster.success({
          title: isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован',
          description: isBlocked
            ? `Пользователь ${userName} был разблокирован`
            : `Пользователь ${userName} был заблокирован`,
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
      <Button
        size="xs"
        variant="outline"
        colorPalette={isBlocked ? 'green' : 'red'}
        onClick={() => setIsOpen(true)}
        title={isBlocked ? 'Разблокировать' : 'Заблокировать'}
      >
        <Icon as={isBlocked ? LuCircleCheck : LuBan} />
      </Button>

      <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && setIsOpen(false)} size={{ base: 'full', md: 'sm' }}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>
                  {isBlocked ? 'Разблокировать пользователя?' : 'Заблокировать пользователя?'}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.CloseTrigger />

              <Dialog.Body>
                <Text>
                  {isBlocked ? (
                    <>
                      Пользователь <strong>{userName}</strong> будет разблокирован и сможет снова войти в систему.
                    </>
                  ) : (
                    <>
                      Пользователь <strong>{userName}</strong> будет заблокирован и не сможет войти в систему. Его
                      занятия и данные сохранятся.
                    </>
                  )}
                </Text>

                {/* Ошибки */}
                {error && (
                  <Text color="fg.error" fontSize="sm" mt={4}>
                    {error}
                  </Text>
                )}
              </Dialog.Body>

              <Dialog.Footer>
                <HStack gap={2}>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                    <Icon as={LuX} />
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    colorPalette={isBlocked ? 'green' : 'red'}
                    disabled={isPending}
                    loading={isPending}
                    onClick={handleSubmit}
                  >
                    <Icon as={isBlocked ? LuCircleCheck : LuBan} />
                    {isBlocked ? 'Разблокировать' : 'Заблокировать'}
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
