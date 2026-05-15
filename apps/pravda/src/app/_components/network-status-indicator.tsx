'use client'

import { Icon, Tooltip } from '@chakra-ui/react'
import { useOfflineConsent, useOnlineStatus } from '@letar/hooks'
import { useEffect, useState } from 'react'
import { LuWifi, LuWifiOff } from 'react-icons/lu'

/**
 * Индикатор статуса сети в header.
 *
 * Показывается только если пользователь включил оффлайн режим.
 * Отображает иконку Wi-Fi / Wi-Fi-Off с tooltip.
 */
export function NetworkStatusIndicator() {
  const { isAccepted } = useOfflineConsent('pravda-offline-consent')
  const isOnline = useOnlineStatus()
  const [isReady, setIsReady] = useState(false)

  // Ждём гидратации
  useEffect(() => {
    setIsReady(true)
  }, [])

  // Не показываем до гидратации или если оффлайн не включён
  if (!isReady || !isAccepted) {
    return null
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Icon
          as={isOnline ? LuWifi : LuWifiOff}
          boxSize={4}
          color={isOnline ? 'success.fg' : 'fg.muted'}
          cursor="help"
          aria-label={isOnline ? 'Онлайн' : 'Оффлайн'}
        />
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>{isOnline ? 'Онлайн' : 'Оффлайн — доступны сохранённые документы'}</Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}
