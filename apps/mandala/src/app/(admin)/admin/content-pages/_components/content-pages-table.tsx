'use client'

import { Checkbox, HStack, IconButton, Link, Table } from '@chakra-ui/react'
import { BulkActionsBar, commonBulkActions, StatusBadge, useSelection } from '@letar/admin-ui'
import { useRouter } from 'next/navigation'
import { LuEye, LuPencil } from 'react-icons/lu'
import { bulkDeleteContentPages, bulkPublishContentPages, bulkUnpublishContentPages } from '../_actions/bulk-actions'

interface ContentPage {
  id: string
  slug: string
  title: string
  published: boolean
  updatedAt: Date
}

interface ContentPagesTableProps {
  pages: ContentPage[]
}

/**
 * Таблица страниц контента с поддержкой множественного выбора
 */
export function ContentPagesTable({ pages }: ContentPagesTableProps) {
  const router = useRouter()
  const pageIds = pages.map((p) => p.id)
  const selection = useSelection(pageIds)

  const handleBulkAction = async (action: (ids: string[]) => Promise<void>) => {
    await action(selection.selectedArray)
    selection.clear()
    router.refresh()
  }

  return (
    <>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="40px">
              <Checkbox.Root
                checked={selection.isAllSelected ? true : selection.isIndeterminate ? 'indeterminate' : false}
                onCheckedChange={() => selection.toggleAll()}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
              </Checkbox.Root>
            </Table.ColumnHeader>
            <Table.ColumnHeader>Slug</Table.ColumnHeader>
            <Table.ColumnHeader>Заголовок</Table.ColumnHeader>
            <Table.ColumnHeader>Статус</Table.ColumnHeader>
            <Table.ColumnHeader>Обновлено</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {pages.map((page) => (
            <Table.Row
              key={page.id}
              _hover={{ bg: 'whiteAlpha.50' }}
              bg={selection.isSelected(page.id) ? 'purple.900/30' : undefined}
            >
              <Table.Cell>
                <Checkbox.Root
                  checked={selection.isSelected(page.id)}
                  onCheckedChange={() => selection.toggle(page.id)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              </Table.Cell>
              <Table.Cell fontFamily="mono" fontSize="sm">
                <Link href={`/${page.slug}`} target="_blank" color="fg" _hover={{ color: 'white' }}>
                  /{page.slug}
                </Link>
              </Table.Cell>
              <Table.Cell fontWeight="medium">{page.title}</Table.Cell>
              <Table.Cell>
                <StatusBadge type="published" value={page.published} />
              </Table.Cell>
              <Table.Cell>
                {new Date(page.updatedAt).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </Table.Cell>
              <Table.Cell>
                <HStack gap={1} justify="flex-end">
                  <IconButton aria-label="Просмотр" variant="ghost" size="sm" asChild>
                    <Link href={`/admin/content-pages/${page.id}`}>
                      <LuEye />
                    </Link>
                  </IconButton>
                  <IconButton aria-label="Редактировать" variant="ghost" size="sm" asChild>
                    <Link href={`/admin/content-pages/${page.id}/edit`}>
                      <LuPencil />
                    </Link>
                  </IconButton>
                </HStack>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <BulkActionsBar
        selectedCount={selection.selectedCount}
        selectedIds={selection.selectedArray}
        onClear={selection.clear}
        actions={[
          commonBulkActions.publish((ids) => handleBulkAction(() => bulkPublishContentPages(ids))),
          commonBulkActions.unpublish((ids) => handleBulkAction(() => bulkUnpublishContentPages(ids))),
          commonBulkActions.delete((ids) => handleBulkAction(() => bulkDeleteContentPages(ids))),
        ]}
      />
    </>
  )
}
