/**
 * Сайдбар со списком эпизодов для папочного режима плеера
 */

import {
  Badge,
  Box,
  Button,
  Collapsible,
  Flex,
  HStack,
  Icon,
  IconButton,
  Progress,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import {
  LuChevronDown,
  LuChevronRight,
  LuFilm,
  LuFolder,
  LuLibrary,
  LuMusic,
  LuPlay,
  LuStar,
  LuTv,
  LuX,
} from 'react-icons/lu'

import type { FolderEpisode } from '../types'

/** Пропсы компонента */
interface EpisodeSidebarProps {
  /** Название папки */
  folderName: string | null
  /** Основные эпизоды */
  episodes: FolderEpisode[]
  /** Бонусные видео */
  bonusVideos: FolderEpisode[]
  /** Индекс текущего эпизода */
  currentIndex: number
  /** Текущее видео — бонус */
  isCurrentBonus: boolean
  /** Индекс текущего бонуса */
  currentBonusIndex: number
  /** Функция получения прогресса (0-100) */
  getProgressPercent: (path: string) => number
  /** Выбор эпизода */
  onSelectEpisode: (index: number) => void
  /** Выбор бонуса */
  onSelectBonus: (index: number) => void
  /** Закрытие сайдбара */
  onClose: () => void
  /** Сайдбар свёрнут */
  isCollapsed: boolean
  /** Переключение сворачивания */
  onToggleCollapse: () => void
  /** Импорт в библиотеку */
  onImportToLibrary?: () => void
}

/** Форматирование размера файла */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** Сокращение имени файла */
function truncateName(name: string, maxLength = 35): string {
  // Убираем расширение
  const nameWithoutExt = name.replace(/\.[^.]+$/, '')
  if (nameWithoutExt.length <= maxLength) {
    return nameWithoutExt
  }
  return nameWithoutExt.slice(0, maxLength - 3) + '...'
}

/**
 * Находит общий префикс для массива имён файлов
 * Например: ["2002 - Robin - S01E01.mkv", "2002 - Robin - S01E02.mkv"] -> "2002 - Robin - "
 */
function findCommonPrefix(names: string[]): string {
  if (names.length <= 1) {
    return ''
  } // Для одного файла не убираем префикс

  // Убираем расширения для сравнения
  const namesWithoutExt = names.map((n) => n.replace(/\.[^.]+$/, ''))
  const first = namesWithoutExt[0]
  let prefixLength = 0

  for (let i = 0; i < first.length; i++) {
    const char = first[i]
    if (namesWithoutExt.every((name) => name[i] === char)) {
      prefixLength++
    } else {
      break
    }
  }

  // Не убираем слишком короткий префикс (меньше 5 символов)
  if (prefixLength < 5) {
    return ''
  }

  return first.slice(0, prefixLength)
}

/**
 * Получает отображаемое имя эпизода, убирая общий префикс
 */
function getDisplayName(name: string, commonPrefix: string, episodeNumber: number | null): string {
  // Убираем расширение
  const nameWithoutExt = name.replace(/\.[^.]+$/, '')

  // Убираем общий префикс
  let displayName = commonPrefix ? nameWithoutExt.slice(commonPrefix.length).trim() : nameWithoutExt

  // Убираем начальные разделители (-, _, .)
  displayName = displayName.replace(/^[\s\-_.]+/, '')

  // Если осталось что-то осмысленное — используем
  if (displayName.length > 0 && displayName.length <= 40) {
    return displayName
  }

  // Fallback на номер эпизода если есть
  if (episodeNumber !== null) {
    return `Эпизод ${episodeNumber}`
  }

  // Последний fallback — обрезанное имя
  return truncateName(nameWithoutExt)
}

/** Получение бейджа типа эпизода */
function getEpisodeTypeBadge(type: string): { label: string; colorPalette: string } | null {
  switch (type) {
    case 'ova':
      return { label: 'OVA', colorPalette: 'purple' }
    case 'special':
      return { label: 'SP', colorPalette: 'orange' }
    case 'movie':
      return { label: 'Фильм', colorPalette: 'blue' }
    default:
      return null
  }
}

/** Элемент списка эпизодов */
const EpisodeItem = memo(function EpisodeItem({
  episode,
  index,
  isActive,
  progressPercent,
  commonPrefix,
  onSelect,
}: {
  episode: FolderEpisode
  index: number
  isActive: boolean
  progressPercent: number
  /** Общий префикс имён файлов для удаления */
  commonPrefix: string
  onSelect: () => void
}) {
  const typeBadge = getEpisodeTypeBadge(episode.episodeType)
  const displayName = getDisplayName(episode.name, commonPrefix, episode.episodeNumber)

  return (
    <Box
      as="button"
      w="full"
      textAlign="left"
      px={3}
      py={2}
      borderRadius="md"
      bg={isActive ? 'brand.500/20' : 'transparent'}
      _hover={{ bg: isActive ? 'brand.500/30' : 'whiteAlpha.100' }}
      _active={{ transform: 'scale(0.98)' }}
      transition="all 0.15s ease-out"
      onClick={onSelect}
      cursor="pointer"
    >
      <HStack gap={2} align="start">
        {/* Индикатор воспроизведения */}
        <Box w={5} h={5} flexShrink={0} mt={0.5}>
          {isActive ? (
            <Icon as={LuPlay} color="brand.400" boxSize={5} />
          ) : (
            <Text fontSize="sm" color="fg.subtle" fontWeight="medium" textAlign="center">
              {episode.episodeNumber ?? index + 1}
            </Text>
          )}
        </Box>

        {/* Информация об эпизоде */}
        <VStack align="start" gap={0.5} flex={1} minW={0}>
          <HStack gap={1.5} w="full">
            <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'normal'} color="fg" truncate flex={1}>
              {displayName}
            </Text>
            {typeBadge && (
              <Badge size="xs" colorPalette={typeBadge.colorPalette}>
                {typeBadge.label}
              </Badge>
            )}
          </HStack>

          {/* Прогресс-бар */}
          {progressPercent > 0 && (
            <Progress.Root
              value={progressPercent}
              size="xs"
              colorPalette={progressPercent >= 90 ? 'green' : 'brand'}
              w="full"
            >
              <Progress.Track bg="whiteAlpha.200" h="2px">
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          )}

          {/* Размер файла */}
          <Text fontSize="xs" color="fg.subtle">
            {formatFileSize(episode.size)}
          </Text>
        </VStack>
      </HStack>
    </Box>
  )
})

