'use client'

/**
 * Кнопки управления вращением мандалы.
 */

import { IconButton } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { useId } from 'react'
import { LuPause, LuPlay, LuRotateCcw, LuRotateCw } from 'react-icons/lu'
import { ToggleControl } from './toggle-control'

// =============================================================================
// Switch компоненты (для обычного режима)
// =============================================================================

interface PauseSwitchProps {
  isPaused: boolean
  onChange: (checked: boolean) => void
}

/**
 * Switch с tooltip для паузы
 */
export function PauseSwitch({ isPaused, onChange }: PauseSwitchProps) {
  return (
    <ToggleControl
      checked={isPaused}
      onCheckedChange={onChange}
      label="Пауза"
      tooltip={isPaused ? 'Продолжить вращение' : 'Остановить вращение'}
      colorPalette="purple"
    />
  )
}

interface ReverseSwitchProps {
  isReverse: boolean
  onChange: (checked: boolean) => void
}

/**
 * Switch с tooltip для направления вращения
 */
export function ReverseSwitch({ isReverse, onChange }: ReverseSwitchProps) {
  return (
    <ToggleControl
      checked={isReverse}
      onCheckedChange={onChange}
      label="Обратно"
      tooltip={isReverse ? 'Вращать по часовой стрелке' : 'Вращать против часовой стрелки'}
      colorPalette="purple"
    />
  )
}

// =============================================================================
// Кнопки (для fullscreen режима)
// =============================================================================

interface FullscreenPauseButtonProps {
  isPaused: boolean
  onChange: (paused: boolean) => void
}

/**
 * Кнопка паузы в fullscreen с tooltip
 */
export function FullscreenPauseButton({ isPaused, onChange }: FullscreenPauseButtonProps) {
  const id = useId()
  return (
    <Tooltip ids={{ trigger: id }} content={isPaused ? 'Воспроизвести' : 'Пауза'}>
      <IconButton
        id={id}
        aria-label={isPaused ? 'Воспроизвести' : 'Пауза'}
        size="md"
        variant="solid"
        colorPalette={isPaused ? 'green' : 'gray'}
        onClick={() => onChange(!isPaused)}
      >
        {isPaused ? <LuPlay /> : <LuPause />}
      </IconButton>
    </Tooltip>
  )
}

interface FullscreenReverseButtonProps {
  isReverse: boolean
  onChange: (reverse: boolean) => void
}

/**
 * Кнопка направления в fullscreen с tooltip
 */
export function FullscreenReverseButton({ isReverse, onChange }: FullscreenReverseButtonProps) {
  const t = useTranslations('viewer.aria')
  const id = useId()
  return (
    <Tooltip ids={{ trigger: id }} content={isReverse ? 'Прямое вращение' : 'Обратное вращение'}>
      <IconButton
        id={id}
        aria-label={t('changeDirection')}
        size="md"
        variant="solid"
        colorPalette={isReverse ? 'purple' : 'gray'}
        onClick={() => onChange(!isReverse)}
      >
        {isReverse ? <LuRotateCcw /> : <LuRotateCw />}
      </IconButton>
    </Tooltip>
  )
}
