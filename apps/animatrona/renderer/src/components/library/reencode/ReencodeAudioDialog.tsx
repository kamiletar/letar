'use client'

/**
 * Диалог перекодировки аудиодорожек аниме
 */

import { CloseButton, Dialog, HStack, Icon, Portal, Text } from '@chakra-ui/react'
import { LuAudioLines } from 'react-icons/lu'

import { ReencodePreviewStep } from './ReencodePreviewStep'
import { ReencodeProgressStep } from './ReencodeProgressStep'
import { ReencodeResultStep } from './ReencodeResultStep'
import { useReencodeDialogState } from './use-reencode-dialog-state'

export interface ReencodeAudioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  animeId: string
  targetBitrate: number
}

export function ReencodeAudioDialog({ open, onOpenChange, animeId, targetBitrate }: ReencodeAudioDialogProps) {
  const state = useReencodeDialogState({ animeId, targetBitrate, open, onOpenChange })

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        // Не закрывать во время перекодировки
        if (!state.isReencoding) {
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
                  <Icon as={LuAudioLines} color="purple.400" />
                  <Text>Перекодировка аудио</Text>
                </HStack>
              </Dialog.Title>
            </Dialog.Header>

            {state.step === 'preview' && <ReencodePreviewStep state={state} />}
            {state.step === 'progress' && <ReencodeProgressStep state={state} />}
            {state.step === 'result' && <ReencodeResultStep state={state} />}

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
