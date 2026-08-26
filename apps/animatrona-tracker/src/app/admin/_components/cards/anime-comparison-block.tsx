'use client'

import { formatFileSize } from '@/lib/ipfs'
import { Badge, Box, Button, Collapsible, HStack, Icon, Link, Separator, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  LuArrowRightLeft,
  LuChevronDown,
  LuFilm,
  LuHeadphones,
  LuLanguages,
  LuMinus,
  LuMonitor,
  LuPencil,
  LuPlus,
  LuRefreshCw,
  LuSettings,
} from 'react-icons/lu'
import { DiffRow } from '../common/diff-row'
import type {
  AnimeItem,
  AudioTrackSummary,
  DeepDiffResponse,
  EpisodeFullSummary,
  ManifestTopLevelSummary,
  ReplacesAnimeData,
  SubtitleTrackSummary,
} from '../types'

// ─── API ────────────────────────────────────────────────────────────

/** Загрузка глубокого diff эпизодов через API */
async function fetchDeepDiff(directoryCid: string) {
  const params = new URLSearchParams({ directoryCid })
  const res = await fetch(`/api/admin/deep-diff?${params}`)
  if (!res.ok) {
    return null
  }
  return res.json() as Promise<DeepDiffResponse>
}

// ─── Главный компонент ──────────────────────────────────────────────

interface AnimeComparisonBlockProps {
  /** Текущее (старое) аниме */
  current: ReplacesAnimeData
  /** Новое аниме-кандидат */
  replacement: AnimeItem
}

