'use client'

import {
  Box,
  Button,
  Center,
  HStack,
  Icon,
  IconButton,
  Image,
  Popover,
  Portal,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { interpolate } from '@letar/forms-core/i18n'
import { useImagePopoverString, useToolbarString } from '@letar/forms-react'
import type { Editor } from '@tiptap/react'
import { type ReactElement, useCallback, useRef, useState } from 'react'
import { LuImage, LuUpload, LuX } from 'react-icons/lu'

/**
 * Image upload configuration
 */
export interface ImageUploadConfig {
  /** URL endpoint for upload */
  endpoint: string
  /** Категория изображения (для upload API) */
  category?: string
  /** Maximum file size in bytes (by default: 10MB) */
  maxSize?: number
  /** Разрешённые MIME typeы (by default: ['image/*']) */
  acceptTypes?: string[]
}

/**
 * Props для ImagePopover
 */
interface ImagePopoverProps {
  editor: Editor
  config: ImageUploadConfig
  disabled?: boolean
}

/** Loading states */
type UploadState = 'idle' | 'uploading' | 'error'

/**
 * Component для loading и вставки изображений в RichText редактор
 *
 * Использует Popover с drag-n-drop зоной и кнопкой выбора fileа.
 * После успешной loading вставляет изображение в редактор.
 */
export function ImagePopover({ editor, config, disabled }: ImagePopoverProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Без noProviderLocale: контракт Chakra-скина без FormI18nProvider — английский (см. field-rich-text-impl.tsx).
  const insertImageLabel = useToolbarString('formToolbar.image')
  const dropHintLabel = useImagePopoverString('formImagePopover.dropHint')
  const dropHintSubLabel = useImagePopoverString('formImagePopover.dropHintSub')
  const sizeHintTemplate = useImagePopoverString('formImagePopover.sizeHint')
  const cancelLabel = useImagePopoverString('formImagePopover.cancel')
  const loadingLabel = useImagePopoverString('formImagePopover.loading')
  const tryAgainLabel = useImagePopoverString('formImagePopover.tryAgain')
  const errorNotImageMessage = useImagePopoverString('formImagePopover.errorNotImage')
  const errorSizeExceededTemplate = useImagePopoverString('formImagePopover.errorSizeExceeded')
  const errorGenericMessage = useImagePopoverString('formImagePopover.errorGeneric')
  const errorUrlMissingMessage = useImagePopoverString('formImagePopover.errorUrlMissing')

  const maxSize = config.maxSize ?? 10 * 1024 * 1024 // 10MB by default
  const acceptTypes = config.acceptTypes ?? ['image/*']

  /**
   * Close popover and reset state
   *
   * Объявлен раньше handleUpload (который на него ссылается) намеренно: react-compiler
   * (react/immutability) считает forward-reference на `const`, объявленный позже в том же
   * компоненте, недопустимым доступом «во время инициализации», даже если фактический вызов
   * отложен внутрь колбэка. Перестановка убирает предупреждение без изменения поведения —
   * порядок объявления `useCallback` не влияет на семантику замыкания.
   */
  const handleClose = useCallback(() => {
    setIsOpen(false)
    setUploadState('idle')
    setErrorMessage(null)
    setPreviewUrl(null)
    setIsDragging(false)
  }, [])

  /**
   * File upload на сервер
   */
  const handleUpload = useCallback(
    async (file: File) => {
      // Проверка typeа fileа
      if (!file.type.startsWith('image/')) {
        setErrorMessage(errorNotImageMessage)
        setUploadState('error')
        return
      }

      // Проверка sizeа
      if (file.size > maxSize) {
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0)
        setErrorMessage(interpolate(errorSizeExceededTemplate, { size: maxSizeMB }))
        setUploadState('error')
        return
      }

      // Создаём preview
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)
      setUploadState('uploading')
      setErrorMessage(null)

      try {
        const formData = new FormData()
        formData.append('file', file)
        if (config.category) {
          formData.append('category', config.category)
        }

        const response = await fetch(config.endpoint, {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || errorGenericMessage)
        }

        if (result.url) {
          // Insert image into editor
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(editor.chain().focus() as any).setImage({ src: result.url }).run()
          handleClose()
        } else {
          throw new Error(errorUrlMissingMessage)
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : errorGenericMessage)
        setUploadState('error')
      } finally {
        // Clean up preview URL
        if (preview) {
          URL.revokeObjectURL(preview)
        }
      }
    },
    [
      editor,
      config,
      maxSize,
      handleClose,
      errorNotImageMessage,
      errorSizeExceededTemplate,
      errorGenericMessage,
      errorUrlMissingMessage,
    ],
  )

  /**
   * Handle file selection via input
   */
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleUpload(file)
      }
      // Reset input for re-selecting the same file
      e.target.value = ''
    },
    [handleUpload],
  )

  /**
   * Handle drop event
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleUpload(file)
      }
    },
    [handleUpload],
  )

  /**
   * Повторная попытка after ошибки
   */
  const handleRetry = useCallback(() => {
    setUploadState('idle')
    setErrorMessage(null)
    setPreviewUrl(null)
  }, [])

  return (
    <Popover.Root open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
      <Popover.Trigger asChild>
        <IconButton
          aria-label={insertImageLabel}
          size="sm"
          variant="ghost"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
        >
          <LuImage />
        </IconButton>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content width="320px">
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Body p={3}>
              {/* State: idle - зона loading */}
              {uploadState === 'idle' && (
                <VStack gap={3} align="stretch">
                  <Box
                    p={6}
                    borderWidth="2px"
                    borderStyle="dashed"
                    borderColor={isDragging ? 'colorPalette.500' : 'border'}
                    borderRadius="md"
                    bg={isDragging ? 'colorPalette.50' : 'bg.subtle'}
                    transition="all 0.2s"
                    cursor="pointer"
                    _hover={{ borderColor: 'colorPalette.400' }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                    }}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Center>
                      <VStack gap={2}>
                        <Icon fontSize="2xl" color="fg.muted">
                          <LuUpload />
                        </Icon>
                        <Text fontSize="sm" fontWeight="medium" textAlign="center">
                          {dropHintLabel}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          {dropHintSubLabel}
                        </Text>
                      </VStack>
                    </Center>
                  </Box>

                  <Text fontSize="xs" color="fg.muted" textAlign="center">
                    {interpolate(sizeHintTemplate, { size: (maxSize / 1024 / 1024).toFixed(0) })}
                  </Text>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptTypes.join(',')}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />

                  <HStack justify="flex-end">
                    <Button size="sm" variant="ghost" onClick={handleClose}>
                      {cancelLabel}
                    </Button>
                  </HStack>
                </VStack>
              )}

              {/* State: uploading - uploading */}
              {uploadState === 'uploading' && (
                <VStack gap={3} align="stretch">
                  {previewUrl && (
                    <Box borderRadius="md" overflow="hidden" bg="bg.subtle">
                      <Image src={previewUrl} alt="Preview" maxH="150px" w="100%" objectFit="contain" />
                    </Box>
                  )}
                  <Center py={2}>
                    <HStack gap={2}>
                      <Spinner size="sm" color="colorPalette.500" />
                      <Text fontSize="sm" color="fg.muted">
                        {loadingLabel}
                      </Text>
                    </HStack>
                  </Center>
                </VStack>
              )}

              {/* State: error - error */}
              {uploadState === 'error' && (
                <VStack gap={3} align="stretch">
                  {previewUrl && (
                    <Box borderRadius="md" overflow="hidden" bg="bg.subtle" position="relative">
                      <Image src={previewUrl} alt="Preview" maxH="150px" w="100%" objectFit="contain" opacity={0.5} />
                      <Center position="absolute" inset={0} bg="blackAlpha.500" borderRadius="md">
                        <Icon color="red.400" fontSize="2xl">
                          <LuX />
                        </Icon>
                      </Center>
                    </Box>
                  )}
                  <Text fontSize="sm" color="red.400" textAlign="center">
                    {errorMessage}
                  </Text>
                  <HStack justify="center" gap={2}>
                    <Button size="sm" variant="ghost" onClick={handleClose}>
                      {cancelLabel}
                    </Button>
                    <Button size="sm" colorPalette="brand" onClick={handleRetry}>
                      {tryAgainLabel}
                    </Button>
                  </HStack>
                </VStack>
              )}
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
