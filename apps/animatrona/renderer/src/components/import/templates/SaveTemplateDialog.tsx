'use client'

/**
 * Диалог сохранения шаблона импорта
 *
 * Позволяет сохранить текущие настройки кодирования как
 * новый шаблон для последующего использования.
 */

import { Badge, Box, Button, Dialog, Field, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuBookmarkPlus, LuCpu, LuMonitor, LuSave, LuTarget, LuX } from 'react-icons/lu'
import type { ImportTemplateCreateData } from '../../../../../shared/types/import-template'

import { useTemplates } from '../../../hooks/useTemplates'

interface SaveTemplateDialogProps {
  /** Открыт ли диалог */
  open: boolean
  /** Колбэк закрытия */
  onClose: () => void
  /** Текущие настройки для сохранения */
  currentSettings: {
    profileId: string | null
    profileName?: string
    vmafEnabled: boolean
    targetVmaf: number
    audioMaxConcurrent: number
    videoMaxConcurrent: number
  }
  /** Колбэк после успешного сохранения */
  onSaved?: () => void
}

/**
 * Диалог сохранения шаблона
 */
export function SaveTemplateDialog({ open, onClose, currentSettings, onSaved }: SaveTemplateDialogProps) {
  const { createTemplate } = useTemplates()
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Введите название шаблона')
      return
    }

    if (!currentSettings.profileId) {
      setError('Не выбран профиль кодирования')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const data: ImportTemplateCreateData = {
        name: name.trim(),
        profileId: currentSettings.profileId,
        vmafSettings: {
          enabled: currentSettings.vmafEnabled,
          targetVmaf: currentSettings.targetVmaf,
        },
        audioMaxConcurrent: currentSettings.audioMaxConcurrent,
        videoMaxConcurrent: currentSettings.videoMaxConcurrent,
      }

      const result = await createTemplate(data)
      if (result) {
        setName('')
        onSaved?.()
        onClose()
      } else {
        setError('Не удалось сохранить шаблон')
      }
    } catch {
      setError('Ошибка при сохранении шаблона')
    } finally {
      setIsSaving(false)
    }
  }, [name, currentSettings, createTemplate, onSaved, onClose])

  const handleClose = useCallback(() => {
    setName('')
    setError(null)
    onClose()
  }, [onClose])

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && handleClose()} placement="center" size="sm">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="bg.panel">
          <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
            <HStack justify="space-between" w="full">
              <HStack gap={2}>
                <LuBookmarkPlus color="var(--chakra-colors-purple-400)" size={20} />
                <Dialog.Title fontSize="lg">Сохранить шаблон</Dialog.Title>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Закрыть" variant="ghost" size="sm">
                  <LuX />
                </IconButton>
              </Dialog.CloseTrigger>
            </HStack>
          </Dialog.Header>

          <Dialog.Body py={4}>
            <VStack gap={4} align="stretch">
              {/* Поле ввода названия */}
              <Field.Root invalid={!!error}>
                <Field.Label fontSize="sm">Название шаблона</Field.Label>
                <Input
                  placeholder="Например: Качество BD-rip"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError(null)
                  }}
                  autoFocus
                />
                {error && <Field.ErrorText>{error}</Field.ErrorText>}
              </Field.Root>

              {/* Превью настроек */}
              <Box p={3} bg="bg.subtle" borderRadius="md" borderWidth="1px" borderColor="border.subtle">
                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="medium" color="fg.subtle">
                    Настройки для сохранения:
                  </Text>

                  {/* Профиль */}
                  {currentSettings.profileName && (
                    <HStack gap={2}>
                      <Text fontSize="xs" color="fg.muted">
                        Профиль:
                      </Text>
                      <Badge colorPalette="purple" size="sm">
                        {currentSettings.profileName}
                      </Badge>
                    </HStack>
                  )}

                  {/* VMAF */}
                  <HStack gap={2}>
                    <LuTarget
                      color={currentSettings.vmafEnabled
                        ? 'var(--chakra-colors-yellow-400)'
                        : 'var(--chakra-colors-fg-muted)'}
                      size={16}
                    />
                    <Text fontSize="xs" color="fg.subtle">
                      {currentSettings.vmafEnabled
                        ? `VMAF подбор: ${currentSettings.targetVmaf}`
                        : 'VMAF подбор: выключен'}
                    </Text>
                  </HStack>

                  {/* Параллельность */}
                  <HStack gap={4}>
                    <HStack gap={1}>
                      <LuMonitor color="var(--chakra-colors-purple-400)" size={16} />
                      <Text fontSize="xs" color="fg.subtle">
                        {currentSettings.videoMaxConcurrent} видео
                      </Text>
                    </HStack>
                    <HStack gap={1}>
                      <LuCpu color="var(--chakra-colors-green-400)" size={16} />
                      <Text fontSize="xs" color="fg.subtle">
                        {currentSettings.audioMaxConcurrent} аудио
                      </Text>
                    </HStack>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle">
            <HStack gap={2}>
              <Button variant="ghost" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                colorPalette="purple"
                onClick={handleSave}
                loading={isSaving}
                disabled={!name.trim() || !currentSettings.profileId}
              >
                <LuSave />
                Сохранить
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
