# Upload API

## Структура API

```
app/api/images/
├── upload/route.ts      # POST загрузка
├── [id]/route.ts        # GET сервинг
└── delete/route.ts      # DELETE удаление
```

## POST /api/images/upload

```typescript
// app/api/images/upload/route.ts
import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const folder = (formData.get('folder') as string) || 'general'

  // Валидация
  if (!file) {
    return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой (макс. 5MB)' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Неподдерживаемый формат' }, { status: 400 })
  }

  // Генерация имени
  const ext = file.name.split('.').pop()
  const id = randomUUID()
  const filename = `${id}.${ext}`
  const path = join(UPLOAD_DIR, folder)

  // Создание папки и сохранение
  await mkdir(path, { recursive: true })
  const bytes = await file.arrayBuffer()
  await writeFile(join(path, filename), Buffer.from(bytes))

  // Сохранение в БД
  const image = await db.image.create({
    data: {
      id,
      filename,
      folder,
      mimeType: file.type,
      size: file.size,
    },
  })

  return NextResponse.json({
    id: image.id,
    url: `/api/images/${image.id}`,
  })
}
```

## Клиентский хелпер

```typescript
// lib/upload-image.ts
export async function uploadImage(file: File, folder: string = 'general'): Promise<{ id: string; url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const response = await fetch('/api/images/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const { error } = await response.json()
    throw new Error(error)
  }

  return response.json()
}
```

## Drag & Drop компонент

```tsx
'use client'

import { uploadImage } from '@/lib/upload-image'
import { Box, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

interface ImageDropzoneProps {
  folder: string
  onUpload: (result: { id: string; url: string }) => void
}

export function ImageDropzone({ folder, onUpload }: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (!file?.type.startsWith('image/')) return

      setIsUploading(true)
      try {
        const result = await uploadImage(file, folder)
        onUpload(result)
      } finally {
        setIsUploading(false)
      }
    },
    [folder, onUpload],
  )

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      border="2px dashed"
      borderColor={isDragging ? 'blue.400' : 'gray.300'}
      borderRadius="lg"
      p={8}
      textAlign="center"
      cursor="pointer"
    >
      {isUploading ? <Spinner /> : (
        <VStack>
          <Text>Перетащите изображение сюда</Text>
          <Text fontSize="sm" color="gray.500">
            JPEG, PNG, WebP до 5MB
          </Text>
        </VStack>
      )}
    </Box>
  )
}
```
