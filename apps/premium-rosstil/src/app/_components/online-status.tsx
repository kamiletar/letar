'use client'

import { Box, HStack, Icon, Text } from '@chakra-ui/react'
import { useOnlineStatus } from '@letar/hooks'
import { useEffect, useState } from 'react'
import { MdSignalWifi4Bar, MdSignalWifiOff } from 'react-icons/md'

/**
 * Компонент для отображения статуса подключения к интернету
 * Показывает баннер при потере связи и при восстановлении
 */
export function OnlineStatus() {
  const isOnline = useOnlineStatus()
  const [showBanner, setShowBanner] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      // Ушли в оффлайн — показываем баннер и запоминаем
      setWasOffline(true)
      setShowBanner(true)
      return undefined
    }

    if (wasOffline) {
      // Вернулись онлайн после оффлайна — показываем на 3 секунды
      setShowBanner(true)
      const timer = setTimeout(() => {
        setShowBanner(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }

    return undefined
  }, [isOnline, wasOffline])

  if (!showBanner) {
    return null
  }

  return (
    <Box
      position="fixed"
      bottom={4}
      left="50%"
      transform="translateX(-50%)"
      bg={isOnline ? 'green.600' : 'orange.500'}
      color="white"
      px={4}
      py={2}
      borderRadius="full"
      zIndex={9999}
      shadow="lg"
    >
      <HStack gap={2}>
        <Icon fontSize="md">{isOnline ? <MdSignalWifi4Bar /> : <MdSignalWifiOff />}</Icon>
        <Text fontSize="sm" fontWeight="medium">
          {isOnline ? 'Подключение восстановлено' : 'Оффлайн режим'}
        </Text>
      </HStack>
    </Box>
  )
}
