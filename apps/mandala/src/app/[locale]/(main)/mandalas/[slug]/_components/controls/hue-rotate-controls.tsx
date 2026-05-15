'use client'

/**
 * Управление hue-rotate эффектом (цветовое вращение).
 */

import { Box, HStack, NativeSelect, Slider, Text, VStack } from '@chakra-ui/react'
import { HUE_ROTATE_MODE_LABELS, type HueRotateMode } from '../../_constants/viewer-constants'
import { ToggleControl } from './toggle-control'

// =============================================================================
// Типы
// =============================================================================

interface HueRotateControlsProps {
  /** Включен ли эффект */
  hueRotateEnabled: boolean
  /** Режим работы */
  hueRotateMode: HueRotateMode
  /** Базовая скорость (0-100) */
  hueRotateBaseSpeed: number
  /** Модуляция от баса (0-100) */
  hueRotateBassModulation: number
  /** Размер скачка на бите (0-90) */
  hueRotateBeatJump: number
  /** Сглаживание (0-100) */
  hueRotateSmoothing: number
  /** Callback при изменении */
  onChange: (changes: Partial<HueRotateControlsProps>) => void
  /** Вариант отображения */
  variant?: 'normal' | 'fullscreen'
}

// =============================================================================
// Компонент
// =============================================================================

/**
 * Контролы для настройки hue-rotate эффекта.
 */
export function HueRotateControls({
  hueRotateEnabled,
  hueRotateMode,
  hueRotateBaseSpeed,
  hueRotateBassModulation,
  hueRotateBeatJump,
  hueRotateSmoothing,
  onChange,
  variant = 'normal',
}: HueRotateControlsProps) {
  const isFullscreen = variant === 'fullscreen'

  return (
    <VStack gap={isFullscreen ? 3 : 4} align="stretch">
      {/* Переключатель включения */}
      <HStack justify="space-between">
        <ToggleControl
          checked={hueRotateEnabled}
          onCheckedChange={(checked) => onChange({ hueRotateEnabled: checked })}
          label="Цветовое вращение"
          colorPalette="cyan"
          size={isFullscreen ? 'sm' : 'md'}
          labelColor={isFullscreen ? 'white' : undefined}
          labelFontSize={isFullscreen ? 'sm' : undefined}
        />
      </HStack>

      {/* Настройки (показываем только если включено) */}
      {hueRotateEnabled && (
        <>
          {/* Режим работы */}
          <Box pl={isFullscreen ? 0 : 4}>
            <Text fontSize={isFullscreen ? 'xs' : 'sm'} color="gray.400" mb={2}>
              Режим
            </Text>
            <NativeSelect.Root size={isFullscreen ? 'xs' : 'sm'}>
              <NativeSelect.Field
                value={hueRotateMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onChange({ hueRotateMode: e.target.value as HueRotateMode })
                }
              >
                {Object.entries(HUE_ROTATE_MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          {/* Базовая скорость */}
          <Box pl={isFullscreen ? 0 : 4}>
            <HStack justify="space-between" mb={1}>
              <Text fontSize={isFullscreen ? 'xs' : 'sm'} color="gray.400">
                Базовая скорость
              </Text>
              <Text fontSize={isFullscreen ? 'xs' : 'sm'} color="cyan.400">
                {hueRotateBaseSpeed}°/сек
              </Text>
            </HStack>
            <Slider.Root
              value={[hueRotateBaseSpeed]}
              onValueChange={(details) => onChange({ hueRotateBaseSpeed: details.value[0] })}
              min={0}
              max={100}
              step={1}
              colorPalette="cyan"
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0} />
              </Slider.Control>
            </Slider.Root>
          </Box>

          {/* Модуляция от баса */}
          <Box pl={isFullscreen ? 0 : 4}>
            <HStack justify="space-between" mb={1}>
              <Text fontSize={isFullscreen ? 'xs' : 'sm'} color="gray.400">
                Модуляция от баса
              </Text>
              <Text fontSize={isFullscreen ? 'xs' : 'sm'} color="cyan.400">
                {hueRotateBassModulation}%
              </Text>
            </HStack>
            <Slider.Root
              value={[hueRotateBassModulation]}
              onValueChange={(details) => onChange({ hueRotateBassModulation: details.value[0] })}
              min={0}
              max={100}
              step={5}
              colorPalette="cyan"
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0} />
              </Slider.Control>
            </Slider.Root>
          </Box>

          {/* Скачок на бите */}
          <Box pl={isFullscreen ? 0 : 4}>
            <HStack justify="space-between" mb={1}>
              <Text fontSize={isFullscreen ? 'xs' : 'sm'} color="gray.400">
                Скачок на бите
              </Text>
              <Text fontSize={isFullscreen ? 'xs' : 'sm'} color="cyan.400">
                {hueRotateBeatJump}°
              </Text>
            </HStack>
            <Slider.Root
              value={[hueRotateBeatJump]}
              onValueChange={(details) => onChange({ hueRotateBeatJump: details.value[0] })}
              min={0}
              max={90}
              step={5}
              colorPalette="cyan"
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0} />
              </Slider.Control>
            </Slider.Root>
          </Box>

          {/* Сглаживание */}
          <Box pl={isFullscreen ? 0 : 4}>
            <HStack justify="space-between" mb={1}>
              <Text fontSize={isFullscreen ? 'xs' : 'sm'} color="gray.400">
                Сглаживание
              </Text>
              <Text fontSize={isFullscreen ? 'xs' : 'sm'} color="cyan.400">
                {hueRotateSmoothing}%
              </Text>
            </HStack>
            <Slider.Root
              value={[hueRotateSmoothing]}
              onValueChange={(details) => onChange({ hueRotateSmoothing: details.value[0] })}
              min={0}
              max={100}
              step={5}
              colorPalette="cyan"
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0} />
              </Slider.Control>
            </Slider.Root>
          </Box>
        </>
      )}
    </VStack>
  )
}
