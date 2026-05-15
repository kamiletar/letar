'use client'

import { useMemo } from 'react'

export type ViewerVariant = 'normal' | 'fullscreen'

/**
 * Стили для различных вариантов отображения контролов.
 */
export interface VariantStyles {
  /** Это fullscreen режим */
  isFullscreen: boolean
  /** Размер Switch и других компонентов */
  switchSize: 'sm' | 'md'
  /** Цвет текста */
  textColor: 'white' | undefined
  /** Размер шрифта для лейблов */
  labelFontSize: 'sm' | 'md' | undefined
  /** Размер шрифта для значений */
  valueFontSize: 'sm' | 'xs'
  /** Gap между элементами */
  containerGap: number
  /** Padding left для вложенных элементов */
  nestedPl: number
  /** Padding top для вложенных элементов */
  nestedPt: number
  /** Margin bottom для заголовков */
  headerMb: number | undefined
}

/**
 * Возвращает стили в зависимости от варианта отображения.
 *
 * @example
 * const styles = useVariantStyles('fullscreen')
 * <Switch.Root size={styles.switchSize}>
 *   <Switch.Label color={styles.textColor} fontSize={styles.labelFontSize}>
 *     Label
 *   </Switch.Label>
 * </Switch.Root>
 */
export function useVariantStyles(variant: ViewerVariant = 'normal'): VariantStyles {
  return useMemo(() => {
    const isFullscreen = variant === 'fullscreen'

    return {
      isFullscreen,
      switchSize: isFullscreen ? 'sm' : 'md',
      textColor: isFullscreen ? 'white' : undefined,
      labelFontSize: isFullscreen ? 'sm' : undefined,
      valueFontSize: isFullscreen ? 'sm' : 'xs',
      containerGap: isFullscreen ? 4 : 3,
      nestedPl: isFullscreen ? 0 : 4,
      nestedPt: isFullscreen ? 0 : 2,
      headerMb: isFullscreen ? 2 : undefined,
    }
  }, [variant])
}

/**
 * Вариант для использования без хука (на сервере или в статическом контексте).
 */
export function getVariantStyles(variant: ViewerVariant = 'normal'): VariantStyles {
  const isFullscreen = variant === 'fullscreen'

  return {
    isFullscreen,
    switchSize: isFullscreen ? 'sm' : 'md',
    textColor: isFullscreen ? 'white' : undefined,
    labelFontSize: isFullscreen ? 'sm' : undefined,
    valueFontSize: isFullscreen ? 'sm' : 'xs',
    containerGap: isFullscreen ? 4 : 3,
    nestedPl: isFullscreen ? 0 : 4,
    nestedPt: isFullscreen ? 0 : 2,
    headerMb: isFullscreen ? 2 : undefined,
  }
}
