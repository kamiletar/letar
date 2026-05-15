'use client'

/**
 * TrackSelector - Компонент выбора аудио/субтитров дорожек
 *
 * Позволяет пользователю выбирать:
 * - Аудиодорожку (язык, формат)
 * - Субтитры (или отключить)
 */

import { Box, Button, HStack, Icon, IconButton, Menu, Portal, Text, VStack } from '@chakra-ui/react'
import { type RefObject } from 'react'
import { LuCaptions, LuCheck, LuLanguages, LuPencil, LuTrash2, LuVolume2 } from 'react-icons/lu'

import { usePlayerContainer } from './PlayerContext'

/** Информация о дорожке */
export interface TrackInfo {
  id: string | number
  /** Название дорожки (если нет — используется getLanguageName) */
  label?: string
  /** Код языка (rus, jpn, eng, und) */
  language?: string
  codec?: string
  isDefault?: boolean
  /** Название группы озвучки (имя папки-дублёра) */
  dubGroup?: string
  /** CID в IPFS — дорожка готова к воспроизведению */
  transcodedCid?: string
}

/** Пропсы компонента TrackSelector */
export interface TrackSelectorProps {
  /** Доступные аудиодорожки */
  audioTracks: TrackInfo[]
  /** Доступные дорожки субтитров */
  subtitleTracks: TrackInfo[]
  /** ID выбранной аудиодорожки */
  selectedAudioTrack?: string | number
  /** ID выбранной дорожки субтитров (null = выключены) */
  selectedSubtitleTrack?: string | number | null
  /** Обработчик выбора аудиодорожки */
  onAudioTrackChange?: (trackId: string | number) => void
  /** Обработчик выбора субтитров */
  onSubtitleTrackChange?: (trackId: string | number | null) => void
  /** Обработчик редактирования аудиодорожки */
  onEditAudioTrack?: (trackId: string | number) => void
  /** Обработчик удаления аудиодорожки */
  onDeleteAudioTrack?: (trackId: string | number) => void
  /** Обработчик редактирования субтитров */
  onEditSubtitleTrack?: (trackId: string | number) => void
  /** Обработчик удаления субтитров */
  onDeleteSubtitleTrack?: (trackId: string | number) => void
  /**
   * Контейнер для Portal (для корректной работы в fullscreen)
   * Если не указан, используется контекст плеера или document.body
   */
  portalContainer?: RefObject<HTMLElement | null>
}

/**
 * Получить отображаемое имя языка
 */
function getLanguageName(langCode?: string): string {
  if (!langCode) {
    return 'Неизвестный'
  }

  const languageNames: Record<string, string> = {
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
    spa: 'Испанский',
    es: 'Испанский',
    ita: 'Итальянский',
    it: 'Итальянский',
    chi: 'Китайский',
    zh: 'Китайский',
    kor: 'Корейский',
    ko: 'Корейский',
    und: 'Неопределённый',
  }

  return languageNames[langCode.toLowerCase()] || langCode
}

/**
 * Форматировать название дорожки с учётом dubGroup
 *
 * Примеры:
 * - "Русский (FuegoAlma & Eladiel)" — если есть dubGroup
 * - "Русский — Перевод от Studio" — если есть label
 * - "Русский" — если только язык
 */
function formatTrackLabel(track: TrackInfo): string {
  const langName = getLanguageName(track.language)

  // Если есть dubGroup — показываем в скобках
  if (track.dubGroup && track.dubGroup !== '(root)') {
    if (track.label) {
      return `${langName} — ${track.label} (${track.dubGroup})`
    }
    return `${langName} (${track.dubGroup})`
  }

  // Если есть label — показываем через тире
  if (track.label) {
    return `${langName} — ${track.label}`
  }

  return langName
}

/**
 * Проверяет, доступна ли дорожка для воспроизведения
 * Дорожка доступна если есть transcodedCid (загружена в IPFS)
 */
function isTrackPlayable(track: TrackInfo): boolean {
  return !!track.transcodedCid
}

/**
 * TrackSelector компонент
 */
