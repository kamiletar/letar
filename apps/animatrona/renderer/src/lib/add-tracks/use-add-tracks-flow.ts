'use client'

/**
 * Хук для добавления аудиодорожек и субтитров из папки-донора
 * в существующие эпизоды библиотеки
 *
 * Это главный хук-композиция, объединяющий:
 * - useAddTracksState — управление состоянием
 * - useTrackAnalysis — сканирование и анализ файлов
 * - useTrackSelection — выбор дорожек
 * - useTrackProcessing — обработка/транскодирование
 */

import { useCallback } from 'react'

import type { UseAddTracksFlowOptions } from './types'
import { useAddTracksState } from './use-add-tracks-state'
import { useTrackAnalysis } from './use-track-analysis'
import { useTrackProcessing } from './use-track-processing'
import { useTrackSelection } from './use-track-selection'

// Re-export types for backwards compatibility
export type {
  AddedRecord,
  AddTracksProgress,
  AddTracksStage,
  AddTracksState,
  AudioTask,
  DonorProbeResult,
  FileProgress,
  LibraryEpisode,
  SelectedTrack,
  SubtitleTask,
  TrackFilterConfig,
  TrackInfo,
  UseAddTracksFlowOptions,
} from './types'

// Re-export utils
export { DEFAULT_TRACK_FILTER, shouldAutoSelectTrack } from './utils'

/**
 * Хук для добавления дорожек из папки-донора
 */
export function useAddTracksFlow(options: UseAddTracksFlowOptions) {
  const { episodes, contentTypeFilter, animeFolderPath } = options

  // Управление состоянием
  const stateManager = useAddTracksState()

  // Анализ файлов
  const { scanDonorFolder, proceedToCalibration, proceedToSelection } = useTrackAnalysis({
    episodes,
    contentTypeFilter,
    stateManager,
  })

  // Выбор дорожек
  const { updateMatchManually, toggleTrackSelection, selectAllTracksOfType, selectByLanguage, deselectByLanguage } =
    useTrackSelection({
      episodes,
      animeFolderPath,
      stateManager,
    })

  // Обработка/транскодирование
  const { startProcessing, cancel } = useTrackProcessing({
    stateManager,
  })

  /**
   * Навигация назад по шагам wizard
   */
  const goBack = useCallback(() => {
    const { state, setState, setStage } = stateManager

    switch (state.stage) {
      case 'matching':
        // Возврат к выбору папки
        setStage('folder')
        break

      case 'calibration':
        // Возврат к сопоставлению
        setStage('matching')
        break

      case 'selection':
        // Возврат к калибровке, сбрасываем probeResults и selectedTracks
        setState((s) => ({
          ...s,
          stage: 'calibration',
          probeResults: new Map(),
          selectedTracks: [],
        }))
        break
    }
  }, [stateManager])

  return {
    state: stateManager.state,
    // Шаг 1: Папка-донор
    scanDonorFolder,
    // Шаг 2: Сопоставление
    updateMatchManually,
    proceedToCalibration,
    // Шаг 3: Калибровка синхронизации
    setSyncOffset: stateManager.setSyncOffset,
    proceedToSelection,
    // Шаг 4: Выбор дорожек
    toggleTrackSelection,
    selectAllTracksOfType,
    selectByLanguage,
    deselectByLanguage,
    // Шаг 5: Обработка
    startProcessing,
    cancel,
    reset: stateManager.reset,
    // Навигация
    goBack,
    // Настройка параллельности
    setConcurrency: stateManager.setConcurrency,
  }
}