/** Блок сравнения текущего и нового аниме (спойлер, манифесты загружаются лениво) */
export function AnimeComparisonBlock({ current, replacement }: AnimeComparisonBlockProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible.Root open={open} onOpenChange={(details) => setOpen(details.open)}>
      <Collapsible.Trigger asChild>
        <Box
          as="button"
          w="100%"
          bg="orange.50"
          _dark={{ bg: 'orange.950/30', borderColor: 'orange.800' }}
          p={3}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="orange.200"
          cursor="pointer"
          _hover={{ bg: 'orange.100', _dark: { bg: 'orange.950/50' } }}
          transition="backgrounds 0.2s"
        >
          <HStack gap={2} justify="space-between">
            <HStack gap={2}>
              <Icon color="orange.500">
                <LuArrowRightLeft />
              </Icon>
              <Text fontWeight="bold" fontSize="sm" color="orange.600" _dark={{ color: 'orange.400' }}>
                Сравнение с текущей раздачей
              </Text>
            </HStack>
            <Icon color="orange.500" transform={open ? 'rotate(180deg)' : undefined} transition="transform 0.2s">
              <LuChevronDown />
            </Icon>
          </HStack>
        </Box>
      </Collapsible.Trigger>

      <Collapsible.Content>
        <Box
          bg="orange.50"
          _dark={{ bg: 'orange.950/30', borderColor: 'orange.800' }}
          px={4}
          pb={4}
          pt={2}
          borderRadius="0 0 lg lg"
          borderWidth="0 1px 1px 1px"
          borderColor="orange.200"
          mt="-1px"
        >
          <AutoDiff current={current} replacement={replacement} isOpen={open} />
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

// ─── Утилиты ────────────────────────────────────────────────────────

/** Сокращённый CID для отображения */
function shortCid(cid: string): string {
  if (cid.length <= 16) {
    return cid
  }
  return `${cid.slice(0, 8)}…${cid.slice(-8)}`
}

/** Форматирование разрешения */
function formatResolution(width: number, height: number): string {
  return `${width}×${height}`
}

/** Форматирование видео для отображения */
function formatVideoSummary(v: EpisodeFullSummary['video']): string {
  if (!v) {
    return '—'
  }
  const parts = [formatResolution(v.width, v.height), v.codec.toUpperCase()]
  if (v.bitrate) {
    parts.push(`${Math.round(v.bitrate / 1000)}kbps`)
  }
  if (v.size) {
    parts.push(formatFileSize(v.size))
  }
  return parts.join(' · ')
}

/** Форматирование кодирования */
function formatEncodingSummary(e: EpisodeFullSummary['encoding']): string {
  if (!e) {
    return '—'
  }
  const parts = [`${e.codec} CQ${e.cq}`, e.preset, e.encoderType]
  if (e.vmafScore) {
    parts.push(`VMAF ${e.vmafScore.toFixed(1)}`)
  }
  return parts.join(' · ')
}

/** Сравнить верхнеуровневые поля двух IPFS манифестов */
function computeManifestDiffs(
  oldM: ManifestTopLevelSummary,
  newM: ManifestTopLevelSummary,
): { label: string; oldVal: string; newVal: string }[] {
  const diffs: { label: string; oldVal: string; newVal: string }[] = []

  const check = (label: string, oldVal: string, newVal: string) => {
    if (oldVal !== newVal) {
      diffs.push({ label, oldVal, newVal })
    }
  }

  // Метаданные манифеста
  check('Название (манифест)', oldM.name || '—', newM.name || '—')
  check('Ориг. название (манифест)', oldM.originalName || '—', newM.originalName || '—')

  // CID-ссылки на вложенные документы
  const cid = (v?: string) => (v ? shortCid(v) : '—')
  check('Постер (IPFS)', cid(oldM.posterCid), cid(newM.posterCid))
  // AnimeInfo — если оба загружены, показываем детали; иначе CID
  if (oldM.animeInfo && newM.animeInfo) {
    const oi = oldM.animeInfo
    const ni = newM.animeInfo
    check('Название (инфо)', oi.name || '—', ni.name || '—')
    check('Ориг. название (инфо)', oi.originalName || '—', ni.originalName || '—')
    check('Англ. название', oi.nameEn || '—', ni.nameEn || '—')
    check('Год (инфо)', oi.year?.toString() || '—', ni.year?.toString() || '—')
    check('Тип', oi.kind || '—', ni.kind || '—')
    check('Возраст. рейтинг', oi.ageRating || '—', ni.ageRating || '—')
    check('Кол-во эпизодов (инфо)', oi.episodeCount?.toString() || '—', ni.episodeCount?.toString() || '—')
    check('Статус', oi.status || '—', ni.status || '—')
    check('Рейтинг', oi.rating?.toFixed(1) || '—', ni.rating?.toFixed(1) || '—')
    check(
      'Описание',
      oi.descriptionLength > 0 ? `${oi.descriptionLength} символов` : '—',
      ni.descriptionLength > 0 ? `${ni.descriptionLength} символов` : '—',
    )
    check('Жанры (инфо)', oi.genres.join(', ') || '—', ni.genres.join(', ') || '—')
    check('Студии (инфо)', oi.studios.join(', ') || '—', ni.studios.join(', ') || '—')
    check('Озвучка', oi.fandubbers.join(', ') || '—', ni.fandubbers.join(', ') || '—')
    check('Субтитры (команды)', oi.fansubbers.join(', ') || '—', ni.fansubbers.join(', ') || '—')
  } else if (oldM.animeInfoCid !== newM.animeInfoCid) {
    check('AnimeInfo', cid(oldM.animeInfoCid), cid(newM.animeInfoCid))
  }
  check('Эпизоды (CID)', cid(oldM.episodesCid), cid(newM.episodesCid))
  check('Граф франшизы', cid(oldM.franchiseGraphCid), cid(newM.franchiseGraphCid))
  check('Связи', cid(oldM.relationsCid), cid(newM.relationsCid))
  check('Превью эпизодов', cid(oldM.episodePreviewsCid), cid(newM.episodePreviewsCid))

  // Флаги и мета
  check('BD Remux', oldM.isBdRemux ? 'да' : 'нет', newM.isBdRemux ? 'да' : 'нет')
  check('Источник', oldM.sourceUrl || '—', newM.sourceUrl || '—')

  // Размер и блоки
  if (oldM.directorySize || newM.directorySize) {
    check(
      'Размер (манифест)',
      oldM.directorySize ? formatFileSize(oldM.directorySize) : '—',
      newM.directorySize ? formatFileSize(newM.directorySize) : '—',
    )
  }
  if (oldM.directoryBlocks || newM.directoryBlocks) {
    check('Блоки', oldM.directoryBlocks?.toString() || '—', newM.directoryBlocks?.toString() || '—')
  }

  // Дата обновления
  check('Обновлён', oldM.updatedAt || '—', newM.updatedAt || '—')

  return diffs
}

// ─── Результат глубокого сравнения эпизода ──────────────────────────

interface EpisodeDeepChange {
  type: 'added' | 'removed' | 'changed' | 'unchanged'
  number: number
  name: string | null
  /** Не удалось загрузить манифест одного из эпизодов */
  loadFailed?: 'old' | 'new' | 'both'
  newName?: string | null
  /** Видео diff (если изменилось) */
  videoDiff?: { old: string; new: string } | null
  /** Кодирование diff */
  encodingDiff?: { old: string; new: string } | null
  /** Аудио diff */
  audioChanges?: TrackChanges | null
  /** Субтитры diff */
  subtitleChanges?: TrackChanges | null
  /** Размер diff */
  sizeDiff?: { old: string; new: string } | null
  /** Главы diff */
  chaptersDiff?: string | null
  /** Превью diff */
  thumbnailsDiff?: string | null
  /** Скриншоты diff */
  screenshotsDiff?: string | null
  /** Изменился только CID манифеста, содержание идентичное */
  cidOnlyChange?: boolean
  /** Список аудиодорожек нового эпизода (для информационного отображения) */
  newAudioTracks?: string[]
  /** Список субтитров нового эпизода */
  newSubtitleTracks?: string[]
  /** Видео сводка нового эпизода */
  newVideoSummary?: string
}

/** Вычислить глубокий diff между двумя наборами эпизодов */
function computeDeepEpisodeDiff(oldEps: EpisodeFullSummary[], newEps: EpisodeFullSummary[]): EpisodeDeepChange[] {
  const oldMap = new Map(oldEps.map((e) => [e.number, e]))
  const newMap = new Map(newEps.map((e) => [e.number, e]))
  const allNumbers = new Set([...oldMap.keys(), ...newMap.keys()])
  const result: EpisodeDeepChange[] = []

  for (const num of [...allNumbers].sort((a, b) => a - b)) {
    const oldEp = oldMap.get(num)
    const newEp = newMap.get(num)

    if (!oldEp && newEp) {
      result.push({ type: 'added', number: num, name: newEp.name ?? null })
      continue
    }
    if (oldEp && !newEp) {
      result.push({ type: 'removed', number: num, name: oldEp.name ?? null })
      continue
    }
    if (!oldEp || !newEp) {
      continue
    }

    // Если одна сторона не загрузилась — не сравниваем глубоко (показываем предупреждение в UI)
    const bothLoaded = oldEp.manifestLoaded && newEp.manifestLoaded

    // Сравниваем каждый аспект (только если оба манифеста загрузились)
    const videoDiff = bothLoaded && oldEp.video && newEp.video
      ? (() => {
        const oldStr = formatVideoSummary(oldEp.video)
        const newStr = formatVideoSummary(newEp.video)
        return oldStr !== newStr ? { old: oldStr, new: newStr } : null
      })()
      : null

    const encodingDiff = bothLoaded && oldEp.encoding && newEp.encoding
      ? (() => {
        const oldStr = formatEncodingSummary(oldEp.encoding)
        const newStr = formatEncodingSummary(newEp.encoding)
        return oldStr !== newStr ? { old: oldStr, new: newStr } : null
      })()
      : null

    const audioChanges = bothLoaded ? computeTrackDiff(oldEp.audioTracks, newEp.audioTracks, formatAudioTrack) : null
    const subtitleChanges = bothLoaded
      ? computeTrackDiff(oldEp.subtitleTracks, newEp.subtitleTracks, formatSubtitleTrack)
      : null

    const sizeDiff = oldEp.size !== newEp.size
      ? { old: formatFileSize(oldEp.size), new: formatFileSize(newEp.size) }
      : null

    const chaptersDiff = oldEp.hasChapters !== newEp.hasChapters || oldEp.chaptersCount !== newEp.chaptersCount
      ? `${oldEp.hasChapters ? `${oldEp.chaptersCount} глав` : 'нет'} → ${
        newEp.hasChapters ? `${newEp.chaptersCount} глав` : 'нет'
      }`
      : null

    const thumbnailsDiff = oldEp.hasThumbnails !== newEp.hasThumbnails
      ? `${oldEp.hasThumbnails ? 'есть' : 'нет'} → ${newEp.hasThumbnails ? 'есть' : 'нет'}`
      : null

    const screenshotsDiff = oldEp.screenshotsCount !== newEp.screenshotsCount
      ? `${oldEp.screenshotsCount} → ${newEp.screenshotsCount}`
      : null

    // Определяем, не загрузился ли манифест
    const loadFailed = !oldEp.manifestLoaded && !newEp.manifestLoaded
      ? ('both' as const)
      : !oldEp.manifestLoaded
      ? ('old' as const)
      : !newEp.manifestLoaded
      ? ('new' as const)
      : undefined

    const contentChanged = videoDiff
      || encodingDiff
      || audioChanges
      || subtitleChanges
      || sizeDiff
      || chaptersDiff
      || thumbnailsDiff
      || screenshotsDiff
      || oldEp.name !== newEp.name

    const cidChanged = oldEp.manifestCid !== newEp.manifestCid
    const cidOnlyChange = cidChanged && !contentChanged && !loadFailed

    // Сводка треков нового эпизода (для информационного отображения)
    const newAudioTracks = newEp.audioTracks.length > 0 ? newEp.audioTracks.map(formatAudioTrack) : undefined
    const newSubtitleTracks = newEp.subtitleTracks.length > 0
      ? newEp.subtitleTracks.map(formatSubtitleTrack)
      : undefined
    const newVideoSummary = newEp.video ? formatVideoSummary(newEp.video) : undefined

    if (cidChanged || contentChanged || loadFailed) {
      result.push({
        type: 'changed',
        number: num,
        name: oldEp.name ?? null,
        newName: newEp.name ?? null,
        loadFailed,
        videoDiff,
        encodingDiff,
        audioChanges,
        subtitleChanges,
        sizeDiff,
        chaptersDiff,
        thumbnailsDiff,
        screenshotsDiff,
        cidOnlyChange,
        newAudioTracks,
        newSubtitleTracks,
        newVideoSummary,
      })
    } else {
      result.push({ type: 'unchanged', number: num, name: oldEp.name ?? null })
    }
  }

  return result
}

// ─── AutoDiff ───────────────────────────────────────────────────────

/** Автоматический diff полей между текущим и новым аниме */
function AutoDiff({
  current,
  replacement,
  isOpen,
}: {
  current: ReplacesAnimeData
  replacement: AnimeItem
  isOpen: boolean
}) {
  const queryClient = useQueryClient()

  // Ленивая загрузка глубоких данных эпизодов из IPFS — только когда спойлер открыт
  const { data: newDeep, isFetching: fetchingNew } = useQuery({
    queryKey: ['deep-diff', replacement.directoryCid],
    queryFn: () => fetchDeepDiff(replacement.directoryCid ?? ''),
    enabled: isOpen && !!replacement.directoryCid,
    staleTime: 5 * 60 * 1000,
  })

  const { data: oldDeep, isFetching: fetchingOld } = useQuery({
    queryKey: ['deep-diff', current.directoryCid],
    queryFn: () => fetchDeepDiff(current.directoryCid ?? ''),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  })

  const deepLoading = fetchingNew || fetchingOld

  // Вычисляем метаданные diff (не зависит от IPFS загрузки)
  const diffs: { label: string; oldVal: string; newVal: string }[] = []

  const check = (label: string, oldVal: string, newVal: string) => {
    if (oldVal !== newVal) {
      diffs.push({ label, oldVal, newVal })
    }
  }

  check('Название', current.title, replacement.title)
  check('Оригинальное', current.titleOriginal ?? '', replacement.titleOriginal ?? '')
  check('Год', current.year?.toString() ?? '', replacement.year?.toString() ?? '')
  check('Студия', current.studio ?? '', replacement.studio ?? '')
  check('Жанры', current.genres.join(', ') || '—', replacement.genres.join(', ') || '—')

  check('Shikimori ID', current.shikimoriId?.toString() ?? '—', replacement.shikimoriId?.toString() ?? '—')
  check('MAL ID', current.malId?.toString() ?? '—', replacement.malId?.toString() ?? '—')
  check('AniList ID', current.anilistId?.toString() ?? '—', replacement.anilistId?.toString() ?? '—')

  const oldDescLen = current.description?.length ?? 0
  const newDescLen = replacement.description?.length ?? 0
  if (current.description !== replacement.description) {
    check('Описание', oldDescLen > 0 ? `${oldDescLen} символов` : '—', newDescLen > 0 ? `${newDescLen} символов` : '—')
  }

  if (current.coverUrl !== replacement.coverUrl) {
    check('Обложка', current.coverUrl ? 'есть' : '—', replacement.coverUrl ? 'изменена' : '—')
  }

  check('Эпизоды', `${current.episodes.length} эп.`, `${replacement.episodes.length} эп.`)
  check(
    'Размер',
    current.directorySize ? formatFileSize(current.directorySize) : '',
    replacement.directorySize ? formatFileSize(replacement.directorySize) : '',
  )

  const cidChanged = (current.directoryCid ?? '') !== (replacement.directoryCid ?? '')

  // Сравнение верхнеуровневых полей IPFS-манифестов
  const manifestDiffs = useMemo(() => {
    if (!oldDeep?.manifest || !newDeep?.manifest) {
      return []
    }
    return computeManifestDiffs(oldDeep.manifest, newDeep.manifest)
  }, [oldDeep, newDeep])

  // Глубокое сравнение эпизодов (из IPFS)
  const episodeChanges = useMemo(() => {
    if (!oldDeep?.episodes || !newDeep?.episodes) {
      return null
    }
    return computeDeepEpisodeDiff(oldDeep.episodes, newDeep.episodes)
  }, [oldDeep, newDeep])

  // Статистика эпизодов
  const epStats = useMemo(() => {
    if (!episodeChanges) {
      return null
    }
    const added = episodeChanges.filter((e) => e.type === 'added').length
    const removed = episodeChanges.filter((e) => e.type === 'removed').length
    const changed = episodeChanges.filter((e) => e.type === 'changed' && !e.cidOnlyChange).length
    const cidOnly = episodeChanges.filter((e) => e.type === 'changed' && e.cidOnlyChange).length
    const unchanged = episodeChanges.filter((e) => e.type === 'unchanged').length
    return { added, removed, changed, cidOnly, unchanged, total: episodeChanges.length }
  }, [episodeChanges])

  if (
    diffs.length === 0
    && !cidChanged
    && !deepLoading
    && manifestDiffs.length === 0
    && (!episodeChanges || episodeChanges.every((e) => e.type === 'unchanged'))
  ) {
    return null
  }

  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.letar.best'

  return (
    <Box>
      {/* Метаданные */}
      {diffs.length > 0 && (
        <>
          <Text fontWeight="bold" fontSize="sm" mb={2}>
            Отличия:
          </Text>
          <VStack align="flex-start" gap={1} mb={3}>
            {diffs.map((d) => <DiffRow key={d.label} label={d.label} oldVal={d.oldVal} newVal={d.newVal} />)}
          </VStack>
        </>
      )}

      {/* Directory CID — кликабельные ссылки на IPFS Gateway */}
      {cidChanged && (
        <HStack gap={2} fontSize="sm" mb={3}>
          <Text fontWeight="semibold" minW="100px">
            Directory CID:
          </Text>
          {current.directoryCid
            ? (
              <Link
                color="red.400"
                textDecoration="line-through"
                href={`${gateway}/ipfs/${current.directoryCid}`}
                target="_blank"
                rel="noopener noreferrer"
                fontSize="sm"
              >
                {shortCid(current.directoryCid)}
              </Link>
            )
            : <Text color="red.400">—</Text>}
          <Text>→</Text>
          {replacement.directoryCid
            ? (
              <Link
                color="green.400"
                href={`${gateway}/ipfs/${replacement.directoryCid}`}
                target="_blank"
                rel="noopener noreferrer"
                fontSize="sm"
              >
                {shortCid(replacement.directoryCid)}
              </Link>
            )
            : <Text color="green.400">—</Text>}
        </HStack>
      )}

      {/* Отличия IPFS-манифестов (верхний уровень) */}
      {manifestDiffs.length > 0 && (
        <>
          <Text fontWeight="bold" fontSize="sm" mb={2}>
            Манифест (IPFS):
          </Text>
          <VStack align="flex-start" gap={1} mb={3}>
            {manifestDiffs.map((d) => <DiffRow key={d.label} label={d.label} oldVal={d.oldVal} newVal={d.newVal} />)}
          </VStack>
        </>
      )}

      {/* Загрузка глубоких данных */}
      {deepLoading && (
        <HStack gap={2} py={2}>
          <Spinner size="sm" color="orange.500" />
          <Text fontSize="xs" color="fg.muted">
            Загрузка манифестов эпизодов…
          </Text>
        </HStack>
      )}

      {/* Саммари эпизодов */}
      {epStats && (epStats.changed > 0 || epStats.cidOnly > 0 || epStats.added > 0 || epStats.removed > 0) && (
        <>
          <Separator my={2} />
          <HStack gap={2} mb={2} flexWrap="wrap">
            <Icon color="orange.500">
              <LuFilm />
            </Icon>
            <Text fontWeight="bold" fontSize="sm">
              Эпизоды:
            </Text>
            {epStats.changed > 0 && (
              <Badge colorPalette="yellow" size="sm">
                {epStats.changed} изменен{epStats.changed === 1 ? '' : epStats.changed < 5 ? 'о' : 'о'}
              </Badge>
            )}
            {epStats.cidOnly > 0 && (
              <Badge colorPalette="gray" size="sm" variant="subtle">
                {epStats.cidOnly} перепакован{epStats.cidOnly === 1 ? '' : epStats.cidOnly < 5 ? 'о' : 'о'}
              </Badge>
            )}
            {epStats.added > 0 && (
              <Badge colorPalette="green" size="sm">
                +{epStats.added} добавлен{epStats.added === 1 ? '' : epStats.added < 5 ? 'о' : 'о'}
              </Badge>
            )}
            {epStats.removed > 0 && (
              <Badge colorPalette="red" size="sm">
                −{epStats.removed} удален{epStats.removed === 1 ? '' : epStats.removed < 5 ? 'о' : 'о'}
              </Badge>
            )}
            {epStats.unchanged > 0 && (
              <Text fontSize="xs" color="fg.muted">
                ({epStats.unchanged} без изменений)
              </Text>
            )}
          </HStack>
        </>
      )}

      {/* Поэпизодные глубокие изменения */}
      {episodeChanges && episodeChanges.some((e) => e.type !== 'unchanged') && (
        <VStack align="stretch" gap={1}>
          {episodeChanges
            .filter((e) => e.type !== 'unchanged')
            .map((ep) => <DeepEpisodeChangeRow key={`${ep.type}-${ep.number}`} change={ep} />)}
        </VStack>
      )}

      {/* Кнопка повтора загрузки если есть незагруженные манифесты */}
      {episodeChanges && episodeChanges.some((e) => e.loadFailed) && (
        <Button
          size="xs"
          variant="outline"
          colorPalette="orange"
          mt={2}
          loading={deepLoading}
          onClick={() => {
            // removeQueries полностью сбрасывает кеш → следующий fetch идёт на сервер
            queryClient.removeQueries({ queryKey: ['deep-diff', replacement.directoryCid] })
            queryClient.removeQueries({ queryKey: ['deep-diff', current.directoryCid] })
            // refetchQueries запускает свежий запрос
            queryClient.refetchQueries({ queryKey: ['deep-diff', replacement.directoryCid] })
            queryClient.refetchQueries({ queryKey: ['deep-diff', current.directoryCid] })
          }}
        >
          <LuRefreshCw style={{ marginRight: '4px' }} />
          Повторить загрузку манифестов
        </Button>
      )}
    </Box>
  )
}

// ─── Строка глубокого изменения эпизода ─────────────────────────────

/** Строка глубокого изменения эпизода с раскрывающимися деталями */
function DeepEpisodeChangeRow({ change }: { change: EpisodeDeepChange }) {
  const epLabel = `Эп. ${change.number}`
  const titleStr = change.name ? ` «${change.name}»` : ''

  if (change.type === 'added') {
    return (
      <HStack gap={2} fontSize="sm">
        <Icon color="green.400" flexShrink={0}>
          <LuPlus />
        </Icon>
        <Text color="green.400">
          {epLabel}
          {titleStr}
        </Text>
      </HStack>
    )
  }

  if (change.type === 'removed') {
    return (
      <HStack gap={2} fontSize="sm">
        <Icon color="red.400" flexShrink={0}>
          <LuMinus />
        </Icon>
        <Text color="red.400" textDecoration="line-through">
          {epLabel}
          {titleStr}
        </Text>
      </HStack>
    )
  }

  // changed — показываем все детали
  const hasDetails = change.videoDiff
    || change.encodingDiff
    || change.audioChanges
    || change.subtitleChanges
    || change.sizeDiff
    || change.chaptersDiff
    || change.thumbnailsDiff
    || change.screenshotsDiff

  // CID-only: серый фон, иначе оранжевый
  const bgColor = change.cidOnlyChange && !hasDetails ? 'gray.50/50' : 'orange.50/50'
  const bgColorDark = change.cidOnlyChange && !hasDetails ? 'gray.950/20' : 'orange.950/20'
  const iconColor = change.cidOnlyChange && !hasDetails ? 'fg.muted' : 'yellow.500'

  return (
    <Box fontSize="sm" bg={bgColor} _dark={{ bg: bgColorDark }} borderRadius="md" p={2}>
      <HStack gap={2}>
        <Icon color={iconColor} flexShrink={0}>
          <LuPencil />
        </Icon>
        <Text fontWeight="semibold">
          {epLabel}
          {titleStr}
        </Text>
        {change.name !== change.newName && change.newName && (
          <Text color="green.400" fontSize="xs">
            → «{change.newName}»
          </Text>
        )}
        {change.cidOnlyChange && !hasDetails && (
          <Badge size="xs" colorPalette="gray" variant="subtle">
            только CID
          </Badge>
        )}
      </HStack>

      {/* Предупреждение если манифест не загрузился */}
      {change.loadFailed && (
        <HStack gap={2} pl={6} mt={1} fontSize="xs" color="red.400">
          <Text>
            {change.loadFailed === 'both'
              ? 'Не удалось загрузить манифесты обоих эпизодов'
              : change.loadFailed === 'new'
              ? 'Не удалось загрузить манифест нового эпизода'
              : 'Не удалось загрузить манифест текущего эпизода'}
          </Text>
          <Text color="fg.muted">(сравнение треков недоступно)</Text>
        </HStack>
      )}

      {hasDetails && (
        <VStack align="stretch" gap={1} pl={6} mt={1}>
          {/* Видео */}
          {change.videoDiff && (
            <HStack gap={1} fontSize="xs" flexWrap="wrap">
              <Icon color="blue.400" flexShrink={0}>
                <LuMonitor />
              </Icon>
              <Text color="red.400" textDecoration="line-through">
                {change.videoDiff.old}
              </Text>
              <Text>→</Text>
              <Text color="green.400">{change.videoDiff.new}</Text>
            </HStack>
          )}

          {/* Кодирование */}
          {change.encodingDiff && (
            <HStack gap={1} fontSize="xs" flexWrap="wrap">
              <Icon color="purple.400" flexShrink={0}>
                <LuSettings />
              </Icon>
              <Text color="red.400" textDecoration="line-through">
                {change.encodingDiff.old}
              </Text>
              <Text>→</Text>
              <Text color="green.400">{change.encodingDiff.new}</Text>
            </HStack>
          )}

          {/* Размер */}
          {change.sizeDiff && (
            <HStack gap={1} fontSize="xs">
              <Text color="fg.muted">Размер:</Text>
              <Text color="red.400" textDecoration="line-through">
                {change.sizeDiff.old}
              </Text>
              <Text>→</Text>
              <Text color="green.400">{change.sizeDiff.new}</Text>
            </HStack>
          )}

          {/* Аудио */}
          {change.audioChanges && (
            <TrackDiffSection icon={<LuHeadphones />} title="Аудио" changes={change.audioChanges} />
          )}

          {/* Субтитры */}
          {change.subtitleChanges && (
            <TrackDiffSection icon={<LuLanguages />} title="Субтитры" changes={change.subtitleChanges} />
          )}

          {/* Главы, превью, скриншоты */}
          {change.chaptersDiff && (
            <Text fontSize="xs" color="fg.muted">
              Главы: {change.chaptersDiff}
            </Text>
          )}
          {change.thumbnailsDiff && (
            <Text fontSize="xs" color="fg.muted">
              Превью: {change.thumbnailsDiff}
            </Text>
          )}
          {change.screenshotsDiff && (
            <Text fontSize="xs" color="fg.muted">
              Скриншоты: {change.screenshotsDiff}
            </Text>
          )}
        </VStack>
      )}

      {/* Информация о треках (для CID-only или когда diff не обнаружен но треки есть) */}
      {!hasDetails && (change.newAudioTracks || change.newSubtitleTracks || change.newVideoSummary) && (
        <VStack align="stretch" gap={0.5} pl={6} mt={1}>
          {change.newVideoSummary && (
            <HStack gap={1} fontSize="xs">
              <Icon color="fg.muted" flexShrink={0}>
                <LuMonitor />
              </Icon>
              <Text color="fg.muted">{change.newVideoSummary}</Text>
            </HStack>
          )}
          {change.newAudioTracks && (
            <HStack gap={1} fontSize="xs" flexWrap="wrap">
              <Icon color="fg.muted" flexShrink={0}>
                <LuHeadphones />
              </Icon>
              <Text color="fg.muted">{change.newAudioTracks.join(', ')}</Text>
            </HStack>
          )}
          {change.newSubtitleTracks && (
            <HStack gap={1} fontSize="xs" flexWrap="wrap">
              <Icon color="fg.muted" flexShrink={0}>
                <LuLanguages />
              </Icon>
              <Text color="fg.muted">{change.newSubtitleTracks.join(', ')}</Text>
            </HStack>
          )}
        </VStack>
      )}
    </Box>
  )
}

// ─── Сравнение треков ────────────────────────────────────────────────

/** Результат сравнения треков */
interface TrackChanges {
  added: string[]
  removed: string[]
  changed: { from: string; to: string }[]
}

/** Форматирование аудиодорожки для отображения */
function formatAudioTrack(t: AudioTrackSummary): string {
  const parts = [t.title || t.language]
  if (t.codec || t.channels) {
    parts.push(`${t.codec} ${t.channels}`.trim())
  }
  if (t.dubGroup) {
    parts.push(`[${t.dubGroup}]`)
  }
  return parts.join(' · ')
}

/** Форматирование субтитров для отображения */
function formatSubtitleTrack(t: SubtitleTrackSummary): string {
  const parts = [t.title || t.language]
  if (t.format) {
    parts.push(t.format)
  }
  if (t.dubGroup) {
    parts.push(`[${t.dubGroup}]`)
  }
  return parts.join(' · ')
}

/** Вычислить diff треков (аудио или субтитры) */
function computeTrackDiff<T>(
  oldTracks: T[] | undefined,
  newTracks: T[] | undefined,
  format: (t: T) => string,
): TrackChanges | null {
  if (!oldTracks && !newTracks) {
    return null
  }
  if (!oldTracks || !newTracks) {
    if (!oldTracks && newTracks && newTracks.length > 0) {
      return { added: newTracks.map(format), removed: [], changed: [] }
    }
    if (oldTracks && oldTracks.length > 0 && !newTracks) {
      return { added: [], removed: oldTracks.map(format), changed: [] }
    }
    return null
  }

  const oldFormatted = oldTracks.map(format)
  const newFormatted = newTracks.map(format)

  if (JSON.stringify(oldFormatted) === JSON.stringify(newFormatted)) {
    return null
  }

  const added: string[] = []
  const removed: string[] = []
  const changed: { from: string; to: string }[] = []

  const maxLen = Math.max(oldFormatted.length, newFormatted.length)
  for (let i = 0; i < maxLen; i++) {
    const old = oldFormatted[i]
    const cur = newFormatted[i]
    if (!old && cur) {
      added.push(cur)
    } else if (old && !cur) {
      removed.push(old)
    } else if (old && cur && old !== cur) {
      changed.push({ from: old, to: cur })
    }
  }

  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    return null
  }
  return { added, removed, changed }
}

