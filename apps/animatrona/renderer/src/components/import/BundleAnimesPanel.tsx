'use client'

/**
 * BundleAnimesPanel — переиспользуемая панель выбора аниме для bundle-раздачи
 *
 * Используется в:
 * - import-rutracker/page.tsx (при скачивании набора)
 * - BundleGroupingDialog.tsx (при разметке уже скачанного торрента)
 *
 * Возможности:
 * - Поиск аниме на Shikimori (debounce 400мс)
 * - Кнопка «Загрузить связанные» — подтягивает sequel/prequel/side_story из seed аниме
 * - Удаление и переупорядочивание аниме в списке
 */

import { Badge, Button, Card, Heading, HStack, Icon, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useRef, useState } from 'react'
import { LuArrowDown, LuArrowUp, LuCheck, LuLayers, LuPlus, LuSearch, LuX } from 'react-icons/lu'

export interface BundleAnimeEntry {
  shikimoriId: number
  animeName: string
}

interface BundleAnimesPanelProps {
  animes: BundleAnimeEntry[]
  seedShikimoriId?: number
  onChange: (v: BundleAnimeEntry[]) => void
  /** Скрыть card-обёртку (для встраивания в Dialog) */
  flat?: boolean
  /** Заголовок панели (по умолчанию "Аниме в наборе") */
  title?: string
  /** Показывать кнопки переупорядочивания (стрелки вверх/вниз) */
  reorderable?: boolean
}

