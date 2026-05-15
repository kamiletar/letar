'use client'

/**
 * Шаг 3: Выбор дорожек для добавления
 * Оптимизирован для производительности с 500+ дорожками
 */

import { Accordion, Badge, Box, Button, Checkbox, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { LuCaptions, LuCheck, LuMusic, LuType } from 'react-icons/lu'

import type { DonorProbeResult, EpisodeMatch, LibraryEpisode, SelectedTrack, TrackInfo } from '@/lib/add-tracks'

interface TrackSelectionStepProps {
  /** Сопоставления (только matched) */
  matches: EpisodeMatch[]
  /** Результаты пробы файлов */
  probeResults: Map<string, DonorProbeResult>
  /** Выбранные дорожки */
  selectedTracks: SelectedTrack[]
  /** Эпизоды библиотеки */
  libraryEpisodes: LibraryEpisode[]
  /** Путь к папке аниме (запасной temp dir когда folderPath=null) */
  animeFolderPath: string
  /** Обработчик выбора дорожки */
  onToggleTrack: (
    matchId: string,
    episodeId: string,
    episodeDir: string,
    type: 'audio' | 'subtitle',
    track: TrackInfo
  ) => void
  /** Выбрать все дорожки типа */
  onSelectAllOfType: (type: 'audio' | 'subtitle') => void
  /** Выбрать дорожки по языкам */
  onSelectByLanguage?: (languages: string[]) => void
  /** Снять выбор с дорожек по языкам */
  onDeselectByLanguage?: (languages: string[]) => void
}

/**
 * Получить название языка
 */
function getLanguageName(langCode: string): string {
  const names: Record<string, string> = {
    rus: 'Русский',
    ru: 'Русский',
    eng: 'Английский',
    en: 'Английский',
    jpn: 'Японский',
    ja: 'Японский',
    ger: 'Немецкий',
    de: 'Немецкий',
    fre: 'Французский',
    fr: 'Французский',
    und: 'Неизвестный',
  }
  return names[langCode.toLowerCase()] || langCode
}

/**
 * Форматирование информации о дорожке
 */
function formatTrackInfo(track: TrackInfo): string {
  const parts: string[] = []

  if (track.codec) {
    parts.push(track.codec.toUpperCase())
  }

  if (track.channels) {
    if (track.channels === 2) {
      parts.push('2.0')
    } else if (track.channels === 6) {
      parts.push('5.1')
    } else if (track.channels === 8) {
      parts.push('7.1')
    } else {
      parts.push(`${track.channels}ch`)
    }
  }

  if (track.bitrate) {
    parts.push(`${Math.round(track.bitrate / 1000)}kbps`)
  }

  return parts.join(' · ')
}

/**
 * Карточка аудиодорожки (мемоизирована)
 */
const AudioTrackCard = memo(function AudioTrackCard({
  track,
  isSelected,
  onToggle,
}: {
  track: TrackInfo
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <HStack
      gap={3}
      p={3}
      bg={isSelected ? 'primary.subtle' : 'bg.muted'}
      borderRadius="md"
      borderWidth="1px"
      borderColor={isSelected ? 'primary.solid' : 'border'}
      cursor="pointer"
      onClick={onToggle}
      transition="all 0.1s ease-out"
      _hover={{ borderColor: isSelected ? 'primary.fg' : 'border.muted' }}
      _active={{ transform: 'scale(0.98)', bg: isSelected ? 'primary.muted' : 'bg.emphasized' }}
    >
      <Checkbox.Root checked={isSelected}>
        <Checkbox.HiddenInput />
        <Checkbox.Control
          cursor="pointer"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
        >
          <Checkbox.Indicator>
            <LuCheck />
          </Checkbox.Indicator>
        </Checkbox.Control>
      </Checkbox.Root>

      <Icon as={LuMusic} color="accent.fg" boxSize={5} />

      <VStack align="start" gap={0} flex={1}>
        <HStack gap={2}>
          <Text fontSize="sm" fontWeight="medium" color="fg">
            {getLanguageName(track.language)}
          </Text>
          {track.title && track.title !== getLanguageName(track.language) && (
            <Text fontSize="sm" color="fg.muted">
              — {track.title}
            </Text>
          )}
        </HStack>
        <Text fontSize="xs" color="fg.subtle">
          {formatTrackInfo(track)}
        </Text>
      </VStack>

      {track.dubGroup && track.dubGroup !== '(root)' && (
        <Badge colorPalette="purple" variant="subtle" size="sm">
          {track.dubGroup}
        </Badge>
      )}
      {track.isExternal && !track.dubGroup && (
        <Badge colorPalette="blue" variant="subtle" size="sm">
          Внешний
        </Badge>
      )}
    </HStack>
  )
})

/**
 * Карточка субтитров (мемоизирована)
 */
const SubtitleTrackCard = memo(function SubtitleTrackCard({
  track,
  isSelected,
  onToggle,
}: {
  track: TrackInfo
  isSelected: boolean
  onToggle: () => void
}) {
  const hasFonts = track.matchedFonts && track.matchedFonts.length > 0

  return (
    <HStack
      gap={3}
      p={3}
      bg={isSelected ? 'success.subtle' : 'bg.muted'}
      borderRadius="md"
      borderWidth="1px"
      borderColor={isSelected ? 'success.solid' : 'border'}
      cursor="pointer"
      onClick={onToggle}
      transition="all 0.1s ease-out"
      _hover={{ borderColor: isSelected ? 'success.fg' : 'border.muted' }}
      _active={{ transform: 'scale(0.98)', bg: isSelected ? 'success.muted' : 'bg.emphasized' }}
    >
      <Checkbox.Root checked={isSelected}>
        <Checkbox.HiddenInput />
        <Checkbox.Control
          cursor="pointer"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
        >
          <Checkbox.Indicator>
            <LuCheck />
          </Checkbox.Indicator>
        </Checkbox.Control>
      </Checkbox.Root>

      <Icon as={LuCaptions} color="success.fg" boxSize={5} />

      <VStack align="start" gap={0} flex={1}>
        <HStack gap={2}>
          <Text fontSize="sm" fontWeight="medium" color="fg">
            {getLanguageName(track.language)}
          </Text>
          {track.title && track.title !== getLanguageName(track.language) && (
            <Text fontSize="sm" color="fg.muted">
              — {track.title}
            </Text>
          )}
        </HStack>
        <HStack gap={2}>
          <Text fontSize="xs" color="fg.subtle">
            {track.format?.toUpperCase() || 'SUB'}
          </Text>
          {hasFonts && (
            <HStack gap={1}>
              <Icon as={LuType} boxSize={3} color="fg.subtle" />
              <Text fontSize="xs" color="fg.subtle">
                {(track.matchedFonts ?? []).length} шрифт{(track.matchedFonts ?? []).length > 1 ? 'а' : ''}
              </Text>
            </HStack>
          )}
        </HStack>
      </VStack>

      {track.isExternal && (
        <Badge colorPalette="green" variant="subtle" size="sm">
          Внешний
        </Badge>
      )}
    </HStack>
  )
})

/**
 * Wrapper для AudioTrackCard с мемоизированным обработчиком
 */
const AudioTrackRow = memo(function AudioTrackRow({
  track,
  matchId,
  episodeId,
  episodeDir,
  isSelected,
  onToggleTrack,
}: {
  track: TrackInfo
  matchId: string
  episodeId: string
  episodeDir: string
  isSelected: boolean
  onToggleTrack: TrackSelectionStepProps['onToggleTrack']
}) {
  const handleToggle = useCallback(() => {
    onToggleTrack(matchId, episodeId, episodeDir, 'audio', track)
  }, [matchId, episodeId, episodeDir, track, onToggleTrack])

  return <AudioTrackCard track={track} isSelected={isSelected} onToggle={handleToggle} />
})

/**
 * Wrapper для SubtitleTrackCard с мемоизированным обработчиком
 */
const SubtitleTrackRow = memo(function SubtitleTrackRow({
  track,
  matchId,
  episodeId,
  episodeDir,
  isSelected,
  onToggleTrack,
}: {
  track: TrackInfo
  matchId: string
  episodeId: string
  episodeDir: string
  isSelected: boolean
  onToggleTrack: TrackSelectionStepProps['onToggleTrack']
}) {
  const handleToggle = useCallback(() => {
    onToggleTrack(matchId, episodeId, episodeDir, 'subtitle', track)
  }, [matchId, episodeId, episodeDir, track, onToggleTrack])

  return <SubtitleTrackCard track={track} isSelected={isSelected} onToggle={handleToggle} />
})

/**
 * Шаг выбора дорожек
 */
export function TrackSelectionStep({
  matches,
  probeResults,
  selectedTracks,
  libraryEpisodes,
  animeFolderPath,
  onToggleTrack,
  onSelectAllOfType,
  onSelectByLanguage,
  onDeselectByLanguage,
}: TrackSelectionStepProps) {
  // O(1) поиск выбранных дорожек вместо O(n) .some()
  const selectedTrackIds = useMemo(() => new Set(selectedTracks.map((t) => t.track.id)), [selectedTracks])

  // Фильтруем только matched
  const matchedFiles = matches.filter((m) => m.targetEpisode !== null)

  // Считаем выбранные
  const selectedAudioCount = selectedTracks.filter((t) => t.type === 'audio').length
  const selectedSubtitleCount = selectedTracks.filter((t) => t.type === 'subtitle').length

  // Примечание: общий подсчёт дорожек вычисляется в JSX через totalAudioCount

  return (
    <VStack gap={4} align="stretch" py={4}>
      {/* Кнопки быстрого выбора */}
      <HStack justify="space-between" px={2} flexWrap="wrap" gap={2}>
        <HStack gap={2} flexWrap="wrap">
          <Button size="sm" variant="outline" onClick={() => onSelectAllOfType('audio')}>
            <Icon as={LuMusic} mr={1} />
            Все аудио
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSelectAllOfType('subtitle')}>
            <Icon as={LuCaptions} mr={1} />
            Все субтитры
          </Button>
          {onSelectByLanguage && (
            <Button
              size="sm"
              variant="ghost"
              colorPalette="green"
              onClick={() => onSelectByLanguage(['eng', 'en', 'rus', 'ru'])}
            >
              +eng/rus
            </Button>
          )}
          {onDeselectByLanguage && (
            <Button size="sm" variant="ghost" colorPalette="red" onClick={() => onDeselectByLanguage(['jpn', 'ja'])}>
              −jpn
            </Button>
          )}
        </HStack>

        <Text fontSize="sm" color="fg.muted">
          Выбрано: {selectedAudioCount} аудио, {selectedSubtitleCount} субтитров
        </Text>
      </HStack>

      {/* Аккордеон по эпизодам */}
      <Accordion.Root multiple defaultValue={matchedFiles.slice(0, 3).map((m) => m.donorFile.path)}>
        {matchedFiles.map((match) => {
          const probe = probeResults.get(match.donorFile.path)
          const targetEp = match.targetEpisode
          if (!probe || !targetEp) {
            return null
          }

          const episode = libraryEpisodes.find((ep) => ep.id === targetEp.id)
          // Используем folderPath эпизода; если null (IPFS-режим) — используем папку аниме как temp
          const episodeDir = episode?.folderPath || animeFolderPath

          // Встроенные аудио (из MKV)
          const embeddedAudio = probe.audioTracks.filter((t) => !t.isExternal)
          // Внешние аудио по группам
          const externalAudioGroups = probe.externalAudioByGroup
          // Общее количество аудио
          const totalAudioCount = embeddedAudio.length + Array.from(externalAudioGroups.values()).flat().length
          const subtitleTracks = [...probe.subtitleTracks, ...probe.externalSubtitles]

          const selectedForEpisode = selectedTracks.filter((t) => t.matchId === match.donorFile.path)

          return (
            <Accordion.Item key={match.donorFile.path} value={match.donorFile.path}>
              <Accordion.ItemTrigger>
                <HStack flex={1} justify="space-between" pr={4}>
                  <Text fontWeight="medium">Эпизод {targetEp.number}</Text>
                  <HStack gap={4}>
                    <HStack gap={1}>
                      <Icon as={LuMusic} color="accent.fg" boxSize={4} />
                      <Text fontSize="sm" color="fg.muted">
                        {totalAudioCount}
                      </Text>
                    </HStack>
                    <HStack gap={1}>
                      <Icon as={LuCaptions} color="success.fg" boxSize={4} />
                      <Text fontSize="sm" color="fg.muted">
                        {subtitleTracks.length}
                      </Text>
                    </HStack>
                    {selectedForEpisode.length > 0 && (
                      <Badge colorPalette="purple" size="sm">
                        {selectedForEpisode.length} выбрано
                      </Badge>
                    )}
                  </HStack>
                </HStack>
                <Accordion.ItemIndicator />
              </Accordion.ItemTrigger>

              <Accordion.ItemContent>
                <Box pb={4}>
                  <VStack gap={4} align="stretch">
                    {/* Встроенные аудио из MKV */}
                    {embeddedAudio.length > 0 && (
                      <VStack align="stretch" gap={2}>
                        <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                          Аудио из MKV
                        </Text>
                        {embeddedAudio.map((track) => (
                          <AudioTrackRow
                            key={track.id}
                            track={track}
                            matchId={match.donorFile.path}
                            episodeId={targetEp.id}
                            episodeDir={episodeDir}
                            isSelected={selectedTrackIds.has(track.id)}
                            onToggleTrack={onToggleTrack}
                          />
                        ))}
                      </VStack>
                    )}

                    {/* Внешние аудио по группам озвучки */}
                    {externalAudioGroups.size > 0 && (
                      <VStack align="stretch" gap={3}>
                        <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                          Внешние озвучки
                        </Text>
                        {Array.from(externalAudioGroups.entries()).map(([groupName, tracks]) => (
                          <Box key={groupName} borderWidth="1px" borderColor="border" borderRadius="md" p={3}>
                            <HStack mb={2}>
                              <Text fontSize="sm" fontWeight="medium" color="primary.fg">
                                {groupName}
                              </Text>
                              <Badge colorPalette="purple" size="sm">
                                {tracks.length}
                              </Badge>
                            </HStack>
                            <VStack gap={2} align="stretch">
                              {tracks.map((track) => (
                                <AudioTrackRow
                                  key={track.id}
                                  track={track}
                                  matchId={match.donorFile.path}
                                  episodeId={targetEp.id}
                                  episodeDir={episodeDir}
                                  isSelected={selectedTrackIds.has(track.id)}
                                  onToggleTrack={onToggleTrack}
                                />
                              ))}
                            </VStack>
                          </Box>
                        ))}
                      </VStack>
                    )}

                    {/* Субтитры */}
                    {subtitleTracks.length > 0 && (
                      <VStack align="stretch" gap={2}>
                        <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                          Субтитры
                        </Text>
                        {subtitleTracks.map((track) => (
                          <SubtitleTrackRow
                            key={track.id}
                            track={track}
                            matchId={match.donorFile.path}
                            episodeId={targetEp.id}
                            episodeDir={episodeDir}
                            isSelected={selectedTrackIds.has(track.id)}
                            onToggleTrack={onToggleTrack}
                          />
                        ))}
                      </VStack>
                    )}

                    {totalAudioCount === 0 && subtitleTracks.length === 0 && (
                      <Text fontSize="sm" color="fg.subtle" textAlign="center" py={4}>
                        Дорожки не найдены
                      </Text>
                    )}
                  </VStack>
                </Box>
              </Accordion.ItemContent>
            </Accordion.Item>
          )
        })}
      </Accordion.Root>

      {/* Подсказка */}
      <Text fontSize="sm" color="fg.subtle" textAlign="center">
        Выберите дорожки, которые хотите добавить к эпизодам.
      </Text>
    </VStack>
  )
}
