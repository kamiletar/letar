/**
 * Хук для определения ориентации экрана и адаптивных значений
 *
 * Использование:
 * const { isLandscape, numColumns, cardWidth } = useOrientation()
 */

import { type DimensionValue, useWindowDimensions } from 'react-native'

export interface OrientationInfo {
  /** Ширина экрана */
  width: number
  /** Высота экрана */
  height: number
  /** Landscape режим */
  isLandscape: boolean
  /** Portrait режим */
  isPortrait: boolean
  /** Маленький экран (< 600px) */
  isSmall: boolean
  /** Средний экран (600-900px) */
  isMedium: boolean
  /** Большой экран (> 900px) */
  isLarge: boolean
}

export interface LibraryLayoutConfig {
  /** Количество колонок в гриде */
  numColumns: number
  /** Ширина карточки */
  cardWidth: number
  /** Gap между карточками */
  cardGap: number
  /** Высота header */
  headerHeight: number
  /** Padding контента */
  contentPadding: number
}

export interface AnimeLayoutConfig {
  /** Split-view в landscape */
  useSplitView: boolean
  /** Ширина левой панели (%) */
  leftPanelWidth: DimensionValue
  /** Ширина постера */
  posterWidth: number
  /** Высота постера */
  posterHeight: number
  /** Высота строки эпизода */
  episodeRowHeight: number
}

/**
 * Хук для определения ориентации экрана
 */
export function useOrientation(): OrientationInfo {
  const { width, height } = useWindowDimensions()

  return {
    width,
    height,
    isLandscape: width > height,
    isPortrait: height >= width,
    isSmall: width < 600,
    isMedium: width >= 600 && width < 900,
    isLarge: width >= 900,
  }
}

/**
 * Вычисляет оптимальное количество колонок для грида
 */
function getGridColumns(width: number, isLandscape: boolean): number {
  if (!isLandscape) {
    // Portrait: 2-3 колонки
    return width < 400 ? 2 : 3
  }

  // Landscape: 4-6 колонок
  if (width < 700) {
    return 4
  }
  if (width < 900) {
    return 5
  }
  return 6
}

/**
 * Хук для layout конфигурации библиотеки
 */
export function useLibraryLayout(): LibraryLayoutConfig {
  const { width, isLandscape } = useOrientation()

  const numColumns = getGridColumns(width, isLandscape)

  // Рассчитываем ширину карточки
  const contentPadding = 16
  const cardGap = 12
  const availableWidth = width - contentPadding * 2
  const totalGaps = (numColumns - 1) * cardGap
  const cardWidth = Math.floor((availableWidth - totalGaps) / numColumns)

  return {
    numColumns,
    cardWidth,
    cardGap,
    headerHeight: isLandscape ? 56 : 120,
    contentPadding,
  }
}

/**
 * Хук для layout конфигурации экрана аниме
 */
export function useAnimeLayout(): AnimeLayoutConfig {
  const { width, isLandscape } = useOrientation()

  if (isLandscape) {
    // Split-view в landscape
    return {
      useSplitView: true,
      leftPanelWidth: '38%',
      posterWidth: Math.min(200, width * 0.2),
      posterHeight: Math.min(300, width * 0.3),
      episodeRowHeight: 52,
    }
  }

  // Вертикальный layout в portrait
  return {
    useSplitView: false,
    leftPanelWidth: '100%',
    posterWidth: 100,
    posterHeight: 150,
    episodeRowHeight: 56,
  }
}
