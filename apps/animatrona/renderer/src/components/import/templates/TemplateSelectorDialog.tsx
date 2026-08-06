'use client'

/**
 * Диалог выбора шаблона импорта
 *
 * Позволяет выбрать ранее сохранённый шаблон и применить
 * его настройки к текущему импорту.
 */

import { Badge, Box, Button, Dialog, HStack, Icon, IconButton, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuBookmark, LuCpu, LuMonitor, LuTarget, LuTrash2, LuX } from 'react-icons/lu'
import type { ImportTemplate } from '../../../../../shared/types/import-template'

import { useTemplates } from '../../../hooks/useTemplates'

interface TemplateSelectorDialogProps {
  /** Открыт ли диалог */
  open: boolean
  /** Колбэк закрытия */
  onClose: () => void
  /** Колбэк выбора шаблона */
  onSelect: (template: ImportTemplate) => void
}

/**
 * Форматирование даты последнего использования
 */
function formatLastUsed(date?: string): string {
  if (!date) {
    return 'Не использовался'
  }

  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return 'Сегодня'
  }
  if (days === 1) {
    return 'Вчера'
  }
  if (days < 7) {
    return `${days} дн. назад`
  }
  if (days < 30) {
    return `${Math.floor(days / 7)} нед. назад`
  }
  return d.toLocaleDateString('ru-RU')
}

/**
 * Карточка шаблона
 */
function TemplateCard({
  template,
  onSelect,
  onDelete,
}: {
  template: ImportTemplate
  onSelect: () => void
  onDelete: () => void
}) {
  const isDefault = template.id.startsWith('default-')

  return (
    <Box
      p={3}
      bg="bg.subtle"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="md"
      _hover={{ borderColor: 'border.emphasized', bg: 'bg.muted' }}
      cursor="pointer"
      transition="all 0.2s"
      onClick={onSelect}
    >
      <VStack align="stretch" gap={2}>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Icon as={LuBookmark} color="purple.400" boxSize={4} />
            <Text fontWeight="medium" fontSize="sm">
              {template.name}
            </Text>
            {isDefault && (
              <Badge colorPalette="blue" size="sm">
                Встроенный
              </Badge>
            )}
          </HStack>
          {!isDefault && (
            <IconButton
              aria-label="Удалить шаблон"
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <LuTrash2 />
            </IconButton>
          )}
        </HStack>

        <HStack gap={4} flexWrap="wrap">
          {/* VMAF статус */}
          {template.vmafSettings.enabled
            ? (
              <HStack gap={1}>
                <Icon as={LuTarget} color="yellow.400" boxSize={3} />
                <Text fontSize="xs" color="fg.subtle">
                  VMAF {template.vmafSettings.targetVmaf}
                </Text>
              </HStack>
            )
            : (
              <Text fontSize="xs" color="fg.muted">
                Без VMAF
              </Text>
            )}

          {/* Параллельность */}
          <HStack gap={1}>
            <Icon as={LuMonitor} color="purple.400" boxSize={3} />
            <Text fontSize="xs" color="fg.subtle">
              {template.videoMaxConcurrent} видео
            </Text>
          </HStack>
          <HStack gap={1}>
            <Icon as={LuCpu} color="green.400" boxSize={3} />
            <Text fontSize="xs" color="fg.subtle">
              {template.audioMaxConcurrent} аудио
            </Text>
          </HStack>
        </HStack>

        <Text fontSize="xs" color="fg.muted">
          {formatLastUsed(template.lastUsedAt)}
        </Text>
      </VStack>
    </Box>
  )
}

/**
 * Диалог выбора шаблона
 */
export function TemplateSelectorDialog({ open, onClose, onSelect }: TemplateSelectorDialogProps) {
  const { templates, isLoading, deleteTemplate } = useTemplates()

  const handleSelect = (template: ImportTemplate) => {
    onSelect(template)
    onClose()
  }

  const handleDelete = async (id: string) => {
    await deleteTemplate(id)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} placement="center" size="md">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="bg.panel" maxH="80vh">
          <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
            <HStack justify="space-between" w="full">
              <Dialog.Title fontSize="lg">Выбрать шаблон</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Закрыть" variant="ghost" size="sm">
                  <LuX />
                </IconButton>
              </Dialog.CloseTrigger>
            </HStack>
          </Dialog.Header>

          <Dialog.Body py={4} overflowY="auto">
            {isLoading
              ? (
                <VStack py={8}>
                  <Spinner size="lg" color="purple.400" />
                  <Text color="fg.subtle">Загрузка шаблонов...</Text>
                </VStack>
              )
              : templates.length === 0
              ? (
                <VStack py={8} gap={2}>
                  <Icon as={LuBookmark} boxSize={12} color="fg.muted" />
                  <Text color="fg.subtle">Нет сохранённых шаблонов</Text>
                  <Text fontSize="sm" color="fg.muted">
                    Создайте шаблон, чтобы быстро применять настройки
                  </Text>
                </VStack>
              )
              : (
                <VStack gap={2} align="stretch">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleSelect(template)}
                      onDelete={() => handleDelete(template.id)}
                    />
                  ))}
                </VStack>
              )}
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle">
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
