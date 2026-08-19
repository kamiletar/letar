'use client'

/**
 * Компонент загрузки фотографий к матчу.
 * Поддерживает drag & drop и множественную загрузку.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Flex, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { LuImagePlus, LuUpload, LuX } from 'react-icons/lu'

interface PhotoUploaderProps {
  matchId: string
}

interface PendingFile {
  file: File
  preview: string
  caption: string
}

export function PhotoUploader({ matchId }: PhotoUploaderProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: PendingFile[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) { continue }
      if (file.size > 15 * 1024 * 1024) {
        toaster.error({ title: `${file.name} превышает 15 МБ` })
        continue
      }
      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        caption: '',
      })
    }
    setPending((prev) => [...prev, ...newFiles])
  }, [])

  const removeFile = (index: number) => {
    setPending((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const updateCaption = (index: number, caption: string) => {
    setPending((prev) => prev.map((p, i) => (i === index ? { ...p, caption } : p)))
  }

  const handleUpload = async () => {
    if (pending.length === 0) { return }
    setUploading(true)

    let successCount = 0
    for (const item of pending) {
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('matchId', matchId)
      if (item.caption) { formData.append('caption', item.caption) }

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.success) {
          successCount++
        } else {
          toaster.error({ title: data.error || 'Ошибка загрузки' })
        }
      } catch {
        toaster.error({ title: `Ошибка при загрузке ${item.file.name}` })
      }
    }

    if (successCount > 0) {
      toaster.success({ title: `Загружено ${successCount} фото` })
      // Очищаем previews
      for (const item of pending) { URL.revokeObjectURL(item.preview) }
      setPending([])
      router.refresh()
    }
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) { addFiles(e.dataTransfer.files) }
  }

  return (
    <VStack gap={4} align="stretch">
      {/* Зона drag & drop */}
      <Box
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={dragOver ? 'brand.fg' : 'border.muted'}
        borderRadius="xl"
        p={8}
        textAlign="center"
        cursor="pointer"
        bg={dragOver ? 'brand.subtle' : 'transparent'}
        transitionProperty="border-color, background-color"
        transitionDuration="0.15s"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <VStack gap={2}>
          <LuImagePlus size={32} />
          <Text fontWeight="medium">Перетащите фото сюда</Text>
          <Text fontSize="sm" color="fg.muted">
            или нажмите для выбора (JPG, PNG, WebP, до 15 МБ)
          </Text>
        </VStack>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </Box>

      {/* Превью выбранных файлов */}
      {pending.length > 0 && (
        <VStack gap={3} align="stretch">
          {pending.map((item, idx) => (
            <Flex
              key={idx}
              gap={3}
              align="center"
              bg="bg.panel"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="border.muted"
              p={3}
            >
              <Box w="60px" h="60px" borderRadius="md" overflow="hidden" flexShrink={0} bg="bg.subtle">
                {}
                {/* oxlint-disable-next-line nextjs/no-img-element -- blob preview */}
                <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
              <VStack flex={1} gap={1} align="stretch">
                <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                  {item.file.name}
                </Text>
                <Input
                  size="xs"
                  placeholder="Подпись (необязательно)"
                  value={item.caption}
                  onChange={(e) => updateCaption(idx, e.target.value)}
                />
              </VStack>
              <Button size="xs" variant="ghost" onClick={() => removeFile(idx)}>
                <LuX size={14} />
              </Button>
            </Flex>
          ))}

          <HStack justify="flex-end">
            <Button colorPalette="brand" onClick={handleUpload} loading={uploading} disabled={pending.length === 0}>
              <LuUpload size={16} />
              Загрузить ({pending.length})
            </Button>
          </HStack>
        </VStack>
      )}
    </VStack>
  )
}
