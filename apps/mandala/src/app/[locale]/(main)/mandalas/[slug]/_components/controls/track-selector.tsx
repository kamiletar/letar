'use client'

/**
 * Селектор трека для аудио плеера.
 */

import { HStack, IconButton, NativeSelect, Text } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'
import { LuLayoutGrid } from 'react-icons/lu'
import { type CustomAudioTrack, MEDITATION_TRACKS } from '../../_constants/viewer-constants'

// =============================================================================
// Типы
// =============================================================================

export interface TrackSelectorProps {
  /** ID текущего встроенного трека */
  audioTrack: string
  /** ID кастомного трека */
  customAudioTrackId: string | null
  /** Список кастомных треков */
  customTracks: CustomAudioTrack[]
  /** Callback при изменении трека */
  onChange: (changes: { audioTrack?: string; customAudioTrackId?: string | null }) => void
  /** Callback для открытия менеджера треков */
  onOpenTrackManager?: () => void
  /** Callback для открытия саундскейпов */
  onOpenSoundscape?: () => void
  /** Вариант отображения */
  variant?: 'normal' | 'fullscreen'
}

// =============================================================================
// Хелперы
// =============================================================================

/**
 * Хук для работы с треками (комбинирование builtin/custom).
 */
function useTrackValue(audioTrack: string, customAudioTrackId: string | null) {
  return useMemo(() => {
    if (customAudioTrackId) {
      return `custom:${customAudioTrackId}`
    }
    return `builtin:${audioTrack}`
  }, [customAudioTrackId, audioTrack])
}

// =============================================================================
// Компонент
// =============================================================================

/**
 * Селектор трека с кнопками управления.
 */
export function TrackSelector({
  audioTrack,
  customAudioTrackId,
  customTracks,
  onChange,
  onOpenTrackManager,
  onOpenSoundscape,
  variant = 'normal',
}: TrackSelectorProps) {
  const t = useTranslations('viewer.aria')
  const currentTrackValue = useTrackValue(audioTrack, customAudioTrackId)
  const isFullscreen = variant === 'fullscreen'

  const handleTrackChange = useCallback(
    (value: string) => {
      const [type, id] = value.split(':')
      if (type === 'custom') {
        onChange({ customAudioTrackId: id, audioTrack: 'none' })
      } else {
        onChange({ customAudioTrackId: null, audioTrack: id })
      }
    },
    [onChange],
  )

  return (
    <HStack gap={2}>
      <NativeSelect.Root size={isFullscreen ? 'sm' : 'md'} flex={1}>
        <NativeSelect.Field
          value={currentTrackValue}
          onChange={(e) => handleTrackChange(e.target.value)}
          color={isFullscreen ? 'white' : undefined}
          css={isFullscreen ? { '& option, & optgroup': { color: 'black' } } : undefined}
        >
          <optgroup label="Встроенные">
            {MEDITATION_TRACKS.map((track) => (
              <option key={track.id} value={`builtin:${track.id}`}>
                {track.name}
              </option>
            ))}
          </optgroup>
          {customTracks.length > 0 && (
            <optgroup label="Мои треки">
              {customTracks.map((track) => (
                <option key={track.id} value={`custom:${track.id}`}>
                  {track.name}
                </option>
              ))}
            </optgroup>
          )}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      {onOpenSoundscape && isFullscreen && (
        <Tooltip content={t('selectSoundscape')}>
          <IconButton
            aria-label={t('selectSoundscape')}
            size="sm"
            variant="ghost"
            colorPalette="pink"
            onClick={onOpenSoundscape}
          >
            <LuLayoutGrid />
          </IconButton>
        </Tooltip>
      )}

      {onOpenTrackManager && (
        <Tooltip content={t('manageTracks')}>
          <IconButton
            aria-label={t('manageTracks')}
            size="sm"
            variant={isFullscreen ? 'ghost' : 'outline'}
            colorPalette="pink"
            onClick={onOpenTrackManager}
          >
            <Text fontSize="lg">+</Text>
          </IconButton>
        </Tooltip>
      )}
    </HStack>
  )
}
