'use client'

/**
 * Универсальный компонент переключателя для контролов просмотра мандал.
 *
 * Инкапсулирует повторяющийся паттерн Switch.Root + HiddenInput + Control + Thumb + Label.
 * Поддерживает опциональный tooltip для дополнительной информации.
 */

import { Switch } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { type ComponentProps, type ReactNode, useId } from 'react'

// =============================================================================
// Типы
// =============================================================================

type ColorPalette = 'purple' | 'blue' | 'green' | 'gray' | 'orange' | 'red' | 'teal' | 'cyan' | 'pink'
type SwitchSize = 'sm' | 'md' | 'lg'

/** Пропсы для ToggleControl с поддержкой data-* атрибутов */
interface ToggleControlProps extends Omit<ComponentProps<typeof Switch.Root>, 'checked' | 'onCheckedChange' | 'label'> {
  /** Состояние переключателя */
  checked: boolean
  /** Callback при изменении */
  onCheckedChange: (checked: boolean) => void
  /** Текст метки */
  label: ReactNode
  /** Цветовая схема */
  colorPalette?: ColorPalette
  /** Размер переключателя */
  size?: SwitchSize
  /** Tooltip контент (опционально) */
  tooltip?: string
  /** Цвет текста метки */
  labelColor?: string
  /** Размер шрифта метки */
  labelFontSize?: string | number
}

// =============================================================================
// Компонент
// =============================================================================

/**
 * Переключатель с меткой и опциональным tooltip.
 *
 * @example
 * // Базовое использование
 * <ToggleControl
 *   checked={nightMode}
 *   onCheckedChange={(checked) => onChange({ nightMode: checked })}
 *   label="Ночной режим"
 *   colorPalette="blue"
 * />
 *
 * @example
 * // С tooltip
 * <ToggleControl
 *   checked={isPaused}
 *   onCheckedChange={setIsPaused}
 *   label="Пауза"
 *   tooltip={isPaused ? 'Продолжить вращение' : 'Остановить вращение'}
 *   colorPalette="purple"
 * />
 */
export function ToggleControl({
  checked,
  onCheckedChange,
  label,
  colorPalette = 'purple',
  size = 'md',
  tooltip,
  labelColor,
  labelFontSize,
  disabled = false,
  ...rootProps
}: ToggleControlProps) {
  const id = useId()

  const switchElement = (
    <Switch.Root
      ids={{ root: id }}
      checked={checked}
      onCheckedChange={(e) => onCheckedChange(e.checked)}
      colorPalette={colorPalette}
      size={size}
      disabled={disabled}
      {...rootProps}
    >
      <Switch.HiddenInput />
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Label color={labelColor} fontSize={labelFontSize}>
        {label}
      </Switch.Label>
    </Switch.Root>
  )

  // Если есть tooltip — оборачиваем
  if (tooltip) {
    return (
      <Tooltip ids={{ trigger: id }} content={tooltip}>
        {switchElement}
      </Tooltip>
    )
  }

  return switchElement
}
