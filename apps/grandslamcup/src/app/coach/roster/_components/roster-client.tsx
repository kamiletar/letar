'use client'

/**
 * Состав команды — клиентский компонент с управлением
 * Редактирование профиля, привязка User, фото, удаление.
 */

import { EntityPhotoUploader } from '@/app/_components/entity-photo-uploader'
import { IsPlayingToggle } from '@/app/_components/roster/is-playing-toggle'
import { toaster } from '@/app/_components/ui/toaster'
import { removePlayerAction, toggleIsPlayingAction } from '@/app/coach/_actions/roster.action'
import {
  Badge,
  Box,
  Button,
  Circle,
  Dialog,
  Flex,
  Heading,
  HStack,
  Portal,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuPencil, LuPlus, LuTrash2, LuUserRound } from 'react-icons/lu'

import { EditPlayerCoachDialog } from './edit-player-coach-dialog'

interface RosterPlayer {
  id: string
  playerId: string
  playerName: string
  playerSlug: string
  playerPhoto?: string | null
  hasUser: boolean
  bio?: string | null
  telegramLink?: string | null
  vkLink?: string | null
  role: string
  isPlaying: boolean
  joinedAt: string | null
  isCoach: boolean
}

interface RosterClientProps {
  roster: RosterPlayer[]
  pendingCount: number
  /** Slug города команды для формирования ссылок на профили игроков */
  citySlug?: string
}

import { getRoleColor, getRoleLabel } from '@/lib/player-role-labels'

export function RosterClient({ roster, pendingCount, citySlug }: RosterClientProps) {
  const router = useRouter()
  const [removeTarget, setRemoveTarget] = useState<RosterPlayer | null>(null)
  const [removing, setRemoving] = useState(false)
  const [editTarget, setEditTarget] = useState<RosterPlayer | null>(null)

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      const result = await removePlayerAction({ playerTeamSeasonId: removeTarget.id })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: `${removeTarget.playerName} убран из состава` })
        router.refresh()
      }
    } finally {
      setRemoving(false)
      setRemoveTarget(null)
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <HStack gap={3}>
          <Heading size="lg">Состав команды ({roster.length})</Heading>
          {pendingCount > 0 && (
            <Badge colorPalette="yellow" size="sm">
              {pendingCount} на модерации
            </Badge>
          )}
        </HStack>
        <Link href="/coach/roster/add">
          <Button colorPalette="teal" size="sm">
            <LuPlus size={16} />
            Добавить игрока
          </Button>
        </Link>
      </Flex>

      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
        <Box overflowX="auto">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader w="56px">Фото</Table.ColumnHeader>
                <Table.ColumnHeader>Имя</Table.ColumnHeader>
                <Table.ColumnHeader>Роль</Table.ColumnHeader>
                <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Статус</Table.ColumnHeader>
                <Table.ColumnHeader w="100px" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {roster.map((pts) => (
                <Table.Row key={pts.id}>
                  <Table.Cell>
                    <EntityPhotoUploader
                      entityType="player"
                      entityId={pts.playerId}
                      currentPhoto={pts.playerPhoto}
                      size={36}
                      placeholder={
                        <Circle size={9} bg="brand.subtle" color="brand.solid">
                          <LuUserRound size={16} />
                        </Circle>
                      }
                    />
                  </Table.Cell>
                  <Table.Cell fontWeight="medium">
                    <Link href={citySlug ? `/${citySlug}/players/${pts.playerSlug}` : `/players/${pts.playerSlug}`}>
                      <Text _hover={{ color: 'brand.solid' }}>{pts.playerName}</Text>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <VStack gap={1} align="flex-start">
                      <Badge colorPalette={getRoleColor(pts.role)} size="sm">
                        {getRoleLabel(pts.role, pts.isPlaying)}
                      </Badge>
                      {(pts.role === 'COACH' || pts.role === 'ASSISTANT_COACH') && (
                        <IsPlayingToggle
                          ptsId={pts.id}
                          isPlaying={pts.isPlaying}
                          toggleAction={toggleIsPlayingAction}
                        />
                      )}
                    </VStack>
                  </Table.Cell>
                  <Table.Cell display={{ base: 'none', md: 'table-cell' }}>
                    {pts.hasUser ? (
                      <Badge colorPalette="green" size="sm" variant="subtle">
                        Привязан
                      </Badge>
                    ) : (
                      <Badge colorPalette="gray" size="sm" variant="outline">
                        Без аккаунта
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <HStack gap={1}>
                      {/* Редактирование профиля */}
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="blue"
                        minW="44px"
                        minH="44px"
                        onClick={() => setEditTarget(pts)}
                        title="Редактировать профиль"
                      >
                        <LuPencil size={14} />
                      </Button>
                      {/* Удаление */}
                      {!pts.isCoach && (
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          minW="44px"
                          minH="44px"
                          onClick={() => setRemoveTarget(pts)}
                          title="Убрать из состава"
                        >
                          <LuTrash2 size={14} />
                        </Button>
                      )}
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      {/* Диалог удаления */}
      <Dialog.Root open={!!removeTarget} onOpenChange={(e) => !e.open && setRemoveTarget(null)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Убрать игрока?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text color="fg.muted">{removeTarget?.playerName} будет убран из активного состава команды.</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={3}>
                  <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={removing}>
                    Отмена
                  </Button>
                  <Button colorPalette="red" onClick={handleRemove} loading={removing}>
                    Убрать
                  </Button>
                </Flex>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Диалог редактирования */}
      {editTarget && <EditPlayerCoachDialog player={editTarget} onClose={() => setEditTarget(null)} />}
    </VStack>
  )
}
