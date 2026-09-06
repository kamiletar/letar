'use client'

import { Badge, Box, Button, HStack, Icon, Image, Input, Table, Text } from '@chakra-ui/react'
import { Check, Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AdminTableActions } from '../../_components'
import { deleteLinkAction, toggleLinkReadAction, updateLinkClassificationAction } from '../_actions/links.action'

interface LinkRow {
  id: string
  url: string
  title: string
  category: string | null
  tags: string[]
  read: boolean
  createdAt: Date
}

interface LinksTableProps {
  links: LinkRow[]
}

/** Домен из URL для компактного отображения */
function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Favicon домена через сервис Google — всегда возвращает иконку (дефолтную для неизвестных доменов) */
function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
}

/**
 * Таблица сохранённых ссылок — favicon, переключение "прочитано", inline-редактирование
 * категории/меток прямо в строке и удаление.
 */
export function LinksTable({ links }: LinksTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [categoryDraft, setCategoryDraft] = useState('')
  const [tagsDraft, setTagsDraft] = useState('')

  const handleToggleRead = (id: string, read: boolean) => {
    startTransition(async () => {
      await toggleLinkReadAction(id, read)
      router.refresh()
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteLinkAction(id)
      router.refresh()
    })
  }

  const handleStartEdit = (link: LinkRow) => {
    setEditingId(link.id)
    setCategoryDraft(link.category ?? '')
    setTagsDraft(link.tags.join(', '))
  }

  const handleCancelEdit = () => setEditingId(null)

  const handleSaveEdit = (id: string) => {
    const tags = tagsDraft
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    startTransition(async () => {
      await updateLinkClassificationAction({ id, category: categoryDraft.trim() || null, tags })
      setEditingId(null)
      router.refresh()
    })
  }

  return (
    <Box overflowX="auto">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Ссылка</Table.ColumnHeader>
            <Table.ColumnHeader>Категория / метки</Table.ColumnHeader>
            <Table.ColumnHeader>Статус</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {links.map((link) => {
            const domain = domainFromUrl(link.url)
            const isEditing = editingId === link.id

            return (
              <Table.Row key={link.id} opacity={isPending ? 0.6 : 1}>
                <Table.Cell>
                  <HStack gap={2} align="start">
                    <Image src={faviconUrl(domain)} alt="" boxSize="16px" mt="3px" borderRadius="sm" />
                    <Box>
                      <Box asChild>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <Text fontWeight="medium" lineClamp={1}>
                            {link.title}
                          </Text>
                        </a>
                      </Box>
                      <Text fontSize="sm" color="fg.muted">
                        {domain}
                      </Text>
                    </Box>
                  </HStack>
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
                        <Button size="xs" colorPalette="green" onClick={() => handleSaveEdit(link.id)}>
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
                      <HStack gap={1} flexWrap="wrap" cursor="pointer" onClick={() => handleStartEdit(link)}>
                        {link.category && <Badge variant="subtle">{link.category}</Badge>}
                        {link.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {!link.category && link.tags.length === 0 && <Text color="fg.muted">—</Text>}
                        <Icon color="fg.muted" boxSize="12px">
                          <Pencil />
                        </Icon>
                      </HStack>
                    )}
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    variant="subtle"
                    colorPalette={link.read ? 'green' : 'gray'}
                    cursor="pointer"
                    onClick={() => handleToggleRead(link.id, !link.read)}
                  >
                    {link.read ? 'Прочитано' : 'Новое'}
                  </Badge>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <AdminTableActions showDelete onDelete={() => handleDelete(link.id)} />
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