export function TrackSelector({
  audioTracks,
  subtitleTracks,
  selectedAudioTrack,
  selectedSubtitleTrack,
  onAudioTrackChange,
  onSubtitleTrackChange,
  onEditAudioTrack,
  onDeleteAudioTrack,
  onEditSubtitleTrack,
  onDeleteSubtitleTrack,
  portalContainer,
}: TrackSelectorProps) {
  // Используем контекст плеера для Portal если не передан явно
  const contextContainerRef = usePlayerContainer()
  const effectiveContainerRef = portalContainer ?? contextContainerRef

  return (
    <HStack gap={1}>
      {/* Аудиодорожки */}
      {audioTracks.length > 1 && (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button variant="ghost" colorPalette="whiteAlpha" size="sm" title="Аудиодорожка">
              <Icon as={LuVolume2} color="player.control" />
            </Button>
          </Menu.Trigger>
          <Portal container={effectiveContainerRef ?? undefined}>
            <Menu.Positioner>
              <Menu.Content bg="bg.panel" borderColor="border.subtle">
                <Box px={3} py={2} borderBottom="1px" borderColor="border.subtle">
                  <HStack gap={2}>
                    <Icon as={LuLanguages} color="fg.muted" />
                    <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                      Аудиодорожка
                    </Text>
                  </HStack>
                </Box>
                {audioTracks.map((track) => {
                  const playable = isTrackPlayable(track)
                  const isSelected = selectedAudioTrack === track.id

                  return (
                    <Menu.Item
                      key={track.id}
                      value={String(track.id)}
                      onClick={() => playable && onAudioTrackChange?.(track.id)}
                      disabled={!playable}
                      // Используем data-selected для CSS, hover из slot recipe
                      data-selected={isSelected || undefined}
                      title={
                        !playable
                          ? 'Дорожка не транскодирована. Перекодируйте эпизод для использования этой дорожки.'
                          : undefined
                      }
                      css={{
                        '&[data-selected]': {
                          bg: 'purple.700',
                          color: 'white',
                        },
                        '&[data-selected]:hover': {
                          bg: 'purple.600',
                        },
                        '&[data-disabled]': {
                          opacity: 0.5,
                          cursor: 'not-allowed',
                        },
                      }}
                    >
                      <HStack justify="space-between" w="full">
                        <VStack align="start" gap={0} flex={1}>
                          <Text fontSize="sm" color={isSelected ? 'white' : !playable ? 'fg.muted' : undefined}>
                            {formatTrackLabel(track)}
                            {!playable && ' ⚠️'}
                          </Text>
                          {track.codec && (
                            <Text fontSize="xs" color={isSelected ? 'whiteAlpha.700' : 'fg.muted'}>
                              {track.codec}
                            </Text>
                          )}
                        </VStack>
                        <HStack gap={1}>
                          {onEditAudioTrack && (
                            <IconButton
                              aria-label="Редактировать"
                              size="xs"
                              variant="ghost"
                              colorPalette="gray"
                              _hover={{ bg: 'whiteAlpha.200' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditAudioTrack(track.id)
                              }}
                            >
                              <Icon as={LuPencil} boxSize={3} />
                            </IconButton>
                          )}
                          {onDeleteAudioTrack && (
                            <IconButton
                              aria-label="Удалить"
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              _hover={{ bg: 'red.900/30' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteAudioTrack(track.id)
                              }}
                            >
                              <Icon as={LuTrash2} boxSize={3} />
                            </IconButton>
                          )}
                          {isSelected && <Icon as={LuCheck} />}
                        </HStack>
                      </HStack>
                    </Menu.Item>
                  )
                })}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      )}

      {/* Субтитры */}
      {subtitleTracks.length > 0 && (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button variant="ghost" colorPalette="whiteAlpha" size="sm" title="Субтитры">
              <Icon as={LuCaptions} color={selectedSubtitleTrack !== null ? 'purple.400' : 'player.control'} />
            </Button>
          </Menu.Trigger>
          <Portal container={effectiveContainerRef ?? undefined}>
            <Menu.Positioner>
              <Menu.Content bg="bg.panel" borderColor="border.subtle">
                <Box px={3} py={2} borderBottom="1px" borderColor="border.subtle">
                  <HStack gap={2}>
                    <Icon as={LuCaptions} color="fg.muted" />
                    <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                      Субтитры
                    </Text>
                  </HStack>
                </Box>
                {/* Опция выключения */}
                <Menu.Item
                  value="off"
                  onClick={() => onSubtitleTrackChange?.(null)}
                  data-selected={selectedSubtitleTrack === null || undefined}
                  css={{
                    '&[data-selected]': {
                      bg: 'purple.700',
                      color: 'white',
                    },
                    '&[data-selected]:hover': {
                      bg: 'purple.600',
                    },
                  }}
                >
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color={selectedSubtitleTrack === null ? 'white' : undefined}>
                      Выключены
                    </Text>
                    {selectedSubtitleTrack === null && <Icon as={LuCheck} color="white" />}
                  </HStack>
                </Menu.Item>
                {subtitleTracks.map((track) => {
                  const isSelected = selectedSubtitleTrack === track.id
                  return (
                    <Menu.Item
                      key={track.id}
                      value={String(track.id)}
                      onClick={() => onSubtitleTrackChange?.(track.id)}
                      data-selected={isSelected || undefined}
                      css={{
                        '&[data-selected]': {
                          bg: 'purple.700',
                          color: 'white',
                        },
                        '&[data-selected]:hover': {
                          bg: 'purple.600',
                        },
                      }}
                    >
                      <HStack justify="space-between" w="full">
                        <VStack align="start" gap={0} flex={1}>
                          <Text fontSize="sm" color={isSelected ? 'white' : undefined}>
                            {formatTrackLabel(track)}
                          </Text>
                          {track.codec && (
                            <Text fontSize="xs" color={isSelected ? 'whiteAlpha.700' : 'fg.muted'}>
                              {track.codec}
                            </Text>
                          )}
                        </VStack>
                        <HStack gap={1}>
                          {onEditSubtitleTrack && (
                            <IconButton
                              aria-label="Редактировать"
                              size="xs"
                              variant="ghost"
                              colorPalette="gray"
                              _hover={{ bg: 'whiteAlpha.200' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditSubtitleTrack(track.id)
                              }}
                            >
                              <Icon as={LuPencil} boxSize={3} />
                            </IconButton>
                          )}
                          {onDeleteSubtitleTrack && (
                            <IconButton
                              aria-label="Удалить"
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              _hover={{ bg: 'red.900/30' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteSubtitleTrack(track.id)
                              }}
                            >
                              <Icon as={LuTrash2} boxSize={3} />
                            </IconButton>
                          )}
                          {isSelected && <Icon as={LuCheck} />}
                        </HStack>
                      </HStack>
                    </Menu.Item>
                  )
                })}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      )}
    </HStack>
  )
}