/** Элемент списка бонусов */
const BonusItem = memo(function BonusItem({
  bonus,
  index: _index,
  isActive,
  onSelect,
}: {
  bonus: FolderEpisode
  index: number
  isActive: boolean
  onSelect: () => void
}) {
  // Определяем иконку по названию
  const lowerName = bonus.name.toLowerCase()
  let ItemIcon = LuFilm
  if (lowerName.includes('op') || lowerName.includes('opening')) {
    ItemIcon = LuMusic
  } else if (lowerName.includes('ed') || lowerName.includes('ending')) {
    ItemIcon = LuMusic
  } else if (lowerName.includes('pv') || lowerName.includes('trailer')) {
    ItemIcon = LuStar
  }

  return (
    <Box
      as="button"
      w="full"
      textAlign="left"
      px={3}
      py={1.5}
      borderRadius="md"
      bg={isActive ? 'orange.500/20' : 'transparent'}
      _hover={{ bg: isActive ? 'orange.500/30' : 'whiteAlpha.100' }}
      _active={{ transform: 'scale(0.98)' }}
      transition="all 0.15s ease-out"
      onClick={onSelect}
      cursor="pointer"
    >
      <HStack gap={2}>
        <Icon as={ItemIcon} color={isActive ? 'orange.400' : 'fg.subtle'} boxSize={4} />
        <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'normal'} color={isActive ? 'fg' : 'fg'} truncate>
          {truncateName(bonus.name, 30)}
        </Text>
      </HStack>
    </Box>
  )
})

/**
 * Сайдбар со списком эпизодов
 */
