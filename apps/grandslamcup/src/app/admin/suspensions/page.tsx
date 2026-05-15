'use client'

/**
 * Управление дисциплиной — страница админки.
 * Список всех отстранений с возможностью создания и деактивации.
 */

import { EmptyState } from '@/app/_components/empty-state'
import { toaster } from '@/app/_components/ui/toaster'
import { AdminCard, AdminCardRow } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import { formatDateNumeric } from '@/lib/format-date'
import { playerDisplayName } from '@/lib/player-utils'
import { Badge, Box, Button, Flex, Heading, HStack, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { LuShieldAlert, LuX } from 'react-icons/lu'
import { deactivateSuspensionAction, getSuspensionsAction } from './_actions/suspension.action'
import { CreateSuspensionDialog } from './_components/create-suspension-dialog'

/** Метка причины отстранения */
function reasonLabel(reason: string): string {
  switch (reason) {
    case 'RED_CARD':
      return 'Красная карточка'
    case 'YELLOW_ACCUMULATION':
      return 'Накопление жёлтых'
    case 'DOUBLE_YELLOW':
      return 'Две жёлтые'
    case 'PLAGIARISM':
      return 'Чтение чужих стихов'
    default:
      return reason
  }
}

/** Цвет badge по причине */
function reasonColor(reason: string): string {
  switch (reason) {
    case 'PLAGIARISM':
      return 'purple'
    case 'RED_CARD':
    case 'DOUBLE_YELLOW':
      return 'red'
    case 'YELLOW_ACCUMULATION':
      return 'yellow'
    default:
      return 'gray'
  }
}

interface Suspension {
  id: string
  playerId: string
  reason: string
  matchesLeft: number
  untilEndOfSeason: boolean
  active: boolean
  startedAt: string
  player: { id: string; name: string; slug: string; disambiguation: string | null }
  season: { id: string; name: string }
}

export default function AdminSuspensionsPage() {
  const [suspensions, setSuspensions] = useState<Suspension[]>([])
  const [loading, setLoading] = useState(true)
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [deactivating, setDeactivating] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const result = await getSuspensionsAction(showActiveOnly || undefined)
    if ('data' in result) {
      setSuspensions(result.data as unknown as Suspension[])
    }
    setLoading(false)
  }, [showActiveOnly])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeactivate = async (id: string) => {
    setDeactivating(id)
    try {
      const result = await deactivateSuspensionAction({ id })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Отстранение снято' })
        loadData()
      }
    } finally {
      setDeactivating(null)
    }
  }

  const activeCount = suspensions.filter((s) => s.active).length

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <HStack gap={3}>
          <LuShieldAlert size={24} />
          <Heading size="lg">Дисциплина</Heading>
          {activeCount > 0 && (
            <Badge colorPalette="red" size="sm">
              {activeCount} акт.
            </Badge>
          )}
        </HStack>
        <HStack gap={2}>
          <Button
            variant={showActiveOnly ? 'solid' : 'outline'}
            colorPalette={showActiveOnly ? 'brand' : undefined}
            size="sm"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
          >
            {showActiveOnly ? 'Только активные' : 'Все'}
          </Button>
          <CreateSuspensionDialog onCreated={loadData} />
        </HStack>
      </Flex>

      {/* Таблица */}
      {loading ? (
        <Flex justify="center" py={12}>
          <Spinner size="lg" />
        </Flex>
      ) : suspensions.length === 0 ? (
        <EmptyState>
          <Text color="fg.muted">Нет отстранений</Text>
        </EmptyState>
      ) : (
        <AdminResponsiveList
          items={suspensions}
          renderCard={(s) => (
            <AdminCard key={s.id}>
              <Flex justify="space-between" align="start" mb={2}>
                <Box>
                  <Link href={`/admin/players/${s.player.id}`}>
                    <Text fontWeight="semibold" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                      {playerDisplayName(s.player)}
                    </Text>
                  </Link>
                  <Text fontSize="xs" color="fg.muted">
                    {s.season.name}
                  </Text>
                </Box>
                <Flex gap={2} align="center">
                  <Badge colorPalette={s.active ? 'red' : 'gray'} variant="subtle" size="sm">
                    {s.active ? 'Активно' : 'Истёк'}
                  </Badge>
                  {s.active && (
                    <Button
                      size="xs"
                      variant="outline"
                      colorPalette="red"
                      onClick={() => handleDeactivate(s.id)}
                      loading={deactivating === s.id}
                      disabled={deactivating !== null}
                    >
                      <LuX size={12} />
                    </Button>
                  )}
                </Flex>
              </Flex>
              <AdminCardRow label="Причина">
                <Badge colorPalette={reasonColor(s.reason)} variant="subtle" size="sm">
                  {reasonLabel(s.reason)}
                </Badge>
              </AdminCardRow>
              <AdminCardRow label="Длительность">
                <Text fontSize="sm">{s.untilEndOfSeason ? 'До конца сезона' : `${s.matchesLeft} матч.`}</Text>
              </AdminCardRow>
              <AdminCardRow label="Дата">
                <Text fontSize="sm" color="fg.muted">
                  {formatDateNumeric(s.startedAt)}
                </Text>
              </AdminCardRow>
            </AdminCard>
          )}
          tableContent={
            <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
              <Box overflowX="auto">
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Поэт</Table.ColumnHeader>
                      <Table.ColumnHeader>Сезон</Table.ColumnHeader>
                      <Table.ColumnHeader>Причина</Table.ColumnHeader>
                      <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Длительность</Table.ColumnHeader>
                      <Table.ColumnHeader display={{ base: 'none', md: 'table-cell' }}>Дата</Table.ColumnHeader>
                      <Table.ColumnHeader>Статус</Table.ColumnHeader>
                      <Table.ColumnHeader w="80px" />
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {suspensions.map((s) => (
                      <Table.Row key={s.id}>
                        <Table.Cell>
                          <Link href={`/admin/players/${s.player.id}`}>
                            <Text fontWeight="medium" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                              {playerDisplayName(s.player)}
                            </Text>
                          </Link>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm" color="fg.muted">
                            {s.season.name}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={reasonColor(s.reason)} variant="subtle" size="sm">
                            {reasonLabel(s.reason)}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell display={{ base: 'none', md: 'table-cell' }}>
                          <Text fontSize="sm" fontFamily="mono">
                            {s.untilEndOfSeason ? 'До конца сезона' : `${s.matchesLeft} матч.`}
                          </Text>
                        </Table.Cell>
                        <Table.Cell display={{ base: 'none', md: 'table-cell' }}>
                          <Text fontSize="sm" color="fg.muted">
                            {formatDateNumeric(s.startedAt)}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={s.active ? 'red' : 'gray'} variant="subtle" size="sm">
                            {s.active ? 'Активно' : 'Истёк'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          {s.active && (
                            <Button
                              size="xs"
                              variant="outline"
                              colorPalette="red"
                              onClick={() => handleDeactivate(s.id)}
                              loading={deactivating === s.id}
                              disabled={deactivating !== null}
                              title="Снять отстранение"
                            >
                              <LuX size={12} />
                            </Button>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>
          }
        />
      )}
    </VStack>
  )
}
