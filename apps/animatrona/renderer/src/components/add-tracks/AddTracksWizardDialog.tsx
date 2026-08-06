'use client'

/**
 * Диалог добавления дорожек из папки-донора
 */

import { Button, Dialog, HStack, Icon, Portal, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect } from 'react'
import { LuArrowLeft, LuArrowRight, LuCheck, LuMusic, LuX } from 'react-icons/lu'

import type { LibraryEpisode } from '@/lib/add-tracks'
import { useAddTracksFlow } from '@/lib/add-tracks'

import { AddTracksProcessingStep } from './AddTracksProcessingStep'
import { AddTracksSyncStep } from './AddTracksSyncStep'
import { DonorFolderStep } from './DonorFolderStep'
import { FileMatchingStep } from './FileMatchingStep'
import { TrackSelectionStep } from './TrackSelectionStep'

interface AddTracksWizardDialogProps {
  /** Открыт ли диалог */
  open: boolean
  /** Обработчик закрытия */
  onOpenChange: (open: boolean) => void
  /** ID аниме */
  animeId: string
  /** Название аниме */
  animeName: string
  /** Путь к папке аниме */
  animeFolderPath: string
  /** Эпизоды */
  episodes: LibraryEpisode[]
  /** Фильтр по типу контента (series = только серии, special = только спешлы) */
  contentTypeFilter?: 'series' | 'special'
}

/**
 * Названия шагов
 */
const STEP_NAMES = ['Папка-донор', 'Сопоставление', 'Синхронизация', 'Выбор дорожек', 'Обработка']

/**
 * Получить индекс текущего шага
 */
function getStepIndex(stage: string): number {
  switch (stage) {
    case 'idle':
    case 'folder':
    case 'scanning':
      return 0
    case 'matching':
      return 1
    case 'calibration':
      return 2
    case 'probing':
    case 'selection':
      return 3
    case 'processing':
    case 'done':
    case 'error':
    case 'cancelled':
      return 4
    default:
      return 0
  }
}

/**
 * Компонент индикатора шагов
 */
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <HStack gap={2} justify="center" py={4}>
      {STEP_NAMES.map((name, index) => (
        <HStack key={name} gap={2}>
          <VStack gap={1}>
            <HStack
              w={8}
              h={8}
              borderRadius="full"
              bg={index <= currentStep ? 'primary.solid' : 'bg.emphasized'}
              justify="center"
              align="center"
            >
              <Text fontSize="sm" fontWeight="bold" color="primary.contrast">
                {index + 1}
              </Text>
            </HStack>
            <Text fontSize="xs" color={index <= currentStep ? 'primary.fg' : 'fg.subtle'}>
              {name}
            </Text>
          </VStack>

          {index < STEP_NAMES.length - 1 && (
            <HStack w={8} h="2px" bg={index < currentStep ? 'primary.solid' : 'bg.emphasized'} mt={-4} />
          )}
        </HStack>
      ))}
    </HStack>
  )
}

/**
 * Диалог добавления дорожек
 */
