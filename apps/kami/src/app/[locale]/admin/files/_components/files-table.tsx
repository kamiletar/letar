'use client'

import { useConfirmDialog } from '@/app/_components/ui/confirm-dialog'
import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { Copy, ExternalLink, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useTransition } from 'react'

interface UploadedFile {
  id: string
  filename: string
  path: string
  mimeType: string
  size: number
  description: string | null
  uploadedAt: Date
}

interface FilesTableProps {
  files: UploadedFile[]
}

/** Форматирование размера */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} КБ`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

/**
 * Таблица произвольных файлов в админке
 */
export function FilesTable({ files }: FilesTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const handleDelete = useCallback(
    async (id: string, filename: string) => {
      if (!(await confirm({ title: `Удалить «${filename}»?` }))) {
        return
      }

      try {
        const res = await fetch(`/api/arbitrary-upload?id=${id}`, { method: 'DELETE' })
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
    [router, confirm],
  )

  const copyLink = useCallback((path: string) => {
    const url = `${window.location.origin}/api/files/${path}`
    navigator.clipboard.writeText(url)
    toaster.success({ title: 'Ссылка скопирована' })
  }, [])

  if (files.length === 0) {
    return (
      <Box py={8} textAlign="center" color="fg.muted">
        Файлов пока нет
      </Box>
    )
  }

  return (
    <>
      <ConfirmDialog />
      <Table.ScrollArea borderWidth="1px" borderRadius="md">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Файл</Table.ColumnHeader>
              <Table.ColumnHeader>Тип</Table.ColumnHeader>
              <Table.ColumnHeader>Размер</Table.ColumnHeader>
              <Table.ColumnHeader>Дата</Table.ColumnHeader>
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {files.map((file) => (
              <Table.Row key={file.id}>
                <Table.Cell>
                  <VStack align="start" gap={0}>
                    <Text fontSize="sm" fontWeight="medium">
                      {file.filename}
                    </Text>
                    {file.description && (
                      <Text fontSize="xs" color="fg.muted">
                        {file.description}
                      </Text>
                    )}
                  </VStack>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="xs" color="fg.muted">
                    {file.mimeType}
                  </Text>
                </Table.Cell>
                <Table.Cell>{formatSize(file.size)}</Table.Cell>
                <Table.Cell>
                  <Text fontSize="xs" color="fg.muted">
                    {new Date(file.uploadedAt).toLocaleDateString('ru-RU')}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1} justify="flex-end">
                    <Button size="xs" variant="ghost" onClick={() => copyLink(file.path)} title="Копировать ссылку">
                      <Copy size={14} />
                    </Button>
                    <Button size="xs" variant="ghost" asChild title="Открыть файл">
                      <a href={`/api/files/${file.path}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} />
                      </a>
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => handleDelete(file.id, file.filename)}
                      loading={isPending}
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
      </Table.ScrollArea>
    </>
  )
}
