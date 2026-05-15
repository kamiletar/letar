'use client'

/**
 * TrackSelector — выбор аудиодорожки и субтитров
 */

import { Badge, Box, HStack, IconButton, Text } from '@chakra-ui/react'
import type { ManifestAudioTrack, ManifestSubtitleTrack } from '@letar/animatrona-types'
import { useCallback, useState } from 'react'
import { LuVolume2 as AudioIcon, LuCaptions as SubtitleIcon } from 'react-icons/lu'

/** Проверяет, являются ли субтитры "надписями" (signs) */
function isSignsSubtitle(track: { title: string; dubGroup?: string }): boolean {
  const title = track.title.toLowerCase()
  const dubGroup = track.dubGroup?.toLowerCase() || ''
  return title.includes('sign') || title.includes('надпис') || dubGroup.includes('sign') || dubGroup.includes('надпис')
}

export interface TrackSelectorProps {
  /** Список аудиодорожек */
  audioTracks: ManifestAudioTrack[]
  /** Индекс текущей аудиодорожки */
  audioTrackIndex: number
  /** Смена аудиодорожки */
  onAudioChange: (index: number) => void
  /** Список субтитров */
  subtitleTracks: ManifestSubtitleTrack[]
  /** Индекс текущих субтитров (-1 = выкл) */
  subtitleTrackIndex: number
  /** Смена субтитров */
  onSubtitleChange: (index: number) => void
}

export function TrackSelector({
  audioTracks,
  audioTrackIndex,
  onAudioChange,
  subtitleTracks,
  subtitleTrackIndex,
  onSubtitleChange,
}: TrackSelectorProps) {
  const [showPanel, setShowPanel] = useState<'audio' | 'subtitle' | null>(null)

  const togglePanel = useCallback((panel: 'audio' | 'subtitle') => {
    setShowPanel((prev) => (prev === panel ? null : panel))
  }, [])

  const hasMultipleAudio = audioTracks.length > 1
  const hasSubtitles = subtitleTracks.length > 0

  if (!hasMultipleAudio && !hasSubtitles) {
    return null
  }

  return (
    <Box position="relative">
      <HStack gap={0}>
        {/* Кнопка аудиодорожек */}
        {hasMultipleAudio && (
          <IconButton
            aria-label="Аудиодорожки"
            size="sm"
            variant="ghost"
            color={showPanel === 'audio' ? 'purple.300' : 'white'}
            onClick={() => togglePanel('audio')}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            <AudioIcon />
          </IconButton>
        )}

        {/* Кнопка субтитров */}
        {hasSubtitles && (
          <IconButton
            aria-label="Субтитры"
            size="sm"
            variant="ghost"
            color={showPanel === 'subtitle' ? 'purple.300' : subtitleTrackIndex >= 0 ? 'purple.300' : 'white'}
            onClick={() => togglePanel('subtitle')}
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            <SubtitleIcon />
          </IconButton>
        )}
      </HStack>

      {/* Невидимый оверлей для закрытия по click outside */}
      {showPanel && <Box position="fixed" inset={0} zIndex={19} onClick={() => setShowPanel(null)} />}

      {/* Панель выбора */}
      {showPanel && (
        <Box
          position="absolute"
          top="100%"
          right={0}
          mt={2}
          bg="gray.900"
          border="1px solid"
          borderColor="gray.700"
          borderRadius="md"
          py={1}
          minW="260px"
          maxW="320px"
          maxH="300px"
          overflowY="auto"
          zIndex={20}
        >
          {showPanel === 'audio' && (
            <Box>
              <Text px={3} py={1} fontSize="xs" color="gray.400" fontWeight="bold">
                Озвучка
              </Text>
              {audioTracks.map((track, i) => {
                const isAvailable = !!track.cid
                return (
                  <Box
                    key={track.id}
                    px={3}
                    py={1.5}
                    cursor={isAvailable ? 'pointer' : 'not-allowed'}
                    bg={i === audioTrackIndex ? 'whiteAlpha.100' : 'transparent'}
                    color={!isAvailable ? 'gray.600' : i === audioTrackIndex ? 'purple.300' : 'white'}
                    _hover={isAvailable ? { bg: 'whiteAlpha.200' } : undefined}
                    opacity={isAvailable ? 1 : 0.5}
                    onClick={() => {
                      if (!isAvailable) {
                        return
                      }
                      onAudioChange(i)
                      setShowPanel(null)
                    }}
                    title={track.title}
                  >
                    <Text fontSize="sm" lineClamp={2}>
                      {track.title}
                      {track.dubGroup && track.dubGroup !== track.title && ` (${track.dubGroup})`}
                      {!isAvailable && ' (нет файла)'}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {track.language} · {track.codec} {track.channels}
                    </Text>
                  </Box>
                )
              })}
            </Box>
          )}

          {showPanel === 'subtitle' && (
            <Box>
              <Text px={3} py={1} fontSize="xs" color="gray.400" fontWeight="bold">
                Субтитры
              </Text>
              {/* Выкл */}
              <Box
                px={3}
                py={1.5}
                cursor="pointer"
                bg={subtitleTrackIndex === -1 ? 'whiteAlpha.100' : 'transparent'}
                color={subtitleTrackIndex === -1 ? 'purple.300' : 'white'}
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={() => {
                  onSubtitleChange(-1)
                  setShowPanel(null)
                }}
              >
                <Text fontSize="sm">Выключены</Text>
              </Box>
              {subtitleTracks.map((track, i) => {
                const isAvailable = !!track.cid
                return (
                  <Box
                    key={track.id}
                    px={3}
                    py={1.5}
                    cursor={isAvailable ? 'pointer' : 'not-allowed'}
                    bg={i === subtitleTrackIndex ? 'whiteAlpha.100' : 'transparent'}
                    color={!isAvailable ? 'gray.600' : i === subtitleTrackIndex ? 'purple.300' : 'white'}
                    _hover={isAvailable ? { bg: 'whiteAlpha.200' } : undefined}
                    opacity={isAvailable ? 1 : 0.5}
                    title={track.title}
                    onClick={() => {
                      if (!isAvailable) {
                        return
                      }
                      onSubtitleChange(i)
                      setShowPanel(null)
                    }}
                  >
                    <HStack gap={1.5}>
                      <Text fontSize="sm" lineClamp={2}>
                        {track.title}
                        {track.dubGroup && track.dubGroup !== track.title && ` (${track.dubGroup})`}
                        {!isAvailable && ' (нет файла)'}
                      </Text>
                      <Badge size="xs" variant="subtle" colorPalette={isSignsSubtitle(track) ? 'yellow' : 'green'}>
                        {isSignsSubtitle(track) ? 'надписи' : 'полные'}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      {track.language} · {track.format}
                    </Text>
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