export function AddTracksWizardDialog({
  open,
  onOpenChange,
  animeId,
  animeName,
  animeFolderPath,
  episodes,
  contentTypeFilter,
}: AddTracksWizardDialogProps) {
  const {
    state,
    scanDonorFolder,
    updateMatchManually,
    proceedToCalibration,
    setSyncOffset,
    proceedToSelection,
    toggleTrackSelection,
    selectAllTracksOfType,
    selectByLanguage,
    deselectByLanguage,
    startProcessing,
    cancel,
    reset,
    goBack,
    setConcurrency,
  } = useAddTracksFlow({
    animeId,
    episodes,
    animeFolderPath,
    animeName,
    contentTypeFilter,
  })

  // Сбрасываем при закрытии
  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  // Обработчик закрытия
  const handleClose = useCallback(() => {
    if (state.stage === 'processing') {
      // Не закрываем во время обработки
      return
    }
    onOpenChange(false)
  }, [state.stage, onOpenChange])

  // Кнопка "Далее"
  const handleNext = useCallback(() => {
    switch (state.stage) {
      case 'matching':
        proceedToCalibration()
        break
      case 'calibration':
        proceedToSelection()
        break
      case 'selection':
        startProcessing()
        break
    }
  }, [state.stage, proceedToCalibration, proceedToSelection, startProcessing])

  // Кнопка "Назад"
  const handleBack = useCallback(() => {
    goBack()
  }, [goBack])

  // Можно ли идти дальше
  const canProceed = (): boolean => {
    switch (state.stage) {
      case 'matching':
        // Хотя бы один файл должен быть сопоставлен
        return state.matches.some((m) => m.targetEpisode !== null)
      case 'calibration':
        // Калибровка всегда опциональна — можно пропустить
        return true
      case 'selection':
        // Хотя бы одна дорожка должна быть выбрана
        return state.selectedTracks.length > 0
      default:
        return false
    }
  }

  const currentStep = getStepIndex(state.stage)
  const isProcessing = state.stage === 'processing'
  const isDone = state.stage === 'done'
  const isError = state.stage === 'error' || state.stage === 'cancelled'

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="xl"
      placement="center"
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop bg="overlay.heavy" />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.subtle" borderColor="border">
            <Dialog.Header borderBottomWidth="1px" borderColor="border">
              <HStack gap={2}>
                <Icon as={LuMusic} color="primary.fg" />
                <Dialog.Title>Добавить дорожки</Dialog.Title>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isProcessing}>
                  <LuX />
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body py={4}>
              {/* Индикатор шагов */}
              <StepIndicator currentStep={currentStep} />

              {/* Контент шага */}
              {(state.stage === 'idle' || state.stage === 'folder' || state.stage === 'scanning') && (
                <DonorFolderStep
                  donorPath={state.donorPath}
                  donorFiles={state.donorFiles}
                  isScanning={state.stage === 'scanning'}
                  onFolderSelect={scanDonorFolder}
                />
              )}

              {state.stage === 'matching' && (
                <FileMatchingStep
                  matches={state.matches}
                  libraryEpisodes={episodes}
                  onMatchChange={updateMatchManually}
                />
              )}

              {state.stage === 'calibration' && (
                <AddTracksSyncStep
                  matches={state.matches}
                  libraryEpisodes={episodes}
                  syncOffset={state.syncOffset}
                  onSyncOffsetChange={setSyncOffset}
                />
              )}

              {(state.stage === 'probing' || state.stage === 'selection') && (
                <>
                  {state.stage === 'probing'
                    ? (
                      <VStack py={8}>
                        <Text color="fg.muted">Анализ файлов...</Text>
                      </VStack>
                    )
                    : (
                      <TrackSelectionStep
                        matches={state.matches}
                        probeResults={state.probeResults}
                        selectedTracks={state.selectedTracks}
                        libraryEpisodes={episodes}
                        animeFolderPath={animeFolderPath}
                        onToggleTrack={toggleTrackSelection}
                        onSelectAllOfType={selectAllTracksOfType}
                        onSelectByLanguage={selectByLanguage}
                        onDeselectByLanguage={deselectByLanguage}
                      />
                    )}
                </>
              )}

              {(state.stage === 'processing'
                || state.stage === 'done'
                || state.stage === 'error'
                || state.stage === 'cancelled') && (
                <AddTracksProcessingStep
                  stage={state.stage}
                  progress={state.progress}
                  error={state.error}
                  onCancel={cancel}
                  concurrency={state.concurrency}
                  onConcurrencyChange={setConcurrency}
                />
              )}
            </Dialog.Body>

            <Dialog.Footer borderTopWidth="1px" borderColor="border">
              <HStack justify="space-between" w="full">
                {/* Кнопка "Назад" */}
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isProcessing || isDone}
                  visibility={currentStep > 0 && currentStep < 3 ? 'visible' : 'hidden'}
                >
                  <Icon as={LuArrowLeft} mr={1} />
                  Назад
                </Button>

                {/* Кнопки справа */}
                <HStack gap={2}>
                  {/* Отмена / Закрыть */}
                  {!isDone && !isProcessing && (
                    <Button variant="outline" onClick={handleClose}>
                      Отмена
                    </Button>
                  )}

                  {/* Готово */}
                  {(isDone || isError) && (
                    <Button colorPalette="purple" onClick={handleClose}>
                      <Icon as={LuCheck} mr={1} />
                      Готово
                    </Button>
                  )}

                  {/* Далее */}
                  {(state.stage === 'matching' || state.stage === 'calibration' || state.stage === 'selection') && (
                    <Button colorPalette="purple" onClick={handleNext} disabled={!canProceed()}>
                      {state.stage === 'selection'
                        ? (
                          <>
                            Добавить дорожки
                            <Icon as={LuArrowRight} ml={1} />
                          </>
                        )
                        : (
                          <>
                            Далее
                            <Icon as={LuArrowRight} ml={1} />
                          </>
                        )}
                    </Button>
                  )}
                </HStack>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
