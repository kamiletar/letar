'use client'

import { Button, CloseButton, Dialog, HStack, Icon, Portal, Text, VStack } from '@chakra-ui/react'
import { type ComponentType, type ReactNode, useState } from 'react'
import { LuInfo, LuTrash2, LuTriangleAlert } from 'react-icons/lu'

type ColorPalette = 'red' | 'green' | 'yellow' | 'blue' | 'orange' | 'brand' | 'gray' | 'fg'

/**
 * Вариант диалога подтверждения
 */
export type ConfirmDialogVariant = 'danger' | 'warning' | 'info'

/**
 * Конфигурация стилей для вариантов
 */
const variantConfig: Record<
  ConfirmDialogVariant,
  {
    colorPalette: ColorPalette
    icon: ComponentType
    iconColor: string
  }
> = {
  danger: {
    colorPalette: 'red',
    icon: LuTrash2,
    iconColor: 'red.500',
  },
  warning: {
    colorPalette: 'orange',
    icon: LuTriangleAlert,
    iconColor: 'orange.500',
  },
  info: {
    colorPalette: 'blue',
    icon: LuInfo,
    iconColor: 'blue.500',
  },
}

export interface ConfirmDialogProps {
  /** Состояние открытия диалога */
  isOpen: boolean
  /** Callback при закрытии диалога */
  onClose: () => void
  /** Callback при подтверждении */
  onConfirm: () => void
  /** Заголовок диалога */
  title: string
  /**
   * Описание действия (можно передать ReactNode для кастомного контента)
   */
  description?: ReactNode
  /**
   * Текст кнопки подтверждения
   * @default 'Подтвердить'
   */
  confirmText?: string
  /**
   * Текст кнопки отмены
   * @default 'Отмена'
   */
  cancelText?: string
  /**
   * Цвет кнопки подтверждения.
   * Если указан variant, цвет берётся из варианта.
   * @default 'red'
   */
  colorPalette?: ColorPalette
  /** Состояние загрузки (блокирует кнопки) */
  isPending?: boolean
  /**
   * Закрывать диалог после подтверждения
   * @default true
   */
  closeOnConfirm?: boolean
  /**
   * Вариант диалога — добавляет иконку и определяет цвет
   * Перекрывает colorPalette если указан
   */
  variant?: ConfirmDialogVariant
}

/**
 * Универсальный диалог подтверждения (controlled)
 *
 * @example
 * ```tsx
 * // Простое использование
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Удалить запись?"
 *   description="Это действие нельзя отменить."
 * />
 *
 * // С вариантом
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onConfirm={handleDelete}
 *   title="Удалить занятие?"
 *   description="Занятие будет удалено из расписания."
 *   confirmText="Удалить"
 *   variant="danger"
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  colorPalette: colorPaletteProp = 'red',
  isPending,
  closeOnConfirm = true,
  variant,
}: ConfirmDialogProps) {
  const config = variant ? variantConfig[variant] : null
  const colorPalette = config?.colorPalette ?? colorPaletteProp
  const IconComponent = config?.icon

  const handleConfirm = () => {
    onConfirm()
    if (closeOnConfirm) {
      onClose()
    }
  }

  return (
    <Dialog.Root
      role="alertdialog"
      open={isOpen}
      onOpenChange={(e) => !e.open && !isPending && onClose()}
      size={{ base: 'xs', md: 'sm' }}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <HStack gap={3}>
                {IconComponent && (
                  <Icon boxSize={6} color={config?.iconColor} aria-hidden="true">
                    <IconComponent />
                  </Icon>
                )}
                <Dialog.Title>{title}</Dialog.Title>
              </HStack>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild disabled={isPending}>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>

            {description && (
              <Dialog.Body>
                {typeof description === 'string'
                  ? <Text color="fg.muted">{description}</Text>
                  : (
                    <VStack align="stretch" gap={2}>
                      {description}
                    </VStack>
                  )}
              </Dialog.Body>
            )}

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={isPending}>
                  {cancelText}
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette={colorPalette} onClick={handleConfirm} loading={isPending}>
                {confirmText}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

// ============================================================================
// TriggerConfirmDialog — uncontrolled вариант с trigger
// ============================================================================

export interface TriggerConfirmDialogProps {
  /** Элемент-триггер для открытия диалога */
  trigger: ReactNode
  /** Заголовок диалога */
  title: string
  /** Описание действия */
  description: ReactNode
  /** Callback при подтверждении (поддерживает async) */
  onConfirm: () => void | Promise<void>
  /**
   * Текст кнопки подтверждения
   * @default 'Подтвердить'
   */
  confirmText?: string
  /**
   * Текст кнопки отмены
   * @default 'Отмена'
   */
  cancelText?: string
  /** Цвет кнопки подтверждения */
  colorPalette?: ColorPalette
  /** Внешнее состояние загрузки */
  isLoading?: boolean
}