/** Секция отображения diff треков (компактная, для per-episode view) */
function TrackDiffSection({ icon, title, changes }: { icon: React.ReactNode; title: string; changes: TrackChanges }) {
  return (
    <Box>
      <HStack gap={1} mb={0.5}>
        <Icon color="orange.500" flexShrink={0} boxSize={3}>
          {icon}
        </Icon>
        <Text fontWeight="semibold" fontSize="xs">
          {title}:
        </Text>
      </HStack>
      <VStack align="stretch" gap={0.5} pl={4}>
        {changes.changed.map((c, i) => (
          <HStack key={`ch-${i}`} gap={1} fontSize="xs" flexWrap="wrap">
            <Icon color="yellow.500" flexShrink={0}>
              <LuPencil />
            </Icon>
            <Text color="red.400" textDecoration="line-through">
              {c.from}
            </Text>
            <Text>→</Text>
            <Text color="green.400">{c.to}</Text>
          </HStack>
        ))}
        {changes.added.map((t, i) => (
          <HStack key={`add-${i}`} gap={1} fontSize="xs">
            <Icon color="green.400" flexShrink={0}>
              <LuPlus />
            </Icon>
            <Text color="green.400">{t}</Text>
          </HStack>
        ))}
        {changes.removed.map((t, i) => (
          <HStack key={`rm-${i}`} gap={1} fontSize="xs">
            <Icon color="red.400" flexShrink={0}>
              <LuMinus />
            </Icon>
            <Text color="red.400" textDecoration="line-through">
              {t}
            </Text>
          </HStack>
        ))}
      </VStack>
    </Box>
  )
}
