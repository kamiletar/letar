'use client'

/**
 * Диалог редактирования элемента очереди
 *
 * Позволяет изменить:
 * - VMAF настройки (enabled, targetVmaf)
 * - Выбранные файлы
 *
 * Доступно только для элементов со статусом 'pending'
 */

import { Button, Checkbox, Dialog, HStack, Portal, Slider, Switch, Text, VStack } from '@chakra-ui/react'
import { memo, useCallback, useState } from 'react'
import { LuCpu, LuPencil, LuTarget } from 'react-icons/lu'

import type { ImportQueueAddData, ImportQueueEntry } from '../../../../shared/types/import-queue'

interface EditQueueItemDialogProps {
  /** Элемент очереди для редактирования */
  item: ImportQueueEntry
  /** Callback обновления */
  onUpdate: (itemId: string, data: Partial<ImportQueueAddData>) => Promise<void>
  /** Открыт ли диалог (controlled mode) */
  isOpen?: boolean
  /** Callback закрытия (controlled mode) */
  onClose?: () => void
  /** Триггер (кнопка или иконка) — для uncontrolled mode */
  trigger?: React.ReactNode
}

/**
 * Диалог редактирования элемента очереди
 */
export const EditQueueItemDialog = memo(function EditQueueItemDialog({
  item,
  onUpdate,
  isOpen: controlledIsOpen,
  onClose,
  trigger,
}: EditQueueItemDialogProps) {
  // Uncontrolled mode state
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false)

  // Используем controlled или uncontrolled mode
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen

  const [isLoading, setIsLoading] = useState(false)

  // Локальное состояние для редактирования
  const [vmafEnabled, setVmafEnabled] = useState(item.vmafSettings?.enabled ?? false)
  const [targetVmaf, setTargetVmaf] = useState(item.vmafSettings?.targetVmaf ?? 94)
  const [forceCpu, setForceCpu] = useState(item.forceCpu ?? false)
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(item.files.map((f) => [f.path, f.selected]))
  )

  // Сброс состояния при открытии
  const handleOpenChange = useCallback(
    (e: { open: boolean }) => {
      if (e.open) {
        setVmafEnabled(item.vmafSettings?.enabled ?? false)
        setTargetVmaf(item.vmafSettings?.targetVmaf ?? 94)
        setForceCpu(item.forceCpu ?? false)
        setSelectedFiles(Object.fromEntries(item.files.map((f) => [f.path, f.selected])))
      }

      if (isControlled) {
        if (!e.open) {
          onClose?.()
        }
      } else {
        setUncontrolledIsOpen(e.open)
      }
    },
    [item, isControlled, onClose],
  )

  // Сохранение изменений
  const handleSave = useCallback(async () => {
    setIsLoading(true)
    try {
      const updatedFiles = item.files.map((f) => ({
        ...f,
        selected: selectedFiles[f.path] ?? f.selected,
      }))

      await onUpdate(item.id, {
        vmafSettings: {
          enabled: vmafEnabled,
          targetVmaf,
        },
        files: updatedFiles,
        forceCpu,
      })

      if (isControlled) {
        onClose?.()
      } else {
        setUncontrolledIsOpen(false)
      }
    } finally {
      setIsLoading(false)
    }
  }, [item, vmafEnabled, targetVmaf, forceCpu, selectedFiles, onUpdate, isControlled, onClose])

  // Количество выбранных файлов
  const selectedCount = Object.values(selectedFiles).filter(Boolean).length

  // Доступно только для pending
  if (item.status !== 'pending') {
    return null
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      {/* Trigger только в uncontrolled mode — в controlled кнопка снаружи */}
      {!isControlled && (
        <Dialog.Trigger asChild>
          {trigger ?? (
            <Button size="sm" variant="ghost" aria-label="Редактировать">
              <LuPencil size={16} />
            </Button>
          )}
        </Dialog.Trigger>
      )}

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="500px">
            <Dialog.Header>
              <Dialog.Title>Редактировать элемент</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={6} align="stretch">
                {/* Информация о сериале */}
                <Text fontWeight="medium">{item.selectedAnime.russian || item.selectedAnime.name}</Text>

                {/* VMAF настройки */}
                <VStack gap={3} align="stretch">
                  <HStack justify="space-between">
                    <HStack gap={2}>
                      <LuTarget size={16} color="var(--chakra-colors-yellow-400)" />
                      <Text fontWeight="medium">VMAF подбор CQ</Text>
                    </HStack>
                    <Switch.Root checked={vmafEnabled} onCheckedChange={(e) => setVmafEnabled(e.checked)}>
                      <Switch.HiddenInput />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Root>
                  </HStack>

                  {vmafEnabled && (
                    <VStack gap={2} align="stretch" pl={6}>
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="fg.muted">
                          Целевой VMAF
                        </Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {targetVmaf}
                        </Text>
                      </HStack>
                      <Slider.Root
                        value={[targetVmaf]}
                        onValueChange={(e) => setTargetVmaf(e.value[0])}
                        min={85}
                        max={98}
                        step={1}
                      >
                        <Slider.Control>
                          <Slider.Track>
                            <Slider.Range />
                          </Slider.Track>
                          <Slider.Thumb index={0} />
                        </Slider.Control>
                      </Slider.Root>
                      <Text fontSize="xs" color="fg.muted">
                        Рекомендуется: 93-95 для баланса качества и размера
                      </Text>
                    </VStack>
                  )}
                </VStack>

                {/* Принудительный CPU */}
                <HStack justify="space-between">
                  <HStack gap={2}>
                    <LuCpu size={16} color="var(--chakra-colors-blue-400)" />
                    <VStack gap={0} align="start">
                      <Text fontWeight="medium">Использовать CPU</Text>
                      <Text fontSize="xs" color="fg.muted">
                        libsvtav1 вместо NVENC (1 поток)
                      </Text>
                    </VStack>
                  </HStack>
                  <Switch.Root checked={forceCpu} onCheckedChange={(e) => setForceCpu(e.checked)}>
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </HStack>

                {/* Выбор файлов */}
                <VStack gap={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="medium">
                      Файлы ({selectedCount}/{item.files.length})
                    </Text>
                    <HStack gap={2}>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setSelectedFiles(Object.fromEntries(item.files.map((f) => [f.path, true])))}
                      >
                        Выбрать все
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setSelectedFiles(Object.fromEntries(item.files.map((f) => [f.path, false])))}
                      >
                        Снять все
                      </Button>
                    </HStack>
                  </HStack>

                  <VStack gap={1} align="stretch" maxH="200px" overflowY="auto">
                    {item.files.map((file) => (
                      <Checkbox.Root
                        key={file.path}
                        checked={selectedFiles[file.path]}
                        onCheckedChange={(e) => setSelectedFiles((prev) => ({ ...prev, [file.path]: !!e.checked }))}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        <Checkbox.Label>
                          <Text fontSize="sm" lineClamp={1}>
                            {file.name}
                            {file.episodeNumber && (
                              <Text as="span" color="fg.muted">
                                {' '}
                                (эп. {file.episodeNumber})
                              </Text>
                            )}
                          </Text>
                        </Checkbox.Label>
                      </Checkbox.Root>
                    ))}
                  </VStack>
                </VStack>
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Отмена</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="purple" onClick={handleSave} loading={isLoading} disabled={selectedCount === 0}>
                Сохранить
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
})
