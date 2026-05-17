'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { createAlbumAction, updateAlbumAction } from '@/app/my/poems/_actions/album.action'
import { Button, Field, HStack, Input, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { AlbumCoverUpload } from './album-cover-upload'

interface AlbumFormProps {
  albumId?: string
  initialData?: {
    title: string
    coverImage: string | null
    publishedAt: string | null
  }
}

export function AlbumForm({ albumId, initialData }: AlbumFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [coverImage, setCoverImage] = useState<string | null>(initialData?.coverImage ?? null)
  const [publishedAt, setPublishedAt] = useState<string>(
    initialData?.publishedAt ? new Date(initialData.publishedAt).toISOString().slice(0, 10) : '',
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      const result = albumId
        ? await updateAlbumAction({
          albumId,
          title: title.trim(),
          coverImage,
          publishedAt: publishedAt || null,
        })
        : await createAlbumAction({
          title: title.trim(),
          coverImage,
          publishedAt: publishedAt || null,
        })

      if ('error' in result && result.error) {
        const msg = typeof result.error === 'string' ? result.error : 'Ошибка сохранения'
        toaster.error({ title: msg })
        return
      }

      toaster.success({ title: albumId ? 'Альбом обновлён' : 'Альбом создан' })

      if (!albumId && 'data' in result && result.data && 'albumId' in result.data) {
        router.push(`/my/poems/albums/${result.data.albumId}/edit`)
      } else {
        router.push('/my/poems')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={6}>
        <Field.Root required>
          <Field.Label>
            Название <Text as="span" color="red.500">*</Text>
          </Field.Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название альбома"
            maxLength={200}
          />
        </Field.Root>

        <AlbumCoverUpload value={coverImage} onChange={setCoverImage} albumId={albumId} />

        <Field.Root>
          <Field.Label>Дата публикации</Field.Label>
          <Input
            type="date"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
          <Field.HelperText>Оставьте пустым, чтобы сохранить как черновик</Field.HelperText>
        </Field.Root>

        <HStack justify="flex-end" gap={3}>
          <Button variant="ghost" onClick={() => router.push('/my/poems')} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" colorPalette="brand" loading={saving}>
            {albumId ? 'Сохранить' : 'Создать альбом'}
          </Button>
        </HStack>
      </Stack>
    </form>
  )
}