export const EpisodeSidebar = memo(function EpisodeSidebar({
  folderName,
  episodes,
  bonusVideos,
  currentIndex,
  isCurrentBonus,
  currentBonusIndex,
  getProgressPercent,
  onSelectEpisode,
  onSelectBonus,
  onClose,
  isCollapsed,
  onToggleCollapse: _onToggleCollapse,
  onImportToLibrary,
}: EpisodeSidebarProps) {
  // Вычисляем общий префикс для всех эпизодов
  const commonPrefix = useMemo(() => {
    return findCommonPrefix(episodes.map((ep) => ep.name))
  }, [episodes])

  if (isCollapsed) {
    return null
  }

  return (
    <Box
      w="280px"
      h="full"
      minH={0}
      bg="bg.panel"
      borderRight="1px"
      borderColor="border.subtle"
      display="flex"
      flexDirection="column"
      flexShrink={0}
    >
      {/* Заголовок */}
      <Flex px={3} py={2} borderBottom="1px" borderColor="border.subtle" align="center" gap={2}>
        <Icon as={LuFolder} color="brand.400" boxSize={5} />
        <Text fontSize="sm" fontWeight="semibold" color="fg" flex={1} truncate title={folderName ?? 'Папка'}>
          {folderName ?? 'Папка'}
        </Text>
        {onImportToLibrary && (
          <Button size="xs" variant="outline" colorPalette="blue" onClick={onImportToLibrary}>
            <Icon as={LuLibrary} mr={1} />
            Импорт
          </Button>
        )}
        <IconButton aria-label="Закрыть список" size="xs" variant="ghost" onClick={onClose}>
          <Icon as={LuX} />
        </IconButton>
      </Flex>

      {/* Список эпизодов */}
      <Box
        flex={1}
        minH={0}
        overflowY="auto"
        py={2}
        css={{
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: 'var(--chakra-colors-border-subtle)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'var(--chakra-colors-fg-subtle)',
          },
        }}
      >
        {/* Секция эпизодов */}
        {episodes.length > 0 && (
          <Box mb={2}>
            <HStack px={3} py={1} color="fg.muted">
              <Icon as={LuTv} boxSize={4} />
              <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase">
                Эпизоды ({episodes.length})
              </Text>
            </HStack>

            <VStack align="stretch" gap={0.5} px={1}>
              {episodes.map((ep, idx) => (
                <EpisodeItem
                  key={ep.path}
                  episode={ep}
                  index={idx}
                  isActive={!isCurrentBonus && currentIndex === idx}
                  progressPercent={getProgressPercent(ep.path)}
                  commonPrefix={commonPrefix}
                  onSelect={() => onSelectEpisode(idx)}
                />
              ))}
            </VStack>
          </Box>
        )}

        {/* Секция бонусов (collapsible) */}
        {bonusVideos.length > 0 && (
          <Collapsible.Root defaultOpen={false}>
            <Collapsible.Trigger asChild>
              <Box
                as="button"
                w="full"
                px={3}
                py={1}
                display="flex"
                alignItems="center"
                gap={2}
                color="fg.muted"
                _hover={{ color: 'fg' }}
                cursor="pointer"
              >
                <Icon as={LuStar} boxSize={4} />
                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" flex={1} textAlign="left">
                  Бонусы ({bonusVideos.length})
                </Text>
                <Collapsible.Context>
                  {({ open }) => <Icon as={open ? LuChevronDown : LuChevronRight} boxSize={4} />}
                </Collapsible.Context>
              </Box>
            </Collapsible.Trigger>

            <Collapsible.Content>
              <VStack align="stretch" gap={0.5} px={1} pt={1}>
                {bonusVideos.map((bonus, idx) => (
                  <BonusItem
                    key={bonus.path}
                    bonus={bonus}
                    index={idx}
                    isActive={isCurrentBonus && currentBonusIndex === idx}
                    onSelect={() => onSelectBonus(idx)}
                  />
                ))}
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>
        )}

        {/* Пустое состояние */}
        {episodes.length === 0 && bonusVideos.length === 0 && (
          <VStack py={8} px={4} color="fg.subtle">
            <Icon as={LuFolder} boxSize={8} />
            <Text fontSize="sm" textAlign="center">
              Видеофайлы не найдены
            </Text>
          </VStack>
        )}
      </Box>
    </Box>
  )
})