export function BundleAnimesPanel({
  animes,
  seedShikimoriId,
  onChange,
  flat = false,
  title = 'Аниме в наборе',
  reorderable = false,
}: BundleAnimesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string; russian: string | null }>>([])
  const [searching, setSearching] = useState(false)
  const [loadingRelated, setLoadingRelated] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = window.electronAPI as any
        const res = await api?.shikimori?.search({ search: query, limit: 8 })
        if (res?.success && res.data) {
          setSearchResults(
            res.data.map((a: { id: string; name: string; russian: string | null }) => ({
              id: Number(a.id),
              name: a.name,
              russian: a.russian,
            }))
          )
        }
      } finally {
        setSearching(false)
      }
    }, 400)
  }, [])

  const handleAdd = useCallback(
    (entry: BundleAnimeEntry) => {
      if (animes.some((a) => a.shikimoriId === entry.shikimoriId)) {
        return
      }
      onChange([...animes, entry])
      setSearchQuery('')
      setSearchResults([])
    },
    [animes, onChange]
  )

  const handleRemove = useCallback(
    (shikimoriId: number) => {
      onChange(animes.filter((a) => a.shikimoriId !== shikimoriId))
    },
    [animes, onChange]
  )

  const handleMove = useCallback(
    (idx: number, dir: -1 | 1) => {
      const next = [...animes]
      const target = idx + dir
      if (target < 0 || target >= next.length) {
        return
      }
      ;[next[idx], next[target]] = [next[target], next[idx]]
      onChange(next)
    },
    [animes, onChange]
  )

  const handleLoadRelated = useCallback(async () => {
    if (!seedShikimoriId) {
      return
    }
    setLoadingRelated(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = window.electronAPI as any
      const res = await api?.shikimori?.getWithRelated(seedShikimoriId)
      if (!res?.success || !res.data) {
        return
      }
      const BUNDLE_RELATION_KINDS = new Set([
        'side_story',
        'sequel',
        'prequel',
        'alternative_version',
        'full_story',
        'summary',
      ])
      const related = (res.data.related ?? [])
        .filter(
          (r: { anime: { id: string; name: string; russian: string | null } | null; relationKind: string }) =>
            r.anime && BUNDLE_RELATION_KINDS.has(r.relationKind)
        )
        .map((r: { anime: { id: string; name: string; russian: string | null }; relationKind: string }) => ({
          shikimoriId: Number(r.anime.id),
          animeName: r.anime.russian ?? r.anime.name,
        }))
      const seed = { shikimoriId: seedShikimoriId, animeName: res.data.russian ?? res.data.name }
      const all: BundleAnimeEntry[] = []
      if (!animes.some((a) => a.shikimoriId === seed.shikimoriId)) {
        all.push(seed)
      }
      for (const r of related) {
        if (!animes.some((a) => a.shikimoriId === r.shikimoriId)) {
          all.push(r)
        }
      }
      onChange([...animes, ...all])
    } finally {
      setLoadingRelated(false)
    }
  }, [seedShikimoriId, animes, onChange])

  const alreadyAdded = useCallback((id: number) => animes.some((a) => a.shikimoriId === id), [animes])

  const content = (
    <VStack gap={3} align="stretch">
      {/* Список добавленных */}
      {animes.length > 0 && (
        <VStack gap={1} align="stretch">
          {animes.map((a, i) => (
            <HStack key={a.shikimoriId} gap={2} p={2} borderRadius="md" bg="bg.subtle">
              <Text fontSize="xs" color="fg.muted" minW="20px">
                {i + 1}.
              </Text>
              <Text fontSize="sm" flex={1} truncate title={a.animeName}>
                {a.animeName}
              </Text>
              <Badge size="sm" variant="subtle" colorPalette="blue">
                #{a.shikimoriId}
              </Badge>
              {reorderable && (
                <HStack gap={0}>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleMove(i, -1)}
                    disabled={i === 0}
                    aria-label="Вверх"
                  >
                    <Icon>
                      <LuArrowUp />
                    </Icon>
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleMove(i, 1)}
                    disabled={i === animes.length - 1}
                    aria-label="Вниз"
                  >
                    <Icon>
                      <LuArrowDown />
                    </Icon>
                  </Button>
                </HStack>
              )}
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() => handleRemove(a.shikimoriId)}
                aria-label="Удалить"
              >
                <Icon>
                  <LuX />
                </Icon>
              </Button>
            </HStack>
          ))}
        </VStack>
      )}

      {/* Поиск */}
      <VStack gap={2} align="stretch">
        <HStack gap={2}>
          <Input
            placeholder="Поиск аниме на Shikimori..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            size="sm"
          />
          {searching && <Spinner size="sm" />}
        </HStack>
        {searchResults.length > 0 && (
          <VStack gap={1} align="stretch" maxH="200px" overflowY="auto" borderWidth="1px" borderRadius="md" p={1}>
            {searchResults.map((r) => (
              <HStack
                key={r.id}
                gap={2}
                p={2}
                borderRadius="md"
                _hover={{ bg: 'bg.subtle' }}
                cursor={alreadyAdded(r.id) ? 'default' : 'pointer'}
                opacity={alreadyAdded(r.id) ? 0.5 : 1}
                onClick={() => {
                  if (!alreadyAdded(r.id)) {
                    handleAdd({ shikimoriId: r.id, animeName: r.russian ?? r.name })
                  }
                }}
              >
                <VStack align="start" gap={0} flex={1}>
                  <Text fontSize="sm">{r.russian ?? r.name}</Text>
                  {r.russian && (
                    <Text fontSize="xs" color="fg.muted">
                      {r.name}
                    </Text>
                  )}
                </VStack>
                <Badge size="sm" variant="subtle">
                  #{r.id}
                </Badge>
                {alreadyAdded(r.id) ? (
                  <Icon color="green.400" fontSize="xs">
                    <LuCheck />
                  </Icon>
                ) : (
                  <Icon color="blue.400" fontSize="xs">
                    <LuPlus />
                  </Icon>
                )}
              </HStack>
            ))}
          </VStack>
        )}
      </VStack>
    </VStack>
  )

  if (flat) {
    return (
      <VStack gap={2} align="stretch">
        <HStack justify="space-between">
          <Heading size="sm">
            <HStack>
              <Icon>
                <LuLayers />
              </Icon>
              <Text>
                {title} ({animes.length})
              </Text>
            </HStack>
          </Heading>
          {seedShikimoriId && (
            <Button
              size="xs"
              variant="outline"
              colorPalette="blue"
              onClick={handleLoadRelated}
              loading={loadingRelated}
            >
              <Icon>
                <LuSearch />
              </Icon>
              Загрузить связанные
            </Button>
          )}
        </HStack>
        {content}
      </VStack>
    )
  }

  return (
    <Card.Root borderColor="blue.500" borderWidth="1px">
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="sm">
            <HStack>
              <Icon>
                <LuLayers />
              </Icon>
              <Text>
                {title} ({animes.length})
              </Text>
            </HStack>
          </Heading>
          {seedShikimoriId && (
            <Button
              size="sm"
              variant="outline"
              colorPalette="blue"
              onClick={handleLoadRelated}
              loading={loadingRelated}
            >
              <Icon>
                <LuSearch />
              </Icon>
              Загрузить связанные
            </Button>
          )}
        </HStack>
      </Card.Header>
      <Card.Body>{content}</Card.Body>
    </Card.Root>
  )
}
