'use client'

/**
 * ServerSelector
 * Dropdown для выбора сервера мониторинга в Header
 */

import { useServerContext } from '@/lib/contexts/ServerContext'
import { Box, Button, Icon, MenuContent, MenuItem, MenuRoot, MenuTrigger, Spinner, Text } from '@chakra-ui/react'
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
        <Icon as={LuServer} />
        <Text ml={2}>Нет серверов</Text>
      </Button>
    )
  }

  // Если только один сервер — показываем без dropdown
  if (servers.length === 1) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Icon as={currentServer?.isLocal ? LuMonitor : LuServer} color="green.500" />
        <Text ml={2}>{currentServer?.displayName}</Text>
      </Button>
    )
  }

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Icon as={currentServer?.isLocal ? LuMonitor : LuServer} color="green.500" />
          <Text ml={2} maxW="150px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {currentServer?.displayName || 'Выбрать сервер'}
          </Text>
          <Icon as={LuChevronDown} ml={1} />
        </Button>
      </MenuTrigger>

      <MenuContent minW="200px" zIndex={1500}>
        {servers.map((server) => (
          <MenuItem key={server.id} value={server.id} onClick={() => selectServer(server.id)}>
            <Box display="flex" alignItems="center" gap={2} flex={1}>
              <Icon
                as={server.isLocal ? LuMonitor : LuServer}
                color={server.id === currentServer?.id ? 'green.500' : 'gray.500'}
              />
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
    return <Icon as={LuWifi} color="green.500" boxSize={3} />
  }

  // Удалённый сервер — проверяем lastSeen
  // Считаем онлайн, если lastSeen < 1 минуты назад
  if (server.lastSeen) {
    const lastSeenDate = new Date(server.lastSeen)
    const isOnline = Date.now() - lastSeenDate.getTime() < 60000

    return <Icon as={isOnline ? LuWifi : LuWifiOff} color={isOnline ? 'green.500' : 'red.500'} boxSize={3} />
  }

  return <Icon as={LuWifiOff} color="gray.500" boxSize={3} />
}
