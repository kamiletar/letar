'use client'

/**
 * Компонент загрузки обложки стихотворения.
 * Поддерживает drag-n-drop, клик для выбора файла, превью и удаление.
 */

import { getPhotoUrl } from '@/lib/images'
import { Box, Flex, IconButton, Image, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useRef, useState } from 'react'
import { LuImagePlus, LuTrash2 } from 'react-icons/lu'

interface CoverImageUploadProps {
  /** Текущий путь обложки (из БД, напр. "poems/xxx/file.jpg") */
  value: string | null
  /** Колбэк при изменении (путь файла или null при удалении) */
  onChange: (path: string | null) => void
  /** ID стиха (для замены обложки существующего) */
  poemId?: string
}

export function CoverImageUpload({ value, onChange, poemId }: CoverImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Выберите изображение')
        return
      }
      if (file.size > 15 * 1024 * 1024) {
        setError('Максимальный размер — 15 МБ')
        return
      }

      setError(null)
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        if (poemId) { formData.append('poemId', poemId) }

        const res = await fetch('/api/upload/poem-cover', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok || data.error) {
          setError(data.error || 'Ошибка загрузки')
          return
        }
        onChange(data.path)
      } catch {
        setError('Не удалось загрузить изображение')
      } finally {
        setUploading(false)
      }
    },
    [poemId, onChange],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { upload(file) }
    // Сбрасываем input чтобы можно было загрузить тот же файл повторно
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) { upload(file) }
  }

  const handleRemove = () => {
    onChange(null)
  }

  // Превью загруженной обложки
  if (value) {
    const src = value.startsWith('http') ? value : getPhotoUrl(value)
    return (
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Обложка
        </Text>
        <Box position="relative" borderRadius="lg" overflow="hidden" maxW="400px">
          <Image src={src} alt="Обложка стиха" borderRadius="lg" maxH="250px" objectFit="cover" w="100%" />
          <IconButton
            aria-label="Удалить обложку"
            size="sm"
            colorPalette="red"
            variant="solid"
            position="absolute"
            top={2}
            right={2}
            onClick={handleRemove}
          >
            <LuTrash2 />
          </IconButton>
        </Box>
      </Box>
    )
  }

  // Область загрузки
  return (
    <Box>
      <Text fontSize="sm" fontWeight="medium" mb={1}>
        Обложка (опционально)
      </Text>
      <Box
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={dragOver ? 'teal.400' : 'gray.300'}
        borderRadius="lg"
        p={6}
        cursor={uploading ? 'wait' : 'pointer'}
        bg={dragOver ? 'teal.50' : undefined}
        _dark={{ borderColor: dragOver ? 'teal.400' : 'gray.600', bg: dragOver ? 'teal.900/20' : undefined }}
        transitionProperty="border-color, background-color"
        transitionDuration="0.2s"
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        <VStack gap={2}>
          {uploading
            ? (
              <Flex align="center" gap={2}>
                <Spinner size="sm" />
                <Text fontSize="sm" color="gray.500">
                  Загрузка...
                </Text>
              </Flex>
            )
            : (
              <>
                <LuImagePlus size={32} color="var(--chakra-colors-gray-400)" />
                <Text fontSize="sm" color="gray.500">
                  Перетащите изображение или нажмите для выбора
                </Text>
                <Text fontSize="xs" color="gray.400">
                  JPG, PNG, WebP — до 15 МБ
                </Text>
              </>
            )}
        </VStack>
      </Box>
      {error && (
        <Text color="red.500" fontSize="sm" mt={1}>
          {error}
        </Text>
      )}
    </Box>
  )
}
