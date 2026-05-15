'use client'

import { Box, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { LuBuilding2, LuCheck, LuEye, LuMapPin, LuStar, LuUsers } from 'react-icons/lu'

const iconMap = {
  building: LuBuilding2,
  check: LuCheck,
  eye: LuEye,
  mapPin: LuMapPin,
  star: LuStar,
  users: LuUsers,
} as const

type IconName = keyof typeof iconMap

interface StatBadgeProps {
  iconName: IconName
  label: string
  value: number
  color: string
}

export function StatBadge({ iconName, label, value, color }: StatBadgeProps) {
  const IconComponent = iconMap[iconName]

  return (
    <HStack gap={3} px={4} py={2} borderRadius="lg" bg="bg.muted" borderWidth="1px" borderColor="border" minW="150px">
      <Box p={2} borderRadius="md" bg={`${color}.100`} color={`${color}.600`}>
        <Icon as={IconComponent} boxSize={4} />
      </Box>
      <VStack align="start" gap={0}>
        <Text fontSize="xs" color="fg.muted">
          {label}
        </Text>
        <Text fontSize="lg" fontWeight="bold">
          {value.toLocaleString('ru-RU')}
        </Text>
      </VStack>
    </HStack>
  )
}
