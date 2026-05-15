'use client'

/**
 * Фильтр отстранений: только активные / все.
 */

import { Box, HStack, Text } from '@chakra-ui/react'
import Link from 'next/link'

interface SuspensionFilterProps {
  activeOnly: boolean
  citySlug: string
}

export function SuspensionFilter({ activeOnly, citySlug }: SuspensionFilterProps) {
  const base = `/${citySlug}/suspensions`

  return (
    <HStack gap={1}>
      <Link href={base}>
        <Box
          px={3}
          py={1.5}
          borderRadius="full"
          fontSize="sm"
          fontWeight={!activeOnly ? 'semibold' : 'normal'}
          bg={!activeOnly ? 'brand.subtle' : 'transparent'}
          color={!activeOnly ? 'brand.solid' : 'fg.muted'}
          _hover={{ bg: !activeOnly ? 'brand.subtle' : 'bg.subtle' }}
          transition="all 0.15s"
          cursor="pointer"
        >
          <Text>Все</Text>
        </Box>
      </Link>
      <Link href={`${base}?activeOnly=1`}>
        <Box
          px={3}
          py={1.5}
          borderRadius="full"
          fontSize="sm"
          fontWeight={activeOnly ? 'semibold' : 'normal'}
          bg={activeOnly ? 'red.subtle' : 'transparent'}
          color={activeOnly ? 'red.solid' : 'fg.muted'}
          _hover={{ bg: activeOnly ? 'red.subtle' : 'bg.subtle' }}
          transition="all 0.15s"
          cursor="pointer"
        >
          <Text>Только активные</Text>
        </Box>
      </Link>
    </HStack>
  )
}
