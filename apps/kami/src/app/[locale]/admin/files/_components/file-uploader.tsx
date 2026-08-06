'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { File as FileIcon, Trash2, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState, useTransition } from 'react'

interface QueuedFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

/** Форматирование размера */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} КБ`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

/**
 * Компонент загрузки произвольных файлов с drag-and-drop
 */
export function FileUploader() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDragging, setIsDragging] = useState(false)
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = (files: File[]) => {
    const newFiles: QueuedFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      status: 'pending',
    }))
    setQueue((prev) => [...prev, ...newFiles])
  }

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
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }, [])

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id))
  }

  const clearQueue = () => setQueue([])

  const uploadFile = async (item: QueuedFile): Promise<void> => {
    setQueue((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f)))

    try {
      const formData = new FormData()
      formData.append('file', item.file)

      const response = await fetch('/api/arbitrary-upload', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки')
      }

      setQueue((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'success' } : f)))
    } catch (error) {
      setQueue((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Ошибка' } : f
        )
      )
    }
  }

  const uploadAll = async () => {
    const pending = queue.filter((f) => f.status === 'pending')
    if (pending.length === 0) {
      return
    }

    setIsUploading(true)
    for (const item of pending) {
      await uploadFile(item)
    }
    setIsUploading(false)

    startTransition(() => router.refresh())

    const errorCount = queue.filter((f) => f.status === 'error').length
    if (errorCount > 0) {
      toaster.warning({ title: `Не удалось загрузить ${errorCount} файлов` })
    } else {
      toaster.success({ title: `Загружено ${pending.length} файлов` })
    }
  }

  const pendingCount = queue.filter((f) => f.status === 'pending').length

  return (
    <VStack gap={4} align="stretch">
      {/* Зона drop */}
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
        _hover={{ borderColor: 'fg', bg: 'bg.subtle' }}
      >
        <VStack gap={2}>
          <Icon boxSize={10} color={isDragging ? 'fg' : 'fg.muted'}>
            <FileIcon />
          </Icon>
          <Text fontWeight="medium" color={isDragging ? 'fg' : 'fg.muted'}>
            {isDragging ? 'Отпустите файлы' : 'Перетащите файлы сюда'}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            или нажмите для выбора (любой формат, макс. 500 МБ)
          </Text>
        </VStack>
        <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileSelect} />
      </Box>

      {/* Очередь */}
      {queue.length > 0 && (
        <VStack gap={4} align="stretch">
          <HStack justify="flex-end" gap={2}>
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

          <VStack gap={2} align="stretch">
            {queue.map((item) => (
              <HStack
                key={item.id}
                p={3}
                borderRadius="md"
                bg={item.status === 'success'
                  ? { base: 'green.50', _dark: 'green.950/20' }
                  : item.status === 'error'
                  ? { base: 'red.50', _dark: 'red.950/20' }
                  : 'bg.subtle'}
                gap={3}
              >
                <Icon boxSize={5} color="fg.muted" flexShrink={0}>
                  <FileIcon />
                </Icon>
                <VStack align="start" flex={1} gap={0}>
                  <Text fontSize="sm" fontWeight="medium" truncate>
                    {item.file.name}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {formatSize(item.file.size)}
                  </Text>
                  {item.status === 'error' && (
                    <Text fontSize="xs" color="red.500">
                      {item.error}
                    </Text>
                  )}
                </VStack>
                <Badge
                  colorPalette={item.status === 'success'
                    ? 'green'
                    : item.status === 'error'
                    ? 'red'
                    : item.status === 'uploading'
                    ? 'blue'
                    : 'gray'}
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
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => removeFromQueue(item.id)}
                  >
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
