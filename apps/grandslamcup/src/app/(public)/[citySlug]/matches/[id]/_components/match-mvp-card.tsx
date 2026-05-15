/**
 * Карточка MVP матча.
 */

import { Box, Circle, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuStar } from 'react-icons/lu'

interface MatchMvpCardProps {
  mvp: { playerName: string; playerSlug: string; totalScore: number | null }
  citySlug: string
}

export function MatchMvpCard({ mvp, citySlug }: MatchMvpCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="yellow.500"
      borderRadius="xl"
      p={4}
      bg={{ base: 'yellow.50', _dark: 'yellow.950/30' }}
    >
      <HStack gap={3} justify="center">
        <Circle size={10} bg="yellow.100" _dark={{ bg: 'yellow.900' }} color="yellow.600">
          <LuStar size={20} />
        </Circle>
        <VStack gap={0} align="start">
          <Text fontSize="xs" color="fg.muted">
            MVP матча
          </Text>
          <Link href={`/${citySlug}/players/${mvp.playerSlug}`}>
            <Text fontWeight="bold" fontSize="lg" _hover={{ color: 'brand.solid' }}>
              {mvp.playerName}
            </Text>
          </Link>
          <Text fontSize="sm" color="brand.solid" fontWeight="semibold">
            {mvp.totalScore} баллов
          </Text>
        </VStack>
      </HStack>
    </Box>
  )
}
