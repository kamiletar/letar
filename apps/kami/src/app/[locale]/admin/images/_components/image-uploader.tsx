'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { ImageCategory } from '@/generated/prisma'
import { Badge, Box, Button, HStack, Icon, Image, NativeSelect, Progress, Text, VStack } from '@chakra-ui/react'
import { ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState, useTransition } from 'react'

interface QueuedFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  result?: {
    id: string
    url: string
  }
}

/**
 * Компонент для загрузки изображений с drag-and-drop.
 */
export function ImageUploader() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDragging, setIsDragging] = useState(false)
  const [category, setCategory] = useState<ImageCategory>('OTHER')
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    addFiles(files)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'))
    addFiles(files)
    // Сбрасываем input для повторного выбора тех же файлов
    e.target.value = ''
  }, [])

  const addFiles = (files: File[]) => {
    const newFiles: QueuedFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }))

    setQueue((prev) => [...prev, ...newFiles])
  }

  const removeFromQueue = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((f) => f.id === id)
      if (item) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  const clearQueue = () => {
    for (const item of queue) {
      URL.revokeObjectURL(item.preview)
    }
    setQueue([])
  }

  const uploadFile = async (item: QueuedFile): Promise<void> => {
    // Обновляем статус на uploading
    setQueue((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f)))

    try {
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('category', category)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки')
      }

      // Успех
      setQueue((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: 'success', progress: 100, result: { id: data.id, url: data.url } } : f
        )
      )
    } catch (error) {
      // Ошибка
      setQueue((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Неизвестная ошибка' }
            : f
        )
      )
    }
  }

  const uploadAll = async () => {
    const pendingFiles = queue.filter((f) => f.status === 'pending')
    if (pendingFiles.length === 0) {
      return
    }

    setIsUploading(true)

    // Загружаем файлы последовательно для контроля нагрузки
    for (const item of pendingFiles) {
      await uploadFile(item)
    }

    setIsUploading(false)

    // Обновляем страницу
    startTransition(() => {
      router.refresh()
    })

    const successCount = queue.filter((f) => f.status === 'success').length + pendingFiles.length
    const errorCount = queue.filter((f) => f.status === 'error').length

    if (errorCount > 0) {
      toaster.warning({
        title: `Загружено ${successCount} из ${successCount + errorCount} файлов`,
        description: `${errorCount} файлов не удалось загрузить`,
      })
    } else {
      toaster.success({
        title: `Загружено ${pendingFiles.length} файлов`,
      })
    }
  }

  const pendingCount = queue.filter((f) => f.status === 'pending').length

  return (
    <VStack gap={4} align="stretch">
      {/* Зона для drag-and-drop */}
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={0}
        p={8}
        border="2px dashed"
        borderColor={isDragging ? 'fg' : 'border'}
        borderRadius="lg"
        bg={isDragging ? { base: 'fg.50', _dark: 'fg.950/30' } : 'transparent'}
        textAlign="center"
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          borderColor: 'fg',
          bg: 'bg.subtle',
        }}
      >
        <VStack gap={2}>
          <Icon boxSize={10} color={isDragging ? 'fg' : 'fg.muted'}>
            <ImagePlus />
          </Icon>
          <Text fontWeight="medium" color={isDragging ? 'fg' : 'fg.muted'}>
            {isDragging ? 'Отпустите файлы' : 'Перетащите изображения сюда'}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            или нажмите для выбора файлов
          </Text>
        </VStack>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileSelect} />
      </Box>

      {/* Очередь файлов */}
      {queue.length > 0 && (
        <VStack gap={4} align="stretch">
          {/* Категория и кнопки */}
          <HStack justify="space-between" wrap="wrap" gap={2}>
            <HStack gap={2}>
              <Text fontSize="sm" fontWeight="medium">
                Категория:
              </Text>
              <NativeSelect.Root size="sm" w={{ base: '100%', sm: '150px' }}>
                <NativeSelect.Field
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ImageCategory)}
                  _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                  aria-disabled={isUploading}
                >
                  <option value="BLOG">Блог</option>
                  <option value="CONTENT">Контент</option>
                  <option value="AVATAR">Аватар</option>
                  <option value="OTHER">Прочее</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>
            <HStack gap={2}>
              <Button size="sm" variant="outline" onClick={clearQueue} disabled={isUploading}>
                <X size={16} /> Очистить
              </Button>
              <Button
                size="sm"
                colorPalette="fg"
                onClick={uploadAll}
                loading={isUploading || isPending}
                disabled={pendingCount === 0}
              >
                <Upload size={16} /> Загрузить ({pendingCount})
              </Button>
            </HStack>
          </HStack>

          {/* Список файлов */}
          <VStack gap={2} align="stretch">
            {queue.map((item) => (
              <HStack
                key={item.id}
                p={2}
                borderRadius="md"
                bg={
                  item.status === 'success'
                    ? { base: 'green.50', _dark: 'green.950/20' }
                    : item.status === 'error'
                      ? { base: 'red.50', _dark: 'red.950/20' }
                      : 'bg.subtle'
                }
                gap={3}
              >
                <Box w="50px" h="50px" borderRadius="md" overflow="hidden" flexShrink={0}>
                  <Image src={item.preview} alt={item.file.name} w="100%" h="100%" objectFit="cover" />
                </Box>
                <VStack align="start" flex={1} gap={0}>
                  <Text fontSize="sm" fontWeight="medium" truncate>
                    {item.file.name}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {(item.file.size / 1024).toFixed(1)} КБ
                  </Text>
                  {item.status === 'uploading' && (
                    <Progress.Root value={item.progress} size="xs" w="100%">
                      <Progress.Track>
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                  )}
                  {item.status === 'error' && (
                    <Text fontSize="xs" color="red.500">
                      {item.error}
                    </Text>
                  )}
                </VStack>
                <Badge
                  colorPalette={
                    item.status === 'success'
                      ? 'green'
                      : item.status === 'error'
                        ? 'red'
                        : item.status === 'uploading'
                          ? 'blue'
                          : 'gray'
                  }
                >
                  {item.status === 'success'
                    ? 'Загружено'
                    : item.status === 'error'
                      ? 'Ошибка'
                      : item.status === 'uploading'
                        ? 'Загрузка...'
                        : 'Ожидание'}
                </Badge>
                {item.status === 'pending' && (
                  <Button size="xs" variant="ghost" colorPalette="red" onClick={() => removeFromQueue(item.id)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </HStack>
            ))}
          </VStack>
        </VStack>
      )}
    </VStack>
  )
}
