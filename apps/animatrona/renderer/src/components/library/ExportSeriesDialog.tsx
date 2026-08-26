'use client'

import { CloseButton, Dialog, HStack, Portal, Text } from '@chakra-ui/react'
import { LuDownload } from 'react-icons/lu'

import { ExportConfigStep, ExportProgressStep, ExportResultStep, type ExportSeriesDialogProps } from './export'
import { useExportDialogState } from './export/use-export-dialog-state'

/**
 * Диалог экспорта сериала в MKV
 */
export function ExportSeriesDialog({ open, onOpenChange, anime, defaultExportPath }: ExportSeriesDialogProps) {
  const state = useExportDialogState({ anime, defaultExportPath, open, onOpenChange })

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        // Не закрывать во время экспорта
        if (!state.isExporting) {
          onOpenChange(e.open)
        }
      }}
      size="lg"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                <HStack>
                  <LuDownload color="var(--chakra-colors-purple-400)" />
                  <Text>Экспорт сериала</Text>
                </HStack>
              </Dialog.Title>
            </Dialog.Header>

            {state.step === 'config' && (
              <ExportConfigStep
                state={state}
                anime={anime}
                onClose={() => onOpenChange(false)}
              />
            )}
            {state.step === 'progress' && <ExportProgressStep state={state} />}
            {(state.step === 'done' || state.step === 'result') && (
              <ExportResultStep
                state={state}
                onClose={() => onOpenChange(false)}
              />
            )}

            {!state.isExporting && (
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
