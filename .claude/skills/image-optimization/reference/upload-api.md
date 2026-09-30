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
import { resolveUploadPath } from '@letar/image-upload/server'
import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
// Расширение берём из проверенного MIME, а не из имени файла клиента
const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' } as const
// Белый список папок: `folder` приходит от клиента, `../` в нём выводит за пределы uploads/
const ALLOWED_FOLDERS = ['general', 'products', 'avatars']

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const folderRaw = (formData.get('folder') as string) || 'general'
  if (!ALLOWED_FOLDERS.includes(folderRaw)) {
    return NextResponse.json({ error: 'Недопустимая папка' }, { status: 400 })
  }
  const folder = folderRaw

  // Валидация
  if (!file) {
    return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой (макс. 5MB)' }, { status: 400 })
  }
  if (!(file.type in ALLOWED_TYPES)) {
    return NextResponse.json({ error: 'Неподдерживаемый формат' }, { status: 400 })
  }

  // Генерация имени
  const ext = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]
  const id = randomUUID()
  const filename = `${id}.${ext}`
  // Путь строго внутри UPLOAD_DIR (.claude/docs/upload-path-traversal.md)
  const dir = resolveUploadPath(UPLOAD_DIR, [folder])
  const target = resolveUploadPath(UPLOAD_DIR, [folder, filename])
  if (!dir.ok || !target.ok) {
    return NextResponse.json({ error: 'Недопустимый путь' }, { status: 400 })
  }

  // Создание папки и сохранение
  await mkdir(dir.absPath, { recursive: true })
  const bytes = await file.arrayBuffer()
  await writeFile(target.absPath, Buffer.from(bytes))

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
      if (!file?.type.startsWith('image/')) { return }

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
