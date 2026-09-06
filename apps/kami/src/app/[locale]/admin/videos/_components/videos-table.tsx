'use client'

import { Badge, Box, Button, HStack, Icon, Image, Input, Table, Text } from '@chakra-ui/react'
import { Check, FileVideo, Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AdminTableActions } from '../../_components'
import { deleteVideoAction, updateVideoClassificationAction } from '../_actions/videos.action'

interface VideoRow {
  id: string
  source: 'URL' | 'FILE'
  title: string
  url: string | null
  provider: string | null
  thumbnailUrl: string | null
  filename: string | null
  mimeType: string | null
  category: string | null
  tags: string[]
  createdAt: Date
}

interface VideosTableProps {
  videos: VideoRow[]
}

/** Таблица сохранённых видео — источник (ссылка/файл), inline-редактирование категории/меток, удаление */
export function VideosTable({ videos }: VideosTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [categoryDraft, setCategoryDraft] = useState('')
  const [tagsDraft, setTagsDraft] = useState('')

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteVideoAction(id)
      router.refresh()
    })
  }

  const handleStartEdit = (video: VideoRow) => {
    setEditingId(video.id)
    setCategoryDraft(video.category ?? '')
    setTagsDraft(video.tags.join(', '))
  }

  const handleCancelEdit = () => setEditingId(null)

  const handleSaveEdit = (id: string) => {
    const tags = tagsDraft
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    startTransition(async () => {
      await updateVideoClassificationAction({ id, category: categoryDraft.trim() || null, tags })
      setEditingId(null)
      router.refresh()
    })
  }

  return (
    <Box overflowX="auto">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Видео</Table.ColumnHeader>
            <Table.ColumnHeader>Источник</Table.ColumnHeader>
            <Table.ColumnHeader>Категория / метки</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {videos.map((video) => {
            const isEditing = editingId === video.id

            return (
              <Table.Row key={video.id} opacity={isPending ? 0.6 : 1}>
                <Table.Cell>
                  <HStack gap={2} align="start">
                    {video.thumbnailUrl
                      ? <Image src={video.thumbnailUrl} alt="" boxSize="40px" objectFit="cover" borderRadius="sm" />
                      : (
                        <Icon boxSize="40px" color="fg.muted">
                          <FileVideo />
                        </Icon>
                      )}
                    <Box>
                      {video.url
                        ? (
                          <Box asChild>
                            <a href={video.url} target="_blank" rel="noopener noreferrer">
                              <Text fontWeight="medium" lineClamp={1}>
                                {video.title}
                              </Text>
                            </a>
                          </Box>
                        )
                        : (
                          <Text fontWeight="medium" lineClamp={1}>
                            {video.title}
                          </Text>
                        )}
                      <Text fontSize="sm" color="fg.muted">
                        {video.provider || video.mimeType || video.filename}
                      </Text>
                    </Box>
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="subtle" colorPalette={video.source === 'URL' ? 'red' : 'blue'}>
                    {video.source === 'URL' ? 'Ссылка' : 'Файл'}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {isEditing
                    ? (
                      <HStack gap={2} flexWrap="wrap">
                        <Input
                          size="sm"
                          value={categoryDraft}
                          onChange={(e) => setCategoryDraft(e.target.value)}
                          placeholder="Категория"
                          maxW="160px"
                        />
                        <Input
                          size="sm"
                          value={tagsDraft}
                          onChange={(e) => setTagsDraft(e.target.value)}
                          placeholder="метка1, метка2"
                          maxW="220px"
                        />
                        <Button size="xs" colorPalette="green" onClick={() => handleSaveEdit(video.id)}>
                          <Icon>
                            <Check />
                          </Icon>
                        </Button>
                        <Button size="xs" variant="ghost" onClick={handleCancelEdit}>
                          <Icon>
                            <X />
                          </Icon>
                        </Button>
                      </HStack>
                    )
                    : (
                      <HStack gap={1} flexWrap="wrap" cursor="pointer" onClick={() => handleStartEdit(video)}>
                        {video.category && <Badge variant="subtle">{video.category}</Badge>}
                        {video.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {!video.category && video.tags.length === 0 && <Text color="fg.muted">—</Text>}
                        <Icon color="fg.muted" boxSize="12px">
                          <Pencil />
                        </Icon>
                      </HStack>
                    )}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <AdminTableActions showDelete onDelete={() => handleDelete(video.id)} />
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
