'use client'

import { useConfirmDialog } from '@/app/_components/ui/confirm-dialog'
import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { Copy, ExternalLink, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useTransition } from 'react'

interface AudioFile {
  id: string
  slug: string
  title: string
  artist: string | null
  album: string | null
  path: string
  size: number
  mimeType: string
  bitrate: number | null
  uploadedAt: Date
}

interface AudioTableProps {
  audioFiles: AudioFile[]
  locale: string
}

/** Форматирование размера */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} КБ`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

/**
 * Таблица аудиофайлов в админке
 */
export function AudioTable({ audioFiles, locale }: AudioTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const handleDelete = useCallback(
    async (id: string, title: string) => {
      if (!(await confirm({ title: `Удалить «${title}»?` }))) {
        return
      }

      try {
        const res = await fetch(`/api/audio/upload?id=${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Ошибка удаления')
        }
        toaster.success({ title: 'Удалено' })
        startTransition(() => router.refresh())
      } catch (error) {
        toaster.error({ title: error instanceof Error ? error.message : 'Ошибка' })
      }
    },
    [router]
  )

  const copyLink = useCallback(
    (slug: string) => {
      const url = `${window.location.origin}/${locale}/audio/${slug}`
      navigator.clipboard.writeText(url)
      toaster.success({ title: 'Ссылка скопирована' })
    },
    [locale]
  )

  if (audioFiles.length === 0) {
    return (
      <Box py={8} textAlign="center" color="fg.muted">
        Аудиофайлов пока нет
      </Box>
    )
  }

  return (
    <>
      <ConfirmDialog />
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Название</Table.ColumnHeader>
              <Table.ColumnHeader>Исполнитель / Альбом</Table.ColumnHeader>
              <Table.ColumnHeader>Размер</Table.ColumnHeader>
              <Table.ColumnHeader>Дата</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {audioFiles.map((audio) => (
              <Table.Row key={audio.id}>
                <Table.Cell>
                  <HStack gap={2}>
                    <Text fontWeight="medium">{audio.title}</Text>
                    <Badge size="sm" colorPalette="fg">
                      {audio.mimeType.split('/')[1]}
                    </Badge>
                    {audio.bitrate && (
                      <Badge size="sm" variant="subtle">
                        {audio.bitrate} kbps
                      </Badge>
                    )}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <VStack gap={0} align="start">
                    {audio.artist && (
                      <Text fontSize="sm" color="fg.muted">
                        {audio.artist}
                      </Text>
                    )}
                    {audio.album && (
                      <Text fontSize="xs" color="fg.subtle">
                        {audio.album}
                      </Text>
                    )}
                  </VStack>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm" color="fg.muted">
                    {formatSize(audio.size)}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm" color="fg.muted">
                    {new Date(audio.uploadedAt).toLocaleDateString('ru-RU')}
                  </Text>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <HStack gap={1} justify="flex-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyLink(audio.slug)}
                      aria-label="Скопировать ссылку"
                      title="Скопировать ссылку"
                    >
                      <Copy size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" asChild aria-label="Открыть" title="Открыть">
                      <Link href={`/${locale}/audio/${audio.slug}`} target="_blank">
                        <ExternalLink size={14} />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => handleDelete(audio.id, audio.title)}
                      loading={isPending}
                      aria-label="Удалить"
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </>
  )
}
