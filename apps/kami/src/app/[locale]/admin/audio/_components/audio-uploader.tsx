'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, HStack, Icon, Input, Text, VStack } from '@chakra-ui/react'
import { Music, Trash2, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

interface QueuedFile {
  id: string
  file: File
  title: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

/** Извлечь название из имени файла */
function titleFromFilename(filename: string): string {
  const name = filename.replace(/\.[^.]+$/, '')
  return name.replace(/[-_]+/g, ' ').trim()
}

/**
 * Компонент для загрузки аудиофайлов с drag-and-drop
 */
export function AudioUploader() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDragging, setIsDragging] = useState(false)
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
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('audio/'))
    addFiles(files)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('audio/'))
    addFiles(files)
    e.target.value = ''
  }, [])

  /** Ctrl+V — вставка файлов из буфера обмена */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('audio/'))
      if (files.length > 0) {
        e.preventDefault()
        addFiles(files)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  })

  const addFiles = (files: File[]) => {
    const newFiles: QueuedFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      title: titleFromFilename(file.name),
      status: 'pending',
    }))
    setQueue((prev) => [...prev, ...newFiles])
  }

  const updateTitle = (id: string, title: string) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, title } : f)))
  }

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id))
  }

  const clearQueue = () => setQueue([])

  const uploadFile = async (item: QueuedFile): Promise<void> => {
    setQueue((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f)))

    try {
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('title', item.title)

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      })

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
            <Music />
          </Icon>
          <Text fontWeight="medium" color={isDragging ? 'fg' : 'fg.muted'}>
            {isDragging ? 'Отпустите файлы' : 'Перетащите MP3 файлы сюда'}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            или нажмите для выбора (макс. 100 МБ)
          </Text>
        </VStack>
        <input ref={fileInputRef} type="file" accept="audio/*" multiple hidden onChange={handleFileSelect} />
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
                bg={
                  item.status === 'success'
                    ? { base: 'green.50', _dark: 'green.950/20' }
                    : item.status === 'error'
                      ? { base: 'red.50', _dark: 'red.950/20' }
                      : 'bg.subtle'
                }
                gap={3}
              >
                <Icon boxSize={5} color="fg.muted" flexShrink={0}>
                  <Music />
                </Icon>
                <VStack align="start" flex={1} gap={1}>
                  {item.status === 'pending' ? (
                    <Input
                      size="sm"
                      value={item.title}
                      onChange={(e) => updateTitle(item.id, e.target.value)}
                      placeholder="Название"
                    />
                  ) : (
                    <Text fontSize="sm" fontWeight="medium">
                      {item.title}
                    </Text>
                  )}
                  <Text fontSize="xs" color="fg.muted">
                    {item.file.name} — {(item.file.size / 1024 / 1024).toFixed(1)} МБ
                  </Text>
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
