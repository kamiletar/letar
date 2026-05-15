'use client'

/**
 * TrackEditDialog - Диалог редактирования дорожки
 *
 * Позволяет:
 * - Редактировать title (описание) дорожки
 * - Удалять дорожку с подтверждением
 */

import { Button, Dialog, Fieldset, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

export interface TrackEditDialogProps {
  /** Открыт ли диалог */
  isOpen: boolean
  /** Тип дорожки */
  trackType: 'audio' | 'subtitle'
  /** ID редактируемой дорожки */
  trackId: string | number | null
  /** Текущий title */
  currentTitle?: string
  /** Текущий язык (для отображения) */
  currentLanguage?: string
  /** Callback при сохранении */
  onSave: (trackId: string | number, newTitle: string) => void
  /** Callback при удалении */
  onDelete: (trackId: string | number) => void
  /** Callback при закрытии */
  onClose: () => void
}

/** Получить название языка */
function getLanguageName(langCode?: string): string {
  if (!langCode) {
    return 'Неизвестный'
  }

  const languageNames: Record<string, string> = {
    rus: 'Русский',
    ru: 'Русский',
    eng: 'Английский',
    en: 'Английский',
    jpn: 'Японский',
    ja: 'Японский',
    und: 'Неопределённый',
  }

  return languageNames[langCode.toLowerCase()] || langCode
}

/**
 * TrackEditDialog компонент
 */
export function TrackEditDialog({
  isOpen,
  trackType,
  trackId,
  currentTitle,
  currentLanguage,
  onSave,
  onDelete,
  onClose,
}: TrackEditDialogProps) {
  const [title, setTitle] = useState(currentTitle || '')
  const [isDeleting, setIsDeleting] = useState(false)

  // Синхронизация title при открытии
  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle || '')
      setIsDeleting(false)
    }
  }, [isOpen, currentTitle])

  const handleSave = useCallback(() => {
    if (trackId !== null) {
      onSave(trackId, title)
      onClose()
    }
  }, [trackId, title, onSave, onClose])

  const handleDelete = useCallback(() => {
    if (trackId !== null) {
      onDelete(trackId)
      onClose()
    }
  }, [trackId, onDelete, onClose])

  const typeLabel = trackType === 'audio' ? 'аудиодорожки' : 'субтитров'
  const typeLabelDelete = trackType === 'audio' ? 'аудиодорожку' : 'субтитры'

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop bg="blackAlpha.800" />
      <Dialog.Positioner>
        <Dialog.Content bg="bg.panel" borderColor="border.subtle" maxW="md">
          <Dialog.Header borderBottom="1px" borderColor="border.subtle">
            <Dialog.Title color="fg">
              {isDeleting ? `Удаление ${typeLabel}` : `Редактирование ${typeLabel}`}
            </Dialog.Title>
          </Dialog.Header>

          <Dialog.Body py={4}>
            {isDeleting ? (
              <VStack gap={4} align="start">
                <Text color="fg.muted">Вы уверены, что хотите удалить {typeLabelDelete}?</Text>
                <Text color="fg.subtle" fontSize="sm">
                  {getLanguageName(currentLanguage)}
                  {currentTitle ? ` — ${currentTitle}` : ''}
                </Text>
                <Text color="red.400" fontSize="sm">
                  Это действие нельзя отменить. Файл будет удалён с диска.
                </Text>
              </VStack>
            ) : (
              <Fieldset.Root>
                <Fieldset.Content>
                  <Fieldset.Legend color="fg.muted">Описание</Fieldset.Legend>
                  <Text color="fg.subtle" fontSize="sm" mb={2}>
                    Язык: {getLanguageName(currentLanguage)}
                  </Text>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Дубляж от Studio"
                    bg="bg.subtle"
                    borderColor="border.subtle"
                    _hover={{ borderColor: 'border.subtle' }}
                    _focus={{ borderColor: 'purple.400' }}
                  />
                </Fieldset.Content>
              </Fieldset.Root>
            )}
          </Dialog.Body>

          <Dialog.Footer borderTop="1px" borderColor="border.subtle">
            {isDeleting ? (
              <HStack gap={2} w="full" justify="flex-end">
                <Button variant="ghost" onClick={() => setIsDeleting(false)}>
                  Отмена
                </Button>
                <Button colorPalette="red" onClick={handleDelete}>
                  Удалить
                </Button>
              </HStack>
            ) : (
              <HStack gap={2} w="full" justify="space-between">
                <Button variant="ghost" colorPalette="red" onClick={() => setIsDeleting(true)}>
                  Удалить
                </Button>
                <HStack gap={2}>
                  <Button variant="ghost" onClick={onClose}>
                    Отмена
                  </Button>
                  <Button colorPalette="purple" onClick={handleSave}>
                    Сохранить
                  </Button>
                </HStack>
              </HStack>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
