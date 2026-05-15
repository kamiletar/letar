'use client'

import { formatFileSize } from '@/lib/ipfs'
import { Badge, Box, Flex, HStack, Text } from '@chakra-ui/react'
import type { Distribution } from '../types'

/** Карточка активной раздачи */
export function DistributionCard({ distribution }: { distribution: Distribution }) {
  const timeSinceLastSeen = Math.round((Date.now() - new Date(distribution.lastSeenAt).getTime()) / 60000)

  return (
    <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px">
      <Flex justify="space-between" align="center" mb={2}>
        <HStack gap={2}>
          <Badge colorPalette="green">Активна</Badge>
          {distribution.anime && <Text fontWeight="semibold">{distribution.anime.title}</Text>}
        </HStack>
        <Text fontSize="xs" color="fg.muted">
          {timeSinceLastSeen < 1 ? 'только что' : `${timeSinceLastSeen} мин. назад`}
        </Text>
      </Flex>

      <HStack gap={4} flexWrap="wrap">
        <Text fontSize="sm" color="fg.muted">
          CID: <code>{distribution.cid.slice(0, 16)}...</code>
        </Text>
        <Text fontSize="sm" color="fg.muted">
          PeerID: <code>{distribution.peerId.slice(0, 16)}...</code>
        </Text>
        {distribution.size > 0 && (
          <Text fontSize="sm" color="fg.muted">
            {formatFileSize(distribution.size)}
          </Text>
        )}
        {distribution.user.name && (
          <Text fontSize="sm" color="fg.muted">
            Раздаёт: {distribution.user.name}
          </Text>
        )}
      </HStack>
    </Box>
  )
}
