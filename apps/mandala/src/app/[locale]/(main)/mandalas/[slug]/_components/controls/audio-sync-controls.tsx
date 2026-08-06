'use client'

/**
 * Контролы синхронизации с музыкой.
 */

import { Box, HStack, NativeSelect, Text, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import {
  AUDIO_PRESET_CONFIGS,
  AUDIO_PRESET_DESCRIPTIONS,
  AUDIO_PRESET_LABELS,
  AUDIO_PRESETS,
  type AudioPreset,
} from '../../_constants/audio-presets'
import {
  AUDIO_SOURCE_LABELS,
  AUDIO_SOURCES,
  AUDIO_SYNC_MODE_LABELS,
  AUDIO_SYNC_MODES,
  type AudioSource,
  type AudioSyncMode,
} from '../../_constants/viewer-constants'
import { formatPercent, SliderControl } from './slider-control'
import { ToggleControl } from './toggle-control'

// =============================================================================
// Типы
// =============================================================================

export interface AudioSyncControlsProps {
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
  /** Callback при изменении (применяет пресет) */
  onChange: (changes: Partial<AudioSyncControlsProps>) => void
  /** Callback при ручном изменении (переключает на custom пресет) */
  onManualChange: (changes: Partial<AudioSyncControlsProps>) => void
  /** Вариант отображения */
  variant?: 'normal' | 'fullscreen'
}

// =============================================================================
// Компонент
// =============================================================================

/**
 * Контролы синхронизации с музыкой.
 */
export function AudioSyncControls({
  audioSyncEnabled,
  audioSource,
  audioPreset,
  audioSyncMode,
  beatPulseEnabled,
  adaptiveGradientEnabled,
  adaptiveSpinEnabled,
  bassSensitivity,
  beatSensitivity,
  onChange,
  onManualChange,
  variant = 'normal',
}: AudioSyncControlsProps) {
  const isFullscreen = variant === 'fullscreen'

  const handlePresetChange = useCallback(
    (preset: AudioPreset) => {
      if (preset === 'custom') {
        onChange({ audioPreset: 'custom' })
      } else {
        const config = AUDIO_PRESET_CONFIGS[preset]
        onChange({
          audioPreset: preset,
          ...config,
        })
      }
    },
    [onChange],
  )

  return (
    <Box
      borderTopWidth="1px"
      borderColor={isFullscreen ? 'whiteAlpha.200' : 'gray.700'}
      pt={isFullscreen ? 2 : 3}
      mt={isFullscreen ? 1 : 2}
    >
      <HStack justify="space-between" mb={2}>
        <ToggleControl
          checked={audioSyncEnabled}
          onCheckedChange={(checked) => onChange({ audioSyncEnabled: checked })}
          label={isFullscreen ? 'Синхронизация' : 'Синхронизация с музыкой'}
          colorPalette="purple"
          size={isFullscreen ? 'sm' : 'md'}
          labelColor={isFullscreen ? 'white' : undefined}
          labelFontSize={isFullscreen ? 'sm' : undefined}
        />
        {audioSyncEnabled && (
          <Text fontSize="xs" color="purple.400">
            {AUDIO_SYNC_MODE_LABELS[audioSyncMode]}
          </Text>
        )}
      </HStack>

      {audioSyncEnabled && (
        <VStack gap={isFullscreen ? 2 : 3} align="stretch">
          {/* Источник аудио */}
          {!isFullscreen && (
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={2}>
                Источник аудио
              </Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={audioSource}
                  onChange={(e) => onChange({ audioSource: e.target.value as AudioSource })}
                >
                  {AUDIO_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {AUDIO_SOURCE_LABELS[source]}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Text fontSize="xs" color="gray.500" mt={1}>
                {audioSource === 'microphone' ? 'Анализ внешнего звука через микрофон' : 'Анализ встроенного плеера'}
              </Text>
            </Box>
          )}

          {isFullscreen && (
            <NativeSelect.Root size="sm">
              <NativeSelect.Field
                value={audioSource}
                onChange={(e) => onChange({ audioSource: e.target.value as AudioSource })}
                color="white"
                css={{ '& option': { color: 'black' } }}
              >
                {AUDIO_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {AUDIO_SOURCE_LABELS[source]}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          )}

          {/* Пресет */}
          <NativeSelect.Root size={isFullscreen ? 'sm' : 'md'}>
            <NativeSelect.Field
              value={audioPreset}
              onChange={(e) => handlePresetChange(e.target.value as AudioPreset)}
              color={isFullscreen ? 'white' : undefined}
              css={isFullscreen ? { '& option': { color: 'black' } } : undefined}
            >
              {AUDIO_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {AUDIO_PRESET_LABELS[preset]}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          {!isFullscreen && (
            <Text fontSize="xs" color="gray.500">
              {AUDIO_PRESET_DESCRIPTIONS[audioPreset]}
            </Text>
          )}

          {/* Режим синхронизации — только в обычном режиме */}
          {!isFullscreen && (
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={2}>
                Режим
              </Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={audioSyncMode}
                  onChange={(e) => onManualChange({ audioSyncMode: e.target.value as AudioSyncMode })}
                >
                  {AUDIO_SYNC_MODES.filter((m) => m !== 'off').map((mode) => (
                    <option key={mode} value={mode}>
                      {AUDIO_SYNC_MODE_LABELS[mode]}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
          )}

          {/* Пульсация на бит */}
          <ToggleControl
            checked={beatPulseEnabled}
            onCheckedChange={(checked) => onManualChange({ beatPulseEnabled: checked })}
            label="Пульсация на бит"
            colorPalette="purple"
            size={isFullscreen ? 'sm' : 'md'}
            labelColor={isFullscreen ? 'white' : undefined}
            labelFontSize={isFullscreen ? 'xs' : undefined}
          />

          {/* Дополнительные переключатели — только в обычном режиме */}
          {!isFullscreen && (
            <>
              <ToggleControl
                checked={adaptiveGradientEnabled}
                onCheckedChange={(checked) => onManualChange({ adaptiveGradientEnabled: checked })}
                label="Адаптивный градиент"
                colorPalette="orange"
              />

              <ToggleControl
                checked={adaptiveSpinEnabled}
                onCheckedChange={(checked) => onManualChange({ adaptiveSpinEnabled: checked })}
                label="Адаптивное вращение"
                colorPalette="teal"
              />

              {/* Слайдеры чувствительности */}
              <SliderControl
                label="Бас"
                value={bassSensitivity}
                onChange={(v) => onManualChange({ bassSensitivity: v })}
                min={0}
                max={100}
                step={10}
                colorPalette="purple"
                formatValue={formatPercent}
              />

              <SliderControl
                label="Ритм"
                value={beatSensitivity}
                onChange={(v) => onManualChange({ beatSensitivity: v })}
                min={0}
                max={100}
                step={10}
                colorPalette="pink"
                formatValue={formatPercent}
              />
            </>
          )}
        </VStack>
      )}
    </Box>
  )
}
