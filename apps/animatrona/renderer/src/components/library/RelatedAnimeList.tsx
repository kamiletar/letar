'use client'

import { Badge, Box, Button, Heading, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { LuLink, LuRefreshCw } from 'react-icons/lu'

import { useAnimeRelations, useSyncRelations } from '../../lib/franchise'
import { toPlayableUrl } from '../../lib/media-url'
import { RelatedAnimeRow } from './RelatedAnimeRow'

/** Порядок отображения типов связей */
const RELATION_ORDER: string[] = [
  'SEQUEL',
  'PREQUEL',
  'SIDE_STORY',
  'PARENT_STORY',
  'SPIN_OFF',
  'ADAPTATION',
  'SUMMARY',
  'FULL_STORY',
  'ALTERNATIVE_VERSION',
  'ALTERNATIVE_SETTING',
  'CHARACTER',
  'OTHER',
]

/** Заголовки групп на русском */
const RELATION_GROUP_TITLES: Record<string, string> = {
  SEQUEL: 'Продолжения',
  PREQUEL: 'Предыстории',
  SIDE_STORY: 'Побочные истории',
  PARENT_STORY: 'Основа',
  SPIN_OFF: 'Спин-оффы',
  ADAPTATION: 'Адаптации',
  SUMMARY: 'Краткое содержание',
  FULL_STORY: 'Полные версии',
  ALTERNATIVE_VERSION: 'Альтернативные версии',
  ALTERNATIVE_SETTING: 'Альтернативный сеттинг',
  CHARACTER: 'Общие персонажи',
  OTHER: 'Другие связи',
}

interface RelatedAnimeListProps {
  /** ID аниме в локальной БД */
  animeId: string
  /** Shikimori ID для синхронизации */
  shikimoriId: number | null
  /** Дата последней проверки связей — если null, связи ещё не загружались */
  relationsCheckedAt?: Date | null
  /** Callback при клике на "Загрузить" */
  onDownloadClick?: (shikimoriId: number, name: string | null) => void
}

/**
 * Список связанных аниме с группировкой по типу связи
 * Показывается на странице деталей аниме
 */
export function RelatedAnimeList({ animeId, shikimoriId, relationsCheckedAt, onDownloadClick }: RelatedAnimeListProps) {
  const { data: relations, isLoading: isLoadingRelations } = useAnimeRelations(animeId)
  const { syncRelations, isSyncing, error: syncError } = useSyncRelations()

  // Мемоизация группировки — пересчитывается только при изменении relations
  // Расширяем тип: хук включает targetAnime через include, но generic теряет это
  type RelationType = NonNullable<typeof relations>[number] & {
    targetAnime?: {
      id: string
      name: string
      year: number | null
      posterCid: string | null
      poster: { cid: string } | null
    } | null
  }
  const groupedRelations = useMemo(() => {
    return (relations ?? []).reduce(
      (acc, relation) => {
        const kind = relation.relationKind
        if (!acc[kind]) {
          acc[kind] = []
        }
        acc[kind].push(relation)
        return acc
      },
      {} as Record<string, RelationType[]>,
    )
  }, [relations])

  // Мемоизация сортировки групп
  const sortedGroups = useMemo(
    () => RELATION_ORDER.filter((kind) => groupedRelations[kind]?.length > 0),
    [groupedRelations],
  )

  const handleSync = async () => {
    if (!shikimoriId) {
      return
    }
    await syncRelations(animeId, shikimoriId)
  }

  // Загрузка
  if (isLoadingRelations) {
    return (
      <Box py={4}>
        <HStack gap={2}>
          <Spinner size="sm" />
          <Text color="fg.muted">Загрузка связей...</Text>
        </HStack>
      </Box>
    )
  }

  // Нет связей и нет shikimoriId — не можем загрузить
  if (!relations?.length && !shikimoriId) {
    return null
  }

  // Нет связей, но есть shikimoriId
  if (!relations?.length && shikimoriId) {
    // Если связи уже проверялись — значит их просто нет
    if (relationsCheckedAt) {
      return (
        <Box py={4}>
          <VStack align="start" gap={3}>
            <Heading size="md" display="flex" alignItems="center" gap={2}>
              <Icon as={LuLink} />
              Связанные аниме
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              Связанных аниме не найдено в Shikimori.
            </Text>
            <Button size="xs" variant="ghost" onClick={handleSync} loading={isSyncing}>
              <LuRefreshCw />
              Проверить снова
            </Button>
            {syncError && (
              <Text color="red.400" fontSize="sm">
                {syncError}
              </Text>
            )}
          </VStack>
        </Box>
      )
    }

    // Связи ещё не загружались — предлагаем загрузить
    return (
      <Box py={4}>
        <VStack align="start" gap={3}>
          <Heading size="md" display="flex" alignItems="center" gap={2}>
            <Icon as={LuLink} />
            Связанные аниме
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            Связи ещё не загружены. Нажмите кнопку чтобы найти связанные аниме.
          </Text>
          <Button size="sm" variant="outline" onClick={handleSync} loading={isSyncing}>
            <LuRefreshCw />
            Найти связи
          </Button>
          {syncError && (
            <Text color="red.400" fontSize="sm">
              {syncError}
            </Text>
          )}
        </VStack>
      </Box>
    )
  }

  // Подсчитываем статистику
  const totalCount = relations?.length ?? 0
  const loadedCount = relations?.filter((r) => r.targetAnimeId !== null).length ?? 0

  return (
    <Box py={4}>
      <VStack align="stretch" gap={4}>
        {/* Заголовок с статистикой */}
        <HStack justify="space-between" align="center">
          <Heading size="md" display="flex" alignItems="center" gap={2}>
            <Icon as={LuLink} />
            Связанные аниме
            <Badge colorPalette={loadedCount === totalCount ? 'green' : 'gray'} variant="subtle">
              {loadedCount}/{totalCount}
            </Badge>
          </Heading>
          {shikimoriId && (
            <Button size="xs" variant="ghost" onClick={handleSync} loading={isSyncing}>
              <LuRefreshCw />
              Обновить
            </Button>
          )}
        </HStack>

        {syncError && (
          <Text color="red.400" fontSize="sm">
            {syncError}
          </Text>
        )}

        {/* Группы связей */}
        {sortedGroups.map((kind) => {
          const groupRelations = groupedRelations[kind] ?? []
          const title = RELATION_GROUP_TITLES[kind] || kind

          return (
            <Box key={kind}>
              <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={2}>
                {title}
              </Text>
              <VStack align="stretch" gap={2}>
                {groupRelations.map((relation) => {
                  const ta = relation.targetAnime
                  return (
                    <RelatedAnimeRow
                      key={relation.id}
                      name={ta?.name ?? null}
                      relationKind={relation.relationKind}
                      year={ta?.year ?? null}
                      kind={null}
                      posterUrl={toPlayableUrl({ cid: ta?.poster?.cid ?? ta?.posterCid })}
                      localAnimeId={relation.targetAnimeId}
                      shikimoriId={relation.targetShikimoriId}
                      onDownloadClick={() => onDownloadClick?.(relation.targetShikimoriId, ta?.name ?? null)}
                    />
                  )
                })}
              </VStack>
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}