/**
 * Диалог подтверждения с триггером (uncontrolled)
 *
 * Автоматически управляет открытием/закрытием.
 * Поддерживает async onConfirm — показывает loading и закрывает после завершения.
 *
 * @example
 * ```tsx
 * <TriggerConfirmDialog
 *   trigger={<Button colorPalette="red">Удалить</Button>}
 *   title="Удалить контейнер?"
 *   description="Это действие нельзя отменить."
 *   confirmText="Удалить"
 *   colorPalette="red"
 *   onConfirm={async () => { await deleteContainer(id) }}
 * />
 * ```
 */
export function TriggerConfirmDialog({
  trigger,
  title,
  description,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  colorPalette = 'red',
  onConfirm,
  isLoading = false,
}: TriggerConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    try {
      setLoading(true)
      await onConfirm()
      setOpen(false)
    } catch (error) {
      console.error('Confirm action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)} role="alertdialog">
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {typeof description === 'string' ? <Text color="fg.muted">{description}</Text> : description}
            </Dialog.Body>
            <Dialog.Footer gap="3">
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={loading || isLoading}>
                  {cancelText}
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette={colorPalette} onClick={handleConfirm} loading={loading || isLoading}>
                {confirmText}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

// ============================================================================
// Обёртки для частых случаев
// ============================================================================

/**
 * Обёртка для удаления ресурса (uncontrolled)
 */
export function DeleteConfirmDialog({
  trigger,
  resourceName,
  onConfirm,
  isLoading,
}: {
  trigger: ReactNode
  resourceName: string
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}) {
  return (
    <TriggerConfirmDialog
      trigger={trigger}
      title={`Удалить ${resourceName}?`}
      description={`Это действие нельзя отменить. ${resourceName} будет удален навсегда.`}
      confirmText="Удалить"
      colorPalette="red"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  )
}

/**
 * Обёртка для остановки ресурса (uncontrolled)
 */
export function StopConfirmDialog({
  trigger,
  resourceName,
  onConfirm,
  isLoading,
}: {
  trigger: ReactNode
  resourceName: string
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}) {
  return (
    <TriggerConfirmDialog
      trigger={trigger}
      title={`Остановить ${resourceName}?`}
      description={`Вы уверены, что хотите остановить ${resourceName}?`}
      confirmText="Остановить"
      colorPalette="orange"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  )
}

// ============================================================================
// useConfirmDialog хук
// ============================================================================

/**
 * Хук для управления состоянием диалога подтверждения
 *
 * @example
 * ```tsx
 * const { isOpen, open, close, data } = useConfirmDialog<{ id: string }>()
 *
 * // Открыть с данными
 * open({ id: 'lesson-123' })
 *
 * // В обработчике
 * const handleConfirm = () => {
 *   if (data) {
 *     deleteLesson(data.id)
 *   }
 *   close()
 * }
 * ```
 */
export function useConfirmDialog<T = unknown>() {
  const [state, setState] = useState<{ isOpen: boolean; data: T | null }>({
    isOpen: false,
    data: null,
  })

  const open = (data: T) => {
    setState({ isOpen: true, data })
  }

  const close = () => {
    setState({ isOpen: false, data: null })
  }

  return {
    isOpen: state.isOpen,
    data: state.data,
    open,
    close,
  }
}
