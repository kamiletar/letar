'use client'

import type { BoxProps } from '@chakra-ui/react'
import { Box, Icon, Text, VStack } from '@chakra-ui/react'
import { type DragEvent, type ReactNode, useCallback, useRef, useState } from 'react'
import { LuImagePlus, LuUpload } from 'react-icons/lu'
import { isFileAccepted } from './accept-match'

export interface DropzoneProps extends Omit<BoxProps, 'onChange'> {
  /**
   * Callback при выборе файлов
   */
  onFilesSelected: (files: FileList) => void
  /**
   * Принимать несколько файлов
   * @default false
   */
  multiple?: boolean
  /**
   * MIME типы (для input accept)
   * @default 'image/*'
   */
  accept?: string
  /**
   * Отключить dropzone
   */
  disabled?: boolean
  /**
   * Кастомный контент
   */
  children?: ReactNode
  /**
   * Callback при перетаскивании файлов, не прошедших `accept`.
   *
   * Нативный диалог выбора файла фильтрует формат сам (браузер подсказывает по
   * `accept`), а drag-and-drop — нет: без этого колбэка отклонённые файлы
   * просто не попадают в `onFilesSelected`, без уведомления пользователя.
   */
  onRejected?: (files: File[], reason: string) => void
}

const REJECTED_FORMAT_REASON = 'Неподдерживаемый формат файла'

/**
 * Собирает объект, совместимый с `FileList` (индексы, `length`, `item()`), из
 * обычного массива — без него нечем заменить `dataTransfer.files` после
 * фильтрации: `FileList` нельзя создать напрямую вне `DataTransfer`.
 */
function toFileList(files: File[]): FileList {
  return Object.assign(files, {
    item: (index: number) => files[index] ?? null,
  }) as unknown as FileList
}

/**
 * Базовый компонент Dropzone для drag-and-drop загрузки файлов
 *
 * Цвета берутся из `colorPalette` темы — своих оттенков компонент не задаёт,
 * поэтому одинаково выглядит в светлой и тёмной теме.
 *
 * @example
 * ```tsx
 * <Dropzone
 *   onFilesSelected={(files) => console.log(files)}
 *   multiple
 *   colorPalette="purple"
 * />
 * ```
 */
export function Dropzone({
  onFilesSelected,
  multiple = false,
  accept = 'image/*',
  disabled = false,
  children,
  onRejected,
  colorPalette = 'blue',
  ...boxProps
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setIsDragOver(true)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (disabled) {
        return
      }

      const { files } = e.dataTransfer
      if (!files || files.length === 0) {
        return
      }

      const accepted: File[] = []
      const rejected: File[] = []
      for (const file of Array.from(files)) {
        if (isFileAccepted(file, accept)) {
          accepted.push(file)
        } else {
          rejected.push(file)
        }
      }

      if (rejected.length > 0) {
        onRejected?.(rejected, REJECTED_FORMAT_REASON)
      }

      if (accepted.length > 0) {
        onFilesSelected(toFileList(accepted))
      }
    },
    [disabled, accept, onFilesSelected, onRejected],
  )

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault()
        inputRef.current?.click()
      }
    },
    [disabled],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target
      if (files && files.length > 0) {
        onFilesSelected(files)
      }
      // Сбросить input для возможности повторной загрузки
      e.target.value = ''
    },
    [onFilesSelected],
  )

  return (
    <Box
      position="relative"
      colorPalette={colorPalette}
      borderWidth="2px"
      borderStyle="dashed"
      borderColor={isDragOver ? 'colorPalette.solid' : disabled ? 'border' : 'colorPalette.muted'}
      borderRadius="lg"
      bg={isDragOver ? 'colorPalette.subtle' : disabled ? 'bg.muted' : 'transparent'}
      p={6}
      textAlign="center"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      opacity={disabled ? 0.6 : 1}
      transition="all 0.2s"
      _hover={disabled
        ? undefined
        : {
          borderColor: 'colorPalette.emphasized',
          bg: 'colorPalette.subtle',
        }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      _focusVisible={{ outline: '2px solid', outlineColor: 'colorPalette.solid', outlineOffset: '2px' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...boxProps}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {children || (
        <VStack gap={2} color={disabled ? 'fg.subtle' : 'colorPalette.fg'}>
          <Icon boxSize={10}>{isDragOver ? <LuUpload /> : <LuImagePlus />}</Icon>
          <Text fontWeight="medium">{isDragOver ? 'Отпустите для загрузки' : 'Перетащите изображения сюда'}</Text>
          <Text fontSize="sm" color="fg.muted">
            или нажмите для выбора
          </Text>
        </VStack>
      )}
    </Box>
  )
}
