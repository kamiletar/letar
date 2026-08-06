'use client'

/**
 * Клиентский компонент управления составом — админка.
 * Inline смена роли, добавление/удаление, редактирование профиля, привязка User.
 */

import { EntityPhotoUploader } from '@/app/_components/entity-photo-uploader'
import { IsPlayingToggle } from '@/app/_components/roster/is-playing-toggle'
import { RemovePlayerDialog } from '@/app/_components/roster/remove-player-dialog'
import { toaster } from '@/app/_components/ui/toaster'
import {
  adminToggleIsPlayingAction,
  changePlayerRoleAction,
  removeFromRosterAction,
} from '@/app/admin/teams/_actions/roster-admin.action'
import { Badge, Box, Button, Circle, Flex, Heading, HStack, NativeSelect, Table, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuPencil, LuPlus, LuTrash2, LuUserRound } from 'react-icons/lu'

import { AddPlayerDialog } from './add-player-dialog'
import { EditPlayerAdminDialog } from './edit-player-admin-dialog'

interface RosterPlayer {
  id: string
  playerId: string
  name: string
  slug: string
  photo: string | null
  bio: string | null
  socialLinks: Array<{ platform: string; url: string }>
  badges: string[]
  hasUser: boolean
  role: string
  isPlaying: boolean
  joinedAt: string | null
}

interface SeasonData {
  teamSeasonId: string
  seasonName: string
  seasonStatus: string
  leagueName: string
  roster: RosterPlayer[]
}

interface Props {
  teamId: string
  teamName: string
  teamCityId: string
  seasons: SeasonData[]
  cities: Array<{ id: string; name: string }>
}

const ROLES = [
  { value: 'PLAYER', label: 'Игрок' },
  { value: 'COACH', label: 'Тренер' },
  { value: 'ASSISTANT_COACH', label: 'Зам. тренера' },
]

export function RosterAdminClient({ teamId: _teamId, teamName: _teamName, teamCityId, seasons, cities }: Props) {
  const router = useRouter()
  // По умолчанию — активный сезон или первый
  const defaultIdx = seasons.findIndex((s) => s.seasonStatus === 'ACTIVE')
  const [seasonIdx, setSeasonIdx] = useState(defaultIdx >= 0 ? defaultIdx : 0)
  const season = seasons[seasonIdx]

  const [editTarget, setEditTarget] = useState<RosterPlayer | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<RosterPlayer | null>(null)
  const [removing, setRemoving] = useState(false)

  /** Смена роли inline */
  async function handleRoleChange(playerTeamSeasonId: string, newRole: string) {
    const result = await changePlayerRoleAction({ playerTeamSeasonId, role: newRole })
    if ('error' in result) {
      toaster.error({ title: String(result.error) })
    } else {
      toaster.success({ title: 'Роль изменена' })
      router.refresh()
    }
  }

  /** Удалить из состава */
  async function handleRemove() {
    if (!removeTarget) {
      return
    }
    setRemoving(true)
    try {
      const result = await removeFromRosterAction({ playerTeamSeasonId: removeTarget.id })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: `${removeTarget.name} убран` })
        router.refresh()
      }
    } finally {
      setRemoving(false)
      setRemoveTarget(null)
    }
  }

  if (!season) {
    return <Text color="fg.muted">Команда не участвует ни в одном сезоне</Text>
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Выбор сезона */}
      {seasons.length > 1 && (
        <HStack gap={2} flexWrap="wrap">
          {seasons.map((s, i) => (
            <Button
              key={s.teamSeasonId}
              size="sm"
              variant={i === seasonIdx ? 'solid' : 'outline'}
              colorPalette={s.seasonStatus === 'ACTIVE' ? 'green' : 'gray'}
              onClick={() => setSeasonIdx(i)}
            >
              {s.seasonName} — {s.leagueName}
            </Button>
          ))}
        </HStack>
      )}

      {/* Заголовок + кнопка добавить */}
      <Flex justify="space-between" align="center">
        <HStack gap={2}>
          <Heading size="md">{season.seasonName}</Heading>
          <Badge colorPalette="blue" size="sm">
            {season.leagueName}
          </Badge>
          <Badge colorPalette={season.seasonStatus === 'ACTIVE' ? 'green' : 'gray'} size="sm">
            {season.roster.length} чел.
          </Badge>
        </HStack>
        <Button size="sm" colorPalette="teal" onClick={() => setAddOpen(true)}>
          <LuPlus size={16} />
          Добавить
        </Button>
      </Flex>

      {/* Таблица */}
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border" overflow="hidden">
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader w="48px" />
                <Table.ColumnHeader>Имя</Table.ColumnHeader>
                <Table.ColumnHeader minW="140px">Роль</Table.ColumnHeader>
                <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Статус</Table.ColumnHeader>
                <Table.ColumnHeader w={{ base: 'auto', md: '80px' }} />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {season.roster.map((p) => (
                <Table.Row key={p.id}>
                  <Table.Cell>
                    <EntityPhotoUploader
                      entityType="player"
                      entityId={p.playerId}
                      currentPhoto={p.photo}
                      size={32}
                      placeholder={
                        <Circle size={8} bg="brand.subtle" color="brand.solid">
                          <LuUserRound size={14} />
                        </Circle>
                      }
                    />
                  </Table.Cell>
                  <Table.Cell fontWeight="medium">{p.name}</Table.Cell>
                  <Table.Cell>
                    <VStack gap={1} align="flex-start">
                      <NativeSelect.Root size="xs" w={{ base: '120px', md: '160px' }}>
                        <NativeSelect.Field value={p.role} onChange={(e) => handleRoleChange(p.id, e.target.value)}>
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                      {(p.role === 'COACH' || p.role === 'ASSISTANT_COACH') && (
                        <IsPlayingToggle
                          ptsId={p.id}
                          isPlaying={p.isPlaying}
                          toggleAction={adminToggleIsPlayingAction}
                        />
                      )}
                    </VStack>
                  </Table.Cell>
                  <Table.Cell display={{ base: 'none', md: 'table-cell' }}>
                    {p.hasUser
                      ? (
                        <Badge colorPalette="green" size="sm">
                          Привязан
                        </Badge>
                      )
                      : (
                        <Badge colorPalette="gray" size="sm" variant="outline">
                          —
                        </Badge>
                      )}
                  </Table.Cell>
                  <Table.Cell>
                    <HStack gap={1}>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="blue"
                        minW="44px"
                        minH="44px"
                        onClick={() => setEditTarget(p)}
                        title="Редактировать"
                      >
                        <LuPencil size={14} />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        minW="44px"
                        minH="44px"
                        onClick={() => setRemoveTarget(p)}
                        title="Убрать"
                      >
                        <LuTrash2 size={14} />
                      </Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      {/* Диалог удаления */}
      <RemovePlayerDialog
        playerName={removeTarget?.name ?? ''}
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        loading={removing}
      />

      {/* Диалог редактирования */}
      {editTarget && <EditPlayerAdminDialog player={editTarget} onClose={() => setEditTarget(null)} />}

      {/* Диалог добавления */}
      {addOpen && (
        <AddPlayerDialog
          teamSeasonId={season.teamSeasonId}
          cities={cities}
          defaultCityId={teamCityId}
          onClose={() => setAddOpen(false)}
        />
      )}
    </VStack>
  )
}
