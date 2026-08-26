'use client'

import { Badge, Box, Grid, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { LuDatabase, LuServer, LuUser, LuWifi } from 'react-icons/lu'

interface PinServerInfo {
  id: string
  name: string
  role: string
  status: string
  apiUrl: string
  peerId: string | null
  usedBytes: number
  capacityBytes: number
}

interface LibraryViewer {
  userId: string
  userName: string | null
  userImage: string | null
  watchStatus: string
  userRating: number | null
  addedAt: Date
  pinnedLocally: boolean
}

interface AdminSectionProps {
  pinnedOn: PinServerInfo | null
  viewers: LibraryViewer[]
  viewCount: number
}

const WATCH_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  WATCHING: { label: 'Смотрит', color: 'green' },
  COMPLETED: { label: 'Просмотрено', color: 'blue' },
  PLANNED: { label: 'Запланировано', color: 'purple' },
  ON_HOLD: { label: 'На паузе', color: 'orange' },
  DROPPED: { label: 'Брошено', color: 'red' },
  NOT_STARTED: { label: 'Не начато', color: 'gray' },
}

const PIN_STATUS_COLORS: Record<string, string> = {
  ONLINE: 'green',
  OFFLINE: 'red',
  MAINTENANCE: 'orange',
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '—'
  }
  const gb = bytes / 1024 ** 3
  if (gb >= 1) {
    return `${gb.toFixed(1)} ГБ`
  }
  const mb = bytes / 1024 ** 2
  return `${mb.toFixed(0)} МБ`
}

export function AdminSection({ pinnedOn, viewers, viewCount }: AdminSectionProps) {
  return (
    <VStack align="stretch" gap={6}>
      {/* Пин-сервер */}
      <Box>
        <Heading as="h3" size="sm" mb={3} color="fg.muted" textTransform="uppercase" letterSpacing="wide" fontSize="xs">
          Пин-сервер
        </Heading>
        {pinnedOn
          ? (
            <Box p={4} bg="bg.subtle" borderRadius="lg" borderWidth="1px">
              <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} gap={4}>
                <VStack align="start" gap={1}>
                  <HStack color="fg.muted" fontSize="xs">
                    <LuServer />
                    <Text>Сервер</Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="semibold">{pinnedOn.name}</Text>
                    <Badge colorPalette={PIN_STATUS_COLORS[pinnedOn.status] ?? 'gray'} size="sm">
                      {pinnedOn.status}
                    </Badge>
                  </HStack>
                  <Badge colorPalette="purple" variant="outline" size="sm">
                    {pinnedOn.role}
                  </Badge>
                </VStack>

                <VStack align="start" gap={1}>
                  <HStack color="fg.muted" fontSize="xs">
                    <LuWifi />
                    <Text>API URL</Text>
                  </HStack>
                  <Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
                    {pinnedOn.apiUrl}
                  </Text>
                  {pinnedOn.peerId && (
                    <Text fontSize="xs" color="fg.muted" fontFamily="mono" truncate maxW="200px">
                      {pinnedOn.peerId}
                    </Text>
                  )}
                </VStack>

                <VStack align="start" gap={1}>
                  <HStack color="fg.muted" fontSize="xs">
                    <LuDatabase />
                    <Text>Хранилище</Text>
                  </HStack>
                  <Text fontSize="sm">
                    {formatBytes(pinnedOn.usedBytes)}
                    {pinnedOn.capacityBytes > 0 && (
                      <Text as="span" color="fg.muted">
                        {' '}
                        / {formatBytes(pinnedOn.capacityBytes)}
                      </Text>
                    )}
                  </Text>
                </VStack>
              </Grid>
            </Box>
          )
          : (
            <Box p={4} bg="bg.subtle" borderRadius="lg" borderWidth="1px" borderStyle="dashed">
              <Text color="fg.muted" fontSize="sm">
                Аниме не запинено ни на один сервер
              </Text>
            </Box>
          )}
      </Box>

      {/* Зрители */}
      <Box>
        <HStack mb={3}>
          <Heading as="h3" size="sm" color="fg.muted" textTransform="uppercase" letterSpacing="wide" fontSize="xs">
            Зрители
          </Heading>
          <Badge colorPalette="purple" variant="subtle" size="sm">
            {viewCount} уникальных
          </Badge>
        </HStack>

        {viewers.length === 0
          ? (
            <Box p={4} bg="bg.subtle" borderRadius="lg" borderWidth="1px" borderStyle="dashed">
              <Text color="fg.muted" fontSize="sm">
                Никто не добавил в библиотеку
              </Text>
            </Box>
          )
          : (
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Пользователь</Table.ColumnHeader>
                    <Table.ColumnHeader>Статус</Table.ColumnHeader>
                    <Table.ColumnHeader>Оценка</Table.ColumnHeader>
                    <Table.ColumnHeader>Локальный пин</Table.ColumnHeader>
                    <Table.ColumnHeader>Добавлено</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {viewers.map((v) => {
                    const ws = WATCH_STATUS_LABELS[v.watchStatus] ?? { label: v.watchStatus, color: 'gray' }
                    return (
                      <Table.Row key={v.userId}>
                        <Table.Cell>
                          <HStack gap={2}>
                            <LuUser color="var(--chakra-colors-fg-muted)" />
                            <Text>{v.userName ?? 'Аноним'}</Text>
                          </HStack>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={ws.color} size="sm">
                            {ws.label}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell color="fg.muted">
                          {v.userRating !== null && v.userRating !== undefined ? `${v.userRating}/10` : '—'}
                        </Table.Cell>
                        <Table.Cell>
                          {v.pinnedLocally
                            ? (
                              <Badge colorPalette="green" size="sm" variant="subtle">
                                Да
                              </Badge>
                            )
                            : (
                              <Text color="fg.muted" fontSize="sm">
                                —
                              </Text>
                            )}
                        </Table.Cell>
                        <Table.Cell color="fg.muted" fontSize="xs">
                          {new Date(v.addedAt).toLocaleDateString('ru-RU')}
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
      </Box>
    </VStack>
  )
}
