'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { formatFileSize } from '@/lib/ipfs'
import { Badge, Box, Button, Flex, Heading, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuCloud, LuCloudOff, LuHardDrive, LuPause, LuPencil, LuPlay, LuTrash2 } from 'react-icons/lu'
import { DeletePinServerDialog } from '../dialogs/delete-pin-server-dialog'
import { EditPinServerDialog } from '../dialogs/edit-pin-server-dialog'
import type { PinServer } from '../types'

/** Карточка пин-сервера */
export function PinServerCard({ server }: { server: PinServer }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [toggling, setToggling] = useState(false)
  const statusColor = server.status === 'ONLINE' ? 'green' : server.status === 'MAINTENANCE' ? 'yellow' : 'red'
  const StatusIcon = server.status === 'ONLINE' ? LuCloud : LuCloudOff
  const usedPercent = server.capacityBytes > 0 ? Math.round((server.usedBytes / server.capacityBytes) * 100) : 0
  const isMaintenance = server.status === 'MAINTENANCE'
  const ToggleStatusIcon = isMaintenance ? LuPlay : LuPause
  // Только PINNER может пинить — relay и gateway не имеют pin-заданий
  const isPinner = server.role === 'PINNER'

  /** Переключить ONLINE ↔ MAINTENANCE */
  const handleToggleStatus = async () => {
    setToggling(true)
    try {
      const newStatus = isMaintenance ? 'ONLINE' : 'MAINTENANCE'
      const res = await fetch(`/api/admin/pin-servers/${server.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toaster.success({ title: `${server.name}: ${newStatus}` })
        router.refresh()
      } else {
        toaster.error({ title: 'Ошибка смены статуса' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setToggling(false)
    }
  }

  return (
    <>
      <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
        <Flex justify="space-between" align="center" mb={3}>
          <HStack gap={3}>
            <StatusIcon color={`var(--chakra-colors-${statusColor}-500)`} />
            <Heading size="md">{server.name}</Heading>
            <Badge colorPalette={statusColor}>{server.status}</Badge>
            {server.authSecret && <Badge colorPalette="purple">Авторизация</Badge>}
          </HStack>
          <HStack gap={2}>
            {isPinner && (
              <Text fontSize="sm" color="fg.muted">
                {server._count.pinJobs} заданий
              </Text>
            )}
            {(isPinner || isMaintenance) && (
              <Button
                size="xs"
                variant="outline"
                colorPalette={isMaintenance ? 'green' : 'yellow'}
                onClick={handleToggleStatus}
                loading={toggling}
              >
                <ToggleStatusIcon style={{ marginRight: '4px' }} />
                {isMaintenance ? 'Включить' : 'На паузу'}
              </Button>
            )}
            <IconButton aria-label="Редактировать сервер" size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <LuPencil />
            </IconButton>
            <IconButton
              aria-label="Удалить сервер"
              size="sm"
              variant="ghost"
              colorPalette="red"
              onClick={() => setDeleteOpen(true)}
            >
              <LuTrash2 />
            </IconButton>
          </HStack>
        </Flex>

        <VStack align="flex-start" gap={1}>
          <Text fontSize="sm" color="fg.muted">
            URL: <code>{server.apiUrl}</code>
          </Text>
          {server.peerId && (
            <Text fontSize="sm" color="fg.muted">
              PeerID: <code>{server.peerId.slice(0, 20)}...</code>
            </Text>
          )}
          {server.capacityBytes > 0 && (
            <HStack gap={2}>
              <LuHardDrive />
              <Text fontSize="sm">
                {formatFileSize(server.usedBytes)} / {formatFileSize(server.capacityBytes)} ({usedPercent}%)
              </Text>
            </HStack>
          )}
        </VStack>
      </Box>

      <EditPinServerDialog server={server} open={editOpen} onOpenChange={setEditOpen} />
      <DeletePinServerDialog server={server} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}
