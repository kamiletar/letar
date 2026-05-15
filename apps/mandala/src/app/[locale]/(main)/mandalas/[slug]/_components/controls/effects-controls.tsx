'use client'

/**
 * Управление эффектами мандалы (blend, layer, авто-эффекты).
 */

import { Box, HStack, NativeSelect, Text } from '@chakra-ui/react'
import {
  BLEND_EFFECT_LABELS,
  BLEND_EFFECTS,
  type BlendEffect,
  EFFECT_TYPE_LABELS,
  EFFECT_TYPES,
  type EffectType,
} from '../../_constants/viewer-constants'
import { formatSeconds, SliderControl } from './slider-control'
import { ToggleControl } from './toggle-control'

// =============================================================================
// Типы
// =============================================================================

interface EffectsControlsProps {
  /** Индекс текущего blend-эффекта */
  effectIndex: number
  /** Тип layer-эффекта */
  effectType: EffectType
  /** Авто-смена blend-эффектов */
  autoEffects: boolean
  /** Интервал авто-смены blend-эффектов */
  autoEffectInterval: number
  /** Авто-смена layer-эффектов */
  autoLayerEffects: boolean
  /** Интервал авто-смены layer-эффектов */
  autoLayerEffectInterval: number
  /** Callback при изменении */
  onChange: (changes: Partial<EffectsControlsProps>) => void
  /** Вариант отображения */
  variant?: 'normal' | 'fullscreen'
}

// =============================================================================
// Компоненты
// =============================================================================

/**
 * Селекторы blend и layer эффектов.
 */
export function BlendLayerSelectors({
  effectIndex,
  effectType,
  onChange,
  variant = 'normal',
}: Pick<EffectsControlsProps, 'effectIndex' | 'effectType' | 'onChange' | 'variant'>) {
  const isFullscreen = variant === 'fullscreen'

  return (
    <HStack gap={4} align="flex-start">
      <Box flex={1}>
        <Text
          fontSize={isFullscreen ? 'xs' : 'sm'}
          color={isFullscreen ? 'gray.400' : 'gray.300'}
          mb={isFullscreen ? 1 : 2}
        >
          Бленд
        </Text>
        <NativeSelect.Root size={isFullscreen ? 'sm' : 'md'}>
          <NativeSelect.Field
            value={String(effectIndex)}
            onChange={(e) => onChange({ effectIndex: Number(e.target.value) })}
            color={isFullscreen ? 'white' : undefined}
            css={isFullscreen ? { '& option': { color: 'black' } } : undefined}
          >
            {BLEND_EFFECTS.map((effect, index) => (
              <option key={effect} value={String(index)}>
                {BLEND_EFFECT_LABELS[effect as BlendEffect]}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Box>
      <Box flex={1}>
        <Text
          fontSize={isFullscreen ? 'xs' : 'sm'}
          color={isFullscreen ? 'gray.400' : 'gray.300'}
          mb={isFullscreen ? 1 : 2}
        >
          Слой
        </Text>
        <NativeSelect.Root size={isFullscreen ? 'sm' : 'md'}>
          <NativeSelect.Field
            value={effectType}
            onChange={(e) => onChange({ effectType: e.target.value as EffectType })}
            color={isFullscreen ? 'white' : undefined}
            css={isFullscreen ? { '& option': { color: 'black' } } : undefined}
          >
            {EFFECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EFFECT_TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Box>
    </HStack>
  )
}

interface AutoEffectControlProps {
  /** Включены ли авто-эффекты */
  enabled: boolean
  /** Интервал в секундах */
  interval: number
  /** Label для switch */
  label: string
  /** Цветовая палитра */
  colorPalette: 'green' | 'teal'
  /** Минимальный интервал */
  minInterval: number
  /** Максимальный интервал */
  maxInterval: number
  /** Callback при изменении enabled */
  onEnabledChange: (enabled: boolean) => void
  /** Callback при изменении интервала */
  onIntervalChange: (interval: number) => void
  /** Вариант отображения */
  variant?: 'normal' | 'fullscreen'
}

/**
 * Контрол для авто-режима (blend или layer эффектов).
 */
export function AutoEffectControl({
  enabled,
  interval,
  label,
  colorPalette,
  minInterval,
  maxInterval,
  onEnabledChange,
  onIntervalChange,
  variant = 'normal',
}: AutoEffectControlProps) {
  const isFullscreen = variant === 'fullscreen'

  return (
    <Box>
      <HStack justify="space-between" mb={2}>
        <ToggleControl
          checked={enabled}
          onCheckedChange={onEnabledChange}
          label={label}
          colorPalette={colorPalette}
          size={isFullscreen ? 'sm' : 'md'}
          labelColor={isFullscreen ? 'white' : undefined}
          labelFontSize={isFullscreen ? 'sm' : undefined}
        />
        {enabled && (
          <Text fontSize="sm" color={`${colorPalette}.400`}>
            {interval}с
          </Text>
        )}
      </HStack>
      {enabled && (
        <SliderControl
          label=""
          value={interval}
          onChange={onIntervalChange}
          min={minInterval}
          max={maxInterval}
          step={5}
          colorPalette={colorPalette}
          formatValue={formatSeconds}
          hideLabel
        />
      )}
    </Box>
  )
}

/**
 * Полный набор контролов эффектов.
 */
export function EffectsControls({
  effectIndex,
  effectType,
  autoEffects,
  autoEffectInterval,
  autoLayerEffects,
  autoLayerEffectInterval,
  onChange,
  variant = 'normal',
}: EffectsControlsProps) {
  return (
    <>
      <BlendLayerSelectors effectIndex={effectIndex} effectType={effectType} onChange={onChange} variant={variant} />

      <AutoEffectControl
        enabled={autoEffects}
        interval={autoEffectInterval}
        label={variant === 'fullscreen' ? 'Смена эффектов' : 'Автоматическая смена эффектов'}
        colorPalette="green"
        minInterval={5}
        maxInterval={60}
        onEnabledChange={(enabled) => onChange({ autoEffects: enabled })}
        onIntervalChange={(interval) => onChange({ autoEffectInterval: interval })}
        variant={variant}
      />

      <AutoEffectControl
        enabled={autoLayerEffects}
        interval={autoLayerEffectInterval}
        label={variant === 'fullscreen' ? 'Смена слоёв' : 'Автоматическая смена слоёв'}
        colorPalette="teal"
        minInterval={5}
        maxInterval={120}
        onEnabledChange={(enabled) => onChange({ autoLayerEffects: enabled })}
        onIntervalChange={(interval) => onChange({ autoLayerEffectInterval: interval })}
        variant={variant}
      />
    </>
  )
}
