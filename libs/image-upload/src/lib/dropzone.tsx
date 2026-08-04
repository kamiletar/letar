'use client'

import type { BoxProps } from '@chakra-ui/react'
import { Box, Icon, Text, VStack } from '@chakra-ui/react'
import { type DragEvent, type ReactNode, useCallback, useRef, useState } from 'react'
import { LuImagePlus, LuUpload } from 'react-icons/lu'

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
      if (files && files.length > 0) {
        onFilesSelected(files)
      }
    },
    [disabled, onFilesSelected],
  )

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      {...boxProps}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
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
