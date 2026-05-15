'use client'

/**
 * Управление атмосферой (ночной режим, дыхание, медитация, виньетка, свечение).
 */

import { Box, HStack, Slider, Text, VStack } from '@chakra-ui/react'
import { useVariantStyles, type ViewerVariant } from '../../_hooks'
import { ToggleControl } from './toggle-control'

// =============================================================================
// Типы
// =============================================================================

interface AtmosphereControlsProps {
  /** Ночной режим */
  nightMode: boolean
  /** Анимация дыхания */
  breathingEnabled: boolean
  /** Режим медитации */
  meditationEnabled: boolean
  /** Длительность медитации в минутах */
  meditationDuration: number
  /** Виньетка включена */
  vignetteEnabled: boolean
  /** Интенсивность виньетки */
  vignetteIntensity: number
  /** Свечение включено */
  glowEnabled: boolean
  /** Интенсивность свечения */
  glowIntensity: number
  /** Callback при изменении */
  onChange: (changes: Partial<AtmosphereControlsProps>) => void
  /** Вариант отображения */
  variant?: ViewerVariant
}

// =============================================================================
// Компоненты
// =============================================================================

interface IntensitySliderProps {
  enabled: boolean
  value: number
  label: string
  colorPalette: 'gray' | 'purple'
  onEnabledChange: (enabled: boolean) => void
  onValueChange: (value: number) => void
  variant?: ViewerVariant
}

/**
 * Слайдер интенсивности с переключателем.
 */
function IntensitySlider({
  enabled,
  value,
  label,
  colorPalette,
  onEnabledChange,
  onValueChange,
  variant = 'normal',
}: IntensitySliderProps) {
  const styles = useVariantStyles(variant)

  return (
    <Box flex={styles.isFullscreen ? 1 : undefined}>
      <HStack justify="space-between" mb={styles.headerMb}>
        <ToggleControl
          checked={enabled}
          onCheckedChange={onEnabledChange}
          label={label}
          colorPalette={colorPalette}
          size={styles.switchSize}
          labelColor={styles.textColor}
          labelFontSize={styles.labelFontSize}
        />
        {enabled && (
          <Text fontSize={styles.valueFontSize} color={colorPalette === 'purple' ? 'purple.400' : 'gray.400'}>
            {value}%
          </Text>
        )}
      </HStack>
      {enabled && (
        <Box pl={styles.nestedPl} pt={styles.nestedPt}>
          <Slider.Root
            value={[value]}
            onValueChange={(details) => onValueChange(details.value[0])}
            min={0}
            max={100}
            step={5}
            colorPalette={colorPalette}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Control>
          </Slider.Root>
        </Box>
      )}
    </Box>
  )
}

/**
 * Базовые переключатели атмосферы (ночь, дыхание, медитация).
 */
