'use client'

import { Box, HStack, Link as ChakraLink } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function DockerNav() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <Box mb="6" pb="4" borderBottomWidth="1px" borderColor="border.subtle">
      <HStack gap="6">
        <Link href="/docker/containers" passHref legacyBehavior>
          <ChakraLink
            fontWeight={isActive('/docker/containers') ? 'bold' : 'normal'}
            color={isActive('/docker/containers') ? 'fg' : 'fg.muted'}
            _hover={{ color: 'fg' }}
          >
            Containers
          </ChakraLink>
        </Link>
        <Link href="/docker/images" passHref legacyBehavior>
          <ChakraLink
            fontWeight={isActive('/docker/images') ? 'bold' : 'normal'}
            color={isActive('/docker/images') ? 'fg' : 'fg.muted'}
            _hover={{ color: 'fg' }}
          >
            Images
          </ChakraLink>
        </Link>
        <Link href="/docker/volumes" passHref legacyBehavior>
          <ChakraLink
            fontWeight={isActive('/docker/volumes') ? 'bold' : 'normal'}
            color={isActive('/docker/volumes') ? 'fg' : 'fg.muted'}
            _hover={{ color: 'fg' }}
          >
            Volumes
          </ChakraLink>
        </Link>
        <Link href="/docker/networks" passHref legacyBehavior>
          <ChakraLink
            fontWeight={isActive('/docker/networks') ? 'bold' : 'normal'}
            color={isActive('/docker/networks') ? 'fg' : 'fg.muted'}
            _hover={{ color: 'fg' }}
          >
            Networks
          </ChakraLink>
        </Link>
      </HStack>
    </Box>
  )
}
