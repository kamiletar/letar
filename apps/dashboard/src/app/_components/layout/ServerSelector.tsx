'use client'

/**
 * ServerSelector
 * Dropdown для выбора сервера мониторинга в Header
 */

import { useServerContext } from '@/lib/contexts/ServerContext'
import { Box, Button, MenuContent, MenuItem, MenuRoot, MenuTrigger, Spinner, Text } from '@chakra-ui/react'
import { LuChevronDown, LuMonitor, LuServer, LuWifi, LuWifiOff } from 'react-icons/lu'

export function ServerSelector() {
  const { currentServer, servers, isLoading, selectServer } = useServerContext()

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Spinner size="xs" />
        <Text ml={2}>Загрузка...</Text>
      </Button>
    )
  }

  if (servers.length === 0) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <LuServer size={16} />
        <Text ml={2}>Нет серверов</Text>
      </Button>
    )
  }

  // Если только один сервер — показываем без dropdown
  if (servers.length === 1) {
    return (
      <Button variant="ghost" size="sm" disabled>
        {currentServer?.isLocal
          ? <LuMonitor size={16} color="var(--chakra-colors-green-500)" />
          : <LuServer size={16} color="var(--chakra-colors-green-500)" />}
        <Text ml={2}>{currentServer?.displayName}</Text>
      </Button>
    )
  }

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {currentServer?.isLocal
            ? <LuMonitor size={16} color="var(--chakra-colors-green-500)" />
            : <LuServer size={16} color="var(--chakra-colors-green-500)" />}
          <Text ml={2} maxW="150px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {currentServer?.displayName || 'Выбрать сервер'}
          </Text>
          <LuChevronDown size={16} style={{ marginLeft: 4 }} />
        </Button>
      </MenuTrigger>

      <MenuContent minW="200px" zIndex={1500}>
        {servers.map((server) => (
          <MenuItem key={server.id} value={server.id} onClick={() => selectServer(server.id)}>
            <Box display="flex" alignItems="center" gap={2} flex={1}>
              {server.isLocal
                ? (
                  <LuMonitor
                    size={16}
                    color={server.id === currentServer?.id
                      ? 'var(--chakra-colors-green-500)'
                      : 'var(--chakra-colors-gray-500)'}
                  />
                )
                : (
                  <LuServer
                    size={16}
                    color={server.id === currentServer?.id
                      ? 'var(--chakra-colors-green-500)'
                      : 'var(--chakra-colors-gray-500)'}
                  />
                )}
              <Text flex={1}>{server.displayName}</Text>
              <ServerStatus server={server} />
            </Box>
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  )
}

/**
 * Индикатор статуса сервера
 */
function ServerStatus({ server }: { server: { lastSeen?: Date | null; isLocal: boolean } }) {
  // Локальный сервер всегда онлайн
  if (server.isLocal) {
    return <LuWifi size={12} color="var(--chakra-colors-green-500)" />
  }

  // Удалённый сервер — проверяем lastSeen
  // Считаем онлайн, если lastSeen < 1 минуты назад
  if (server.lastSeen) {
    const lastSeenDate = new Date(server.lastSeen)
    const isOnline = Date.now() - lastSeenDate.getTime() < 60000

    return isOnline
      ? <LuWifi size={12} color="var(--chakra-colors-green-500)" />
      : <LuWifiOff size={12} color="var(--chakra-colors-red-500)" />
  }

  return <LuWifiOff size={12} color="var(--chakra-colors-gray-500)" />
}
