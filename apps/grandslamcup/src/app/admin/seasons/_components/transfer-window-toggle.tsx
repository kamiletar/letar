'use client'

/**
 * Toggle трансферного окна в настройках сезона
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Button, Flex, HStack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuArrowLeftRight } from 'react-icons/lu'
import { toggleTransferWindowAction } from '../_actions/seasons.action'

interface TransferWindowToggleProps {
  seasonId: string
  isOpen: boolean
}

export function TransferWindowToggle({ seasonId, isOpen }: TransferWindowToggleProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      const result = await toggleTransferWindowAction(seasonId, !isOpen)
      if (result.success) {
        toaster.success({
          title: isOpen ? 'Трансферное окно закрыто' : 'Трансферное окно открыто',
        })
        router.refresh()
      } else {
        toaster.error({ title: result.error })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex justify="space-between" align="center">
      <HStack gap={3}>
        <LuArrowLeftRight size={18} />
        <Text fontWeight="medium">Трансферное окно</Text>
        <Badge colorPalette={isOpen ? 'green' : 'gray'} size="sm">
          {isOpen ? 'Открыто' : 'Закрыто'}
        </Badge>
      </HStack>
      <Button
        size="sm"
        colorPalette={isOpen ? 'red' : 'green'}
        variant="outline"
        onClick={handleToggle}
        loading={loading}
      >
        {isOpen ? 'Закрыть' : 'Открыть'}
      </Button>
    </Flex>
  )
}
