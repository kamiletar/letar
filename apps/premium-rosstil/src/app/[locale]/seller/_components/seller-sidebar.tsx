'use client'

import { Box, Link as ChakraLink, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { sellerNavItems } from './seller-nav-items'

/**
 * Боковая навигация панели продавца.
 */
export function SellerSidebar() {
  const pathname = usePathname()

  return (
    <Box
      as="nav"
      position="sticky"
      top={4}
      bg="bg.panel"
      borderWidth="1px"
      borderRadius="lg"
      p={4}
      height="fit-content"
    >
      <VStack align="stretch" gap={1}>
        {sellerNavItems.map((item) => {
          const isActive =
            item.href === '/seller'
              ? pathname === item.href || pathname.match(/^\/[a-z]{2}\/seller$/)
              : pathname.includes(item.href)

          return (
            <ChakraLink
              key={item.href}
              asChild
              display="flex"
              alignItems="center"
              gap={3}
              px={4}
              py={3}
              borderRadius="md"
              fontWeight={isActive ? 'semibold' : 'normal'}
              color={isActive ? 'fg.500' : 'fg.muted'}
              bg={isActive ? 'fg.100' : 'transparent'}
              _hover={{
                bg: isActive ? 'fg.100' : 'bg.muted',
                color: isActive ? 'fg.600' : 'fg',
                textDecoration: 'none',
              }}
              transition="all 0.2s"
            >
              <NextLink href={item.href}>
                <Box as="span" fontSize="lg">
                  {item.icon}
                </Box>
                {item.label}
              </NextLink>
            </ChakraLink>
          )
        })}
      </VStack>
    </Box>
  )
}
