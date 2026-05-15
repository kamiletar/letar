'use client'

/**
 * Диалог пакетной публикации аниме на трекер
 *
 * Три шага:
 * 1. SelectStep — выбор аниме по watchStatus
 * 2. ProgressStep — прогресс публикации
 * 3. ResultStep — итоги
 */

import { CloseButton, Dialog, HStack, Icon, Portal, Text } from '@chakra-ui/react'
import { LuGlobe } from 'react-icons/lu'

import { ProgressStep } from './ProgressStep'
import { ResultStep } from './ResultStep'
import { SelectStep } from './SelectStep'
import type { BatchAnimeItem } from './use-batch-publish'
import { useBatchPublish } from './use-batch-publish'

interface BatchPublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  animes: BatchAnimeItem[]
  onPublished?: () => void
}

export function BatchPublishDialog({ open, onOpenChange, animes, onPublished }: BatchPublishDialogProps) {
  const batch = useBatchPublish(animes)

  const handleClose = () => {
    if (batch.isPublishing) {
      return
    } // Не закрываем во время публикации
    onOpenChange(false)
    // Сброс при закрытии
    setTimeout(() => batch.reset(), 300)
    if (batch.result && batch.result.successCount > 0) {
      onPublished?.()
    }
  }

  const titles: Record<string, string> = {
    select: 'Пакетная публикация на трекер',
    progress: 'Публикация...',
    result: 'Результаты публикации',
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!batch.isPublishing) {
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
                  <Icon as={LuGlobe} color="blue.500" />
                  <Text>{titles[batch.step]}</Text>
                </HStack>
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              {batch.step === 'select' && (
                <SelectStep
                  filteredAnimes={batch.filteredAnimes}
                  selectedIds={batch.selectedIds}
                  watchStatusFilter={batch.watchStatusFilter}
                  onWatchStatusFilterChange={batch.setWatchStatusFilter}
                  onToggleSelection={batch.toggleSelection}
                  onSelectAll={batch.selectAll}
                  onDeselectAll={batch.deselectAll}
                  onSelectUnpublished={batch.selectUnpublished}
                  onStart={batch.startPublish}
                />
              )}

              {batch.step === 'progress' && (
                <ProgressStep
                  current={batch.current}
                  total={batch.total}
                  currentAnimeName={batch.currentAnimeName}
                  processedItems={batch.processedItems}
                  isPublishing={batch.isPublishing}
                  onCancel={batch.cancelPublish}
                />
              )}

              {batch.step === 'result' && batch.result && (
                <ResultStep result={batch.result} onClose={handleClose} onRetry={batch.reset} />
              )}
            </Dialog.Body>

            {!batch.isPublishing && (
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
