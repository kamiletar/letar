'use client'

import { Box, Link as ChakraLink, HStack } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Навигация по разделам Nginx Proxy Manager
 */
export function NginxNav() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <Box mb="6" pb="4" borderBottomWidth="1px" borderColor="border.subtle">
      <HStack gap="6">
        <Link href="/nginx/proxy-hosts" passHref legacyBehavior>
          <ChakraLink
            fontWeight={isActive('/nginx/proxy-hosts') ? 'bold' : 'normal'}
            color={isActive('/nginx/proxy-hosts') ? 'fg' : 'fg.muted'}
            _hover={{ color: 'fg' }}
          >
            Proxy Hosts
          </ChakraLink>
        </Link>
        <Link href="/nginx/certificates" passHref legacyBehavior>
          <ChakraLink
            fontWeight={isActive('/nginx/certificates') ? 'bold' : 'normal'}
            color={isActive('/nginx/certificates') ? 'fg' : 'fg.muted'}
            _hover={{ color: 'fg' }}
          >
            Certificates
          </ChakraLink>
        </Link>
        <Link href="/nginx/access-lists" passHref legacyBehavior>
          <ChakraLink
            fontWeight={isActive('/nginx/access-lists') ? 'bold' : 'normal'}
            color={isActive('/nginx/access-lists') ? 'fg' : 'fg.muted'}
            _hover={{ color: 'fg' }}
          >
            Access Lists
          </ChakraLink>
        </Link>
      </HStack>
    </Box>
  )
}
