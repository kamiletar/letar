'use client'

import { Badge, Box, HStack, Table, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { AdminTableActions } from '../../_components'
import { deleteLinkAction, toggleLinkReadAction } from '../_actions/links.action'

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

/**
 * Таблица сохранённых ссылок — переключение "прочитано" и удаление.
 */
export function LinksTable({ links }: LinksTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

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
          {links.map((link) => (
            <Table.Row key={link.id} opacity={isPending ? 0.6 : 1}>
              <Table.Cell>
                <Box asChild>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <Text fontWeight="medium" lineClamp={1}>
                      {link.title}
                    </Text>
                  </a>
                </Box>
                <Text fontSize="sm" color="fg.muted">
                  {domainFromUrl(link.url)}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <HStack gap={1} flexWrap="wrap">
                  {link.category && <Badge variant="subtle">{link.category}</Badge>}
                  {link.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                  {!link.category && link.tags.length === 0 && <Text color="fg.muted">—</Text>}
                </HStack>
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
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
