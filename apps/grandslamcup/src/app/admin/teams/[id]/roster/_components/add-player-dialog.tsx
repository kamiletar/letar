'use client'

/**
 * Диалог добавления игрока: поиск существующего или создание нового.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { addExistingPlayerAction, createAndAddPlayerAction } from '@/app/admin/teams/_actions/roster-admin.action'
import { Box, Button, Dialog, Flex, Input, NativeSelect, Portal, Tabs, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuPlus, LuSearch } from 'react-icons/lu'

const ROLES = [
  { value: 'PLAYER', label: 'Игрок' },
  { value: 'COACH', label: 'Тренер' },
  { value: 'ASSISTANT_COACH', label: 'Зам. тренера' },
]

interface AddPlayerDialogProps {
  teamSeasonId: string
  cities: Array<{ id: string; name: string }>
  /** Город команды — подставляется по умолчанию при создании нового игрока */
  defaultCityId?: string
  onClose: () => void
}

export function AddPlayerDialog({ teamSeasonId, cities, defaultCityId, onClose }: AddPlayerDialogProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'search' | 'create'>('search')

  // Поиск
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ id: string; name: string; city?: { name: string } | null }>>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/players/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
    } finally {
      setSearching(false)
    }
  }, [])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => doSearch(v), 300)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  async function handleAddExisting(playerId: string) {
    setAdding(true)
    try {
      const result = await addExistingPlayerAction({ teamSeasonId, playerId })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Игрок добавлен' })
        router.refresh()
        onClose()
      }
    } finally {
      setAdding(false)
    }
  }

  // Создание
  const [newName, setNewName] = useState('')
  const [newCityId, setNewCityId] = useState(defaultCityId ?? '')
  const [newRole, setNewRole] = useState('PLAYER')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) {
      return
    }
    setCreating(true)
    try {
      const result = await createAndAddPlayerAction({
        teamSeasonId,
        name: newName.trim(),
        cityId: newCityId || undefined,
        role: newRole,
      })
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Игрок создан и добавлен' })
        router.refresh()
        onClose()
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW={{ base: 'calc(100vw - 32px)', sm: 'lg' }}>
            <Dialog.Header>
              <Dialog.Title>Добавить игрока</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Tabs.Root value={tab} onValueChange={(e) => setTab(e.value as 'search' | 'create')}>
                <Tabs.List>
                  <Tabs.Trigger value="search">Найти существующего</Tabs.Trigger>
                  <Tabs.Trigger value="create">Создать нового</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="search">
                  <VStack gap={3} align="stretch" pt={3}>
                    <Box position="relative">
                      <Box
                        position="absolute"
                        left={3}
                        top="50%"
                        transform="translateY(-50%)"
                        color="fg.muted"
                        pointerEvents="none"
                      >
                        <LuSearch size={16} />
                      </Box>
                      <Input value={query} onChange={handleQueryChange} placeholder="Имя поэта..." size="sm" pl={9} />
                    </Box>
                    {searching && (
                      <Text fontSize="sm" color="fg.muted">
                        Поиск...
                      </Text>
                    )}
                    {results.length > 0 && (
                      <VStack gap={1} align="stretch" maxH="300px" overflowY="auto">
                        {results.map((p) => (
                          <Flex
                            key={p.id}
                            justify="space-between"
                            align="center"
                            p={2}
                            borderRadius="md"
                            _hover={{ bg: 'bg.subtle' }}
                          >
                            <VStack gap={0} align="start">
                              <Text fontSize="sm" fontWeight="medium">
                                {p.name}
                              </Text>
                              {p.city && (
                                <Text fontSize="xs" color="fg.muted">
                                  {p.city.name}
                                </Text>
                              )}
                            </VStack>
                            <Button
                              size="xs"
                              colorPalette="teal"
                              onClick={() => handleAddExisting(p.id)}
                              loading={adding}
                            >
                              <LuPlus size={14} /> Добавить
                            </Button>
                          </Flex>
                        ))}
                      </VStack>
                    )}
                    {query.length >= 2 && !searching && results.length === 0 && (
                      <Text fontSize="sm" color="fg.muted">
                        Не найдено. Создайте нового →
                      </Text>
                    )}
                  </VStack>
                </Tabs.Content>

                <Tabs.Content value="create">
                  <VStack gap={3} align="stretch" pt={3}>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1}>
                        Имя
                      </Text>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Имя поэта"
                        size="sm"
                      />
                    </Box>
                    <Flex gap={3}>
                      <Box flex={1}>
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                          Город
                        </Text>
                        <NativeSelect.Root size="sm">
                          <NativeSelect.Field value={newCityId} onChange={(e) => setNewCityId(e.target.value)}>
                            <option value="">Не указан</option>
                            {cities.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Box>
                      <Box flex={1}>
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                          Роль
                        </Text>
                        <NativeSelect.Root size="sm">
                          <NativeSelect.Field value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Box>
                    </Flex>
                    <Flex justify="flex-end">
                      <Button
                        colorPalette="teal"
                        size="sm"
                        onClick={handleCreate}
                        loading={creating}
                        disabled={!newName.trim()}
                      >
                        Создать и добавить
                      </Button>
                    </Flex>
                  </VStack>
                </Tabs.Content>
              </Tabs.Root>
            </Dialog.Body>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
