'use client'

import { toaster } from '@/app/_components/ui/toaster'
import {
  Avatar,
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Icon,
  IconButton,
  Menu,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ConnectionStatus } from '@letar/driving-school-db/prisma/enums'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LuCheck, LuClock, LuCreditCard, LuEllipsisVertical, LuPause, LuPlay, LuUserX, LuWallet } from 'react-icons/lu'
import { type StudentWithBalance, updateConnectionStatus } from '../[id]/balance/_actions/balance.action'

interface StudentCardProps {
  student: StudentWithBalance
}

type PendingAction = {
  status: ConnectionStatus
  title: string
  description: string
  confirmText: string
  colorPalette: 'yellow' | 'green' | 'red'
}

export function StudentCard({ student }: StudentCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const statusColors: Record<string, 'green' | 'yellow' | 'gray'> = {
    ACTIVE: 'green',
    PAUSED: 'yellow',
    DISCONNECTED: 'gray',
  }

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Активен',
    PAUSED: 'Приостановлен',
    DISCONNECTED: 'Отключён',
  }

  // Иконки для визуального различия статусов (accessibility)
  const statusIcons: Record<string, React.ReactNode> = {
    ACTIVE: <LuCheck />,
    PAUSED: <LuPause />,
    DISCONNECTED: <LuUserX />,
  }

  const actionConfigs: Record<ConnectionStatus, PendingAction> = {
    PAUSED: {
      status: ConnectionStatus.PAUSED,
      title: 'Приостановить связь',
      description: `Ученик ${student.studentName} не сможет записываться на занятия, пока связь приостановлена. Вы сможете возобновить её в любой момент.`,
      confirmText: 'Приостановить',
      colorPalette: 'yellow',
    },
    ACTIVE: {
      status: ConnectionStatus.ACTIVE,
      title: 'Возобновить связь',
      description: `Ученик ${student.studentName} снова сможет записываться на ваши занятия.`,
      confirmText: 'Возобновить',
      colorPalette: 'green',
    },
    DISCONNECTED: {
      status: ConnectionStatus.DISCONNECTED,
      title: 'Разорвать связь',
      description: `Вы уверены, что хотите разорвать связь с учеником ${student.studentName}? Это действие необратимо. Ученик будет удалён из вашего списка.`,
      confirmText: 'Разорвать',
      colorPalette: 'red',
    },
  }

  const handleStatusChange = () => {
    if (!pendingAction) {
      return
    }

    startTransition(async () => {
      const result = await updateConnectionStatus(student.studentUserId, pendingAction.status)

      if (result.success) {
        const statusMessages: Record<ConnectionStatus, string> = {
          ACTIVE: 'Связь с учеником возобновлена',
          PAUSED: 'Связь с учеником приостановлена',
          DISCONNECTED: 'Связь с учеником разорвана',
        }
        toaster.success({
          title: statusMessages[pendingAction.status],
        })
        router.refresh()
      } else {
        const errorMessages: Record<string, string> = {
          UNAUTHORIZED: 'Необходимо войти в систему',
          NOT_INSTRUCTOR: 'Только для инструкторов',
          STUDENT_NOT_FOUND: 'Ученик не найден',
          NO_CONNECTION: 'Связь не найдена',
          INVALID_STATUS: 'Невозможно изменить статус',
        }
        toaster.error({
          title: errorMessages[result.error] || 'Ошибка',
        })
      }
      setPendingAction(null)
    })
  }

  const isActive = student.status === 'ACTIVE'
  const isPaused = student.status === 'PAUSED'
  const isDisconnected = student.status === 'DISCONNECTED'

  return (
    <>
      <Box bg="bg.panel" p={4} borderRadius="lg" shadow="sm" borderWidth="1px">
        <VStack gap={3} align="stretch">
          <HStack gap={3}>
            <Avatar.Root size="md">
              {student.studentImage && <Avatar.Image src={student.studentImage} />}
              <Avatar.Fallback>{student.studentName.charAt(0)}</Avatar.Fallback>
            </Avatar.Root>
            <Box flex={1}>
              <Text fontWeight="semibold">{student.studentName}</Text>
              <Text fontSize="sm" color="fg.muted">
                {student.studentEmail}
              </Text>
            </Box>
            <Badge colorPalette={statusColors[student.status] || 'gray'} size="sm">
              <Icon size="xs">{statusIcons[student.status]}</Icon>
              {statusLabels[student.status] || student.status}
            </Badge>
          </HStack>

          {/* Бейджи водительских прав */}
          {student.licenses.length > 0 && (
            <HStack gap={2} flexWrap="wrap">
              <Icon size="sm" color="fg.muted">
                <LuCreditCard />
              </Icon>
              {student.licenses.map((license) => (
                <Badge
                  key={license.category}
                  colorPalette={license.isExpired ? 'red' : license.isVerified ? 'green' : 'orange'}
                  variant="subtle"
                  size="sm"
                >
                  {license.category}
                  {license.transmissionRestriction === 'AUTOMATIC' && ' (AT)'}
                  {license.isVerified ? (
                    <Icon size="xs" ml={1}>
                      <LuCheck />
                    </Icon>
                  ) : (
                    <Icon size="xs" ml={1}>
                      <LuClock />
                    </Icon>
                  )}
                </Badge>
              ))}
            </HStack>
          )}

          <HStack gap={3}>
            {/* Меню управления связью */}
            {!isDisconnected && (
              <Menu.Root>
                <Menu.Trigger asChild>
                  <IconButton variant="ghost" size="sm" aria-label="Действия" disabled={isPending}>
                    <LuEllipsisVertical />
                  </IconButton>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content>
                      {isActive && (
                        <Menu.Item value="pause" onClick={() => setPendingAction(actionConfigs.PAUSED)}>
                          <LuPause />
                          <Text>Приостановить</Text>
                        </Menu.Item>
                      )}
                      {isPaused && (
                        <Menu.Item value="resume" onClick={() => setPendingAction(actionConfigs.ACTIVE)}>
                          <LuPlay />
                          <Text>Возобновить</Text>
                        </Menu.Item>
                      )}
                      <Menu.Separator />
                      <Menu.Item
                        value="disconnect"
                        color="fg.error"
                        onClick={() => setPendingAction(actionConfigs.DISCONNECTED)}
                      >
                        <LuUserX />
                        <Text>Разорвать связь</Text>
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>
            )}
          </HStack>

          <HStack justify="space-between" pt={2} borderTopWidth="1px">
            <HStack gap={4}>
              <Box>
                <Text fontSize="xs" color="fg.muted">
                  Баланс
                </Text>
                <Text fontWeight="semibold" color={student.balance > 0 ? 'success.fg' : 'fg.muted'}>
                  {student.balance} занятий
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="fg.muted">
                  Проведено
                </Text>
                <Text fontWeight="semibold">{student.completedLessons}</Text>
              </Box>
              {student.noShowCount > 0 && (
                <Box>
                  <Text fontSize="xs" color="fg.muted">
                    Неявки
                  </Text>
                  <Text fontWeight="semibold" color="error.fg">
                    {student.noShowCount}
                  </Text>
                </Box>
              )}
            </HStack>
            <Button asChild size="sm" variant="outline" disabled={isDisconnected}>
              <Link href={`/students/${student.studentUserId}/balance`}>
                <LuWallet size={14} />
                Баланс
              </Link>
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Диалог подтверждения */}
      <Dialog.Root
        open={!!pendingAction}
        onOpenChange={(e) => !e.open && setPendingAction(null)}
        placement="center"
        motionPreset="scale"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{pendingAction?.title}</Dialog.Title>
              </Dialog.Header>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
              <Dialog.Body>
                <Text>{pendingAction?.description}</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setPendingAction(null)} disabled={isPending}>
                  Отмена
                </Button>
                <Button colorPalette={pendingAction?.colorPalette} onClick={handleStatusChange} loading={isPending}>
                  {pendingAction?.confirmText}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
