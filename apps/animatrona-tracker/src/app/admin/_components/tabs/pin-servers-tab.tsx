'use client'

import { Button, HStack, Icon, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuPlus, LuRefreshCw, LuServer } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { AuditPinsSection } from '../audit-pins-section'
import { PinServerCard } from '../cards/pin-server-card'
import { EmptyState } from '../common/empty-state'
import { AddPinServerDialog } from '../dialogs/add-pin-server-dialog'
import type { PinServer } from '../types'

interface PinServersTabProps {
  pinServers: PinServer[]
  userRole: string
  onRefresh: () => void
}

export function PinServersTab({ pinServers, userRole, onRefresh }: PinServersTabProps) {
  const [healthChecking, setHealthChecking] = useState(false)
  const [addServerOpen, setAddServerOpen] = useState(false)

  /** Проверить доступность серверов */
  const handleHealthCheck = async () => {
    setHealthChecking(true)
    try {
      const res = await fetch('/api/admin/pin-servers/health-check', { method: 'POST' })
      if (res.ok) {
        const { data } = await res.json()
        const changed = data.filter((r: { wasStatus: string; nowStatus: string }) => r.wasStatus !== r.nowStatus)
        toaster.success({
          title: changed.length > 0 ? `Обновлено ${changed.length} серверов` : 'Все серверы без изменений',
        })
        onRefresh()
      } else {
        toaster.error({ title: 'Ошибка проверки' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setHealthChecking(false)
    }
  }

  return (
    <>
      <HStack gap={2} mt={4} mb={4}>
        <Button size="sm" variant="outline" onClick={handleHealthCheck} loading={healthChecking}>
          <Icon as={LuRefreshCw} mr={1} />
          Проверить статусы
        </Button>
        {userRole === 'ADMIN' && (
          <Button size="sm" colorPalette="green" onClick={() => setAddServerOpen(true)}>
            <Icon as={LuPlus} mr={1} />
            Добавить сервер
          </Button>
        )}
      </HStack>
      <VStack align="stretch" gap={4}>
        {pinServers.length === 0
          ? <EmptyState icon={LuServer} title="Нет серверов" subtitle="Добавьте пин-сервер для хранения контента" />
          : (
            pinServers.map((server) => <PinServerCard key={server.id} server={server} />)
          )}
      </VStack>
      {userRole === 'ADMIN' && pinServers.length > 0 && <AuditPinsSection pinServers={pinServers} />}
      <AddPinServerDialog open={addServerOpen} onOpenChange={setAddServerOpen} />
    </>
  )
}
