'use client'

/**
 * Диалог пакетной перекодировки аудиодорожек
 * Пережимает аудио во всех аниме, где дорожки ещё не оптимизированы
 */

import { CloseButton, Dialog, HStack, Icon, Portal, Text } from '@chakra-ui/react'
import { LuAudioLines } from 'react-icons/lu'

import { BatchReencodePreviewStep } from './BatchReencodePreviewStep'
import { BatchReencodeProgressStep } from './BatchReencodeProgressStep'
import { BatchReencodeResultStep } from './BatchReencodeResultStep'
import { useBatchReencodeState } from './use-batch-reencode-state'

export interface BatchReencodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}

export function BatchReencodeDialog({ open, onOpenChange, onCompleted }: BatchReencodeDialogProps) {
  const state = useBatchReencodeState({
    open,
    onOpenChange: (v) => {
      onOpenChange(v)
      if (!v && state.result) {
        onCompleted?.()
      }
    },
  })

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        // Не закрывать во время перекодировки
        if (!state.isReencoding) {
          onOpenChange(e.open)
          if (!e.open && state.result) {
            onCompleted?.()
          }
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
                  <Icon as={LuAudioLines} color="purple.400" />
                  <Text>Пакетная перекодировка аудио</Text>
                </HStack>
              </Dialog.Title>
            </Dialog.Header>

            {state.step === 'preview' && <BatchReencodePreviewStep state={state} />}
            {state.step === 'progress' && <BatchReencodeProgressStep state={state} />}
            {state.step === 'result' && <BatchReencodeResultStep state={state} />}

            {!state.isReencoding && (
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
