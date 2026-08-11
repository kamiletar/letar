'use client'

/**
 * Управление ссылками на донаты — админка
 */

import { toaster } from '@/app/_components/ui/toaster'
import { AdminCard } from '@/app/admin/_components/admin-card'
import { AdminResponsiveList } from '@/app/admin/_components/admin-responsive-list'
import {
  Badge,
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  Heading,
  Input,
  Portal,
  Spinner,
  Table,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuPlus, LuTrash2 } from 'react-icons/lu'
import { DeleteDialog } from '../_components/delete-dialog'
import { createDonateLinkAction, deleteDonateLinkAction, getDonateLinksAction } from './_actions/donate.action'

interface LinkItem {
  id: string
  name: string
  url: string
  description: string | null
  order: number
  active: boolean
}

export default function AdminDonatePage() {
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', description: '', order: 0 })

  const loadLinks = async () => {
    const result = await getDonateLinksAction()
    if ('data' in result) { setLinks(result.data as LinkItem[]) }
    setLoading(false)
  }

  useEffect(() => {
    loadLinks()
  }, [])

  const handleCreate = async () => {
    setSaving(true)
    const result = await createDonateLinkAction(form)
    if ('error' in result) { toaster.error({ title: String(result.error) }) }
    else {
      toaster.success({ title: 'Ссылка добавлена' })
      setCreateOpen(false)
      setForm({ name: '', url: '', description: '', order: 0 })
      loadLinks()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) { return }
    const result = await deleteDonateLinkAction(deleteTarget.id)
    if ('error' in result) { toaster.error({ title: result.error }) }
    else {
      toaster.success({ title: 'Ссылка удалена' })
      loadLinks()
    }
  }

  if (loading) {
    return (
      <Flex justify="center" py={12}>
        <Spinner size="lg" />
      </Flex>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="lg">Донаты ({links.length})</Heading>
        <Button colorPalette="brand" size="sm" onClick={() => setCreateOpen(true)}>
          <LuPlus size={16} /> Добавить
        </Button>
      </Flex>

      <AdminResponsiveList
        items={links}
        emptyState={
          <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Ссылок для донатов пока нет. Добавьте первую.</Text>
          </Box>
        }
        renderCard={(link) => (
          <AdminCard key={link.id}>
            <Flex justify="space-between" align="start" mb={1}>
              <Box flex={1} mr={2}>
                <Text fontWeight="semibold">{link.name}</Text>
                <Text fontSize="xs" color="fg.muted" truncate>
                  {link.url}
                </Text>
              </Box>
              <Flex gap={2} align="center">
                <Badge colorPalette={link.active ? 'green' : 'gray'} size="sm">
                  {link.active ? 'Активна' : 'Скрыта'}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  minW="44px"
                  minH="44px"
                  colorPalette="red"
                  onClick={() => setDeleteTarget(link)}
                >
                  <LuTrash2 size={14} />
                </Button>
              </Flex>
            </Flex>
          </AdminCard>
        )}
        tableContent={
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
            <Box overflowX="auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>#</Table.ColumnHeader>
                    <Table.ColumnHeader>Название</Table.ColumnHeader>
                    <Table.ColumnHeader>URL</Table.ColumnHeader>
                    <Table.ColumnHeader>Статус</Table.ColumnHeader>
                    <Table.ColumnHeader w="60px" />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {links.map((link) => (
                    <Table.Row key={link.id}>
                      <Table.Cell>{link.order}</Table.Cell>
                      <Table.Cell fontWeight="medium">{link.name}</Table.Cell>
                      <Table.Cell fontSize="sm" color="fg.muted" maxW="300px" truncate>
                        {link.url}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={link.active ? 'green' : 'gray'} size="sm">
                          {link.active ? 'Активна' : 'Скрыта'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          size="sm"
                          variant="ghost"
                          minW="44px"
                          minH="44px"
                          colorPalette="red"
                          onClick={() => setDeleteTarget(link)}
                        >
                          <LuTrash2 size={14} />
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        }
      />

      {/* Диалог создания */}
      <Dialog.Root open={createOpen} onOpenChange={(e) => setCreateOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Новая ссылка</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={3} align="stretch">
                  <Field.Root required>
                    <Field.Label>Название</Field.Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Boosty"
                    />
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label>URL</Field.Label>
                    <Input
                      value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                      placeholder="https://boosty.to/..."
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Описание</Field.Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                    />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Flex gap={3}>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Отмена
                  </Button>
                  <Button colorPalette="brand" onClick={handleCreate} loading={saving}>
                    Добавить
                  </Button>
                </Flex>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        entityName={deleteTarget?.name ?? ''}
        onDelete={handleDelete}
      />
    </VStack>
  )
}
