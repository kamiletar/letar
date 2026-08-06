'use client'

/**
 * Управление аудио (музыка, синхронизация, пресеты).
 * Композитный компонент, объединяющий TrackSelector, VolumeSlider и AudioSyncControls.
 */

import { VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import type { AudioPreset } from '../../_constants/audio-presets'
import type { AudioSource, AudioSyncMode, CustomAudioTrack } from '../../_constants/viewer-constants'
import { AudioSyncControls } from './audio-sync-controls'
import { formatPercent, SliderControl } from './slider-control'
import { TrackSelector } from './track-selector'

// =============================================================================
// Типы
// =============================================================================

export interface AudioControlsProps {
  /** Музыка включена */
  audioEnabled: boolean
  /** ID текущего встроенного трека */
  audioTrack: string
  /** ID кастомного трека */
  customAudioTrackId: string | null
  /** Громкость */
  audioVolume: number
  /** Синхронизация включена */
  audioSyncEnabled: boolean
  /** Источник аудио */
  audioSource: AudioSource
  /** Пресет */
  audioPreset: AudioPreset
  /** Режим синхронизации */
  audioSyncMode: AudioSyncMode
  /** Пульсация на бит */
  beatPulseEnabled: boolean
  /** Адаптивный градиент */
  adaptiveGradientEnabled: boolean
  /** Адаптивное вращение */
  adaptiveSpinEnabled: boolean
  /** Чувствительность к басу */
  bassSensitivity: number
  /** Чувствительность к ритму */
  beatSensitivity: number
  /** Кастомные треки */
  customTracks?: CustomAudioTrack[]
  /** Callback при изменении */
  onChange: (changes: Partial<AudioControlsProps>) => void
  /** Callback для открытия менеджера треков */
  onOpenTrackManager?: () => void
  /** Callback для открытия саундскейпов */
  onOpenSoundscape?: () => void
  /** Вариант отображения */
  variant?: 'normal' | 'fullscreen'
}

// =============================================================================
// Слайдер громкости
// =============================================================================

interface VolumeSliderProps {
  volume: number
  onChange: (volume: number) => void
  variant?: 'normal' | 'fullscreen'
}

/**
 * Слайдер громкости.
 */
function VolumeSlider({ volume, onChange, variant = 'normal' }: VolumeSliderProps) {
  const isFullscreen = variant === 'fullscreen'

  return (
    <SliderControl
      label="Громкость"
      value={volume}
      onChange={onChange}
      min={0}
      max={100}
      step={5}
      colorPalette="pink"
      formatValue={formatPercent}
      variant={variant}
      hideLabel={isFullscreen}
    />
  )
}

// =============================================================================
// Главный компонент
// =============================================================================

/**
 * Полный набор аудио контролов.
 */
export function AudioControls(props: AudioControlsProps) {
  const { variant = 'normal', onChange } = props

  const handleManualChange = useCallback(
    (changes: Partial<AudioControlsProps>) => {
      onChange({
        ...changes,
        audioPreset: 'custom',
      })
    },
    [onChange],
  )

  return (
    <VStack gap={variant === 'fullscreen' ? 2 : 3} align="stretch">
      <TrackSelector
        audioTrack={props.audioTrack}
        customAudioTrackId={props.customAudioTrackId}
        customTracks={props.customTracks || []}
        onChange={onChange}
        onOpenTrackManager={props.onOpenTrackManager}
        onOpenSoundscape={props.onOpenSoundscape}
        variant={variant}
      />

      <VolumeSlider volume={props.audioVolume} onChange={(v) => onChange({ audioVolume: v })} variant={variant} />

      <AudioSyncControls
        audioSyncEnabled={props.audioSyncEnabled}
        audioSource={props.audioSource}
        audioPreset={props.audioPreset}
        audioSyncMode={props.audioSyncMode}
        beatPulseEnabled={props.beatPulseEnabled}
        adaptiveGradientEnabled={props.adaptiveGradientEnabled}
        adaptiveSpinEnabled={props.adaptiveSpinEnabled}
        bassSensitivity={props.bassSensitivity}
        beatSensitivity={props.beatSensitivity}
        onChange={onChange}
        onManualChange={handleManualChange}
        variant={variant}
      />
    </VStack>
  )
}