export function AtmosphereSwitches({
  nightMode,
  breathingEnabled,
  meditationEnabled,
  meditationDuration,
  onChange,
  variant = 'normal',
}: Pick<
  AtmosphereControlsProps,
  'nightMode' | 'breathingEnabled' | 'meditationEnabled' | 'meditationDuration' | 'onChange' | 'variant'
>) {
  const styles = useVariantStyles(variant)

  if (styles.isFullscreen) {
    // Компактный ряд для fullscreen
    return (
      <HStack justify="space-between" gap={styles.containerGap}>
        <ToggleControl
          checked={nightMode}
          onCheckedChange={(checked) => onChange({ nightMode: checked })}
          label="Ночь"
          colorPalette="blue"
          size={styles.switchSize}
          labelColor={styles.textColor}
          labelFontSize={styles.labelFontSize}
        />
        <ToggleControl
          checked={breathingEnabled}
          onCheckedChange={(checked) => onChange({ breathingEnabled: checked })}
          label="Дыхание"
          colorPalette="teal"
          size={styles.switchSize}
          labelColor={styles.textColor}
          labelFontSize={styles.labelFontSize}
          data-onboarding="breathing-btn"
        />
        <ToggleControl
          checked={meditationEnabled}
          onCheckedChange={(checked) => onChange({ meditationEnabled: checked })}
          label="Медитация"
          colorPalette="orange"
          size={styles.switchSize}
          labelColor={styles.textColor}
          labelFontSize={styles.labelFontSize}
        />
      </HStack>
    )
  }

  // Обычный режим — вертикальный список
  return (
    <VStack gap={styles.containerGap} align="stretch">
      {/* Ночной режим */}
      <ToggleControl
        checked={nightMode}
        onCheckedChange={(checked) => onChange({ nightMode: checked })}
        label="Ночной режим"
        colorPalette="blue"
      />

      {/* Дыхание */}
      <ToggleControl
        checked={breathingEnabled}
        onCheckedChange={(checked) => onChange({ breathingEnabled: checked })}
        label="Анимация дыхания"
        colorPalette="teal"
      />

      {/* Медитация */}
      <HStack justify="space-between">
        <ToggleControl
          checked={meditationEnabled}
          onCheckedChange={(checked) => onChange({ meditationEnabled: checked })}
          label="Медитация"
          colorPalette="orange"
        />
        {meditationEnabled && (
          <Text fontSize={styles.valueFontSize} color="gray.400">
            {meditationDuration} мин
          </Text>
        )}
      </HStack>

      {/* Длительность медитации */}
      {meditationEnabled && (
        <Box pl={styles.nestedPl}>
          <Slider.Root
            value={[meditationDuration]}
            onValueChange={(details) => onChange({ meditationDuration: details.value[0] })}
            min={1}
            max={30}
            step={1}
            colorPalette="orange"
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Control>
          </Slider.Root>
        </Box>
      )}
    </VStack>
  )
}

/**
 * Виньетка и свечение.
 */
export function VignetteGlowControls({
  vignetteEnabled,
  vignetteIntensity,
  glowEnabled,
  glowIntensity,
  onChange,
  variant = 'normal',
}: Pick<
  AtmosphereControlsProps,
  'vignetteEnabled' | 'vignetteIntensity' | 'glowEnabled' | 'glowIntensity' | 'onChange' | 'variant'
>) {
  const styles = useVariantStyles(variant)

  const sliders = (
    <>
      <IntensitySlider
        enabled={vignetteEnabled}
        value={vignetteIntensity}
        label="Виньетка"
        colorPalette="gray"
        onEnabledChange={(enabled) => onChange({ vignetteEnabled: enabled })}
        onValueChange={(value) => onChange({ vignetteIntensity: value })}
        variant={variant}
      />
      <IntensitySlider
        enabled={glowEnabled}
        value={glowIntensity}
        label="Свечение"
        colorPalette="purple"
        onEnabledChange={(enabled) => onChange({ glowEnabled: enabled })}
        onValueChange={(value) => onChange({ glowIntensity: value })}
        variant={variant}
      />
    </>
  )

  if (styles.isFullscreen) {
    return <HStack gap={styles.containerGap}>{sliders}</HStack>
  }

  return sliders
}

/**
 * Полный набор контролов атмосферы.
 */
export function AtmosphereControls(props: AtmosphereControlsProps) {
  const { variant = 'normal' } = props

  return (
    <>
      <AtmosphereSwitches
        nightMode={props.nightMode}
        breathingEnabled={props.breathingEnabled}
        meditationEnabled={props.meditationEnabled}
        meditationDuration={props.meditationDuration}
        onChange={props.onChange}
        variant={variant}
      />
      <VignetteGlowControls
        vignetteEnabled={props.vignetteEnabled}
        vignetteIntensity={props.vignetteIntensity}
        glowEnabled={props.glowEnabled}
        glowIntensity={props.glowIntensity}
        onChange={props.onChange}
        variant={variant}
      />
    </>
  )
}
