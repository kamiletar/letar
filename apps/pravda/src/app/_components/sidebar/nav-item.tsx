'use client'

import { Box, Link } from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { memo } from 'react'

interface NavItemProps {
  title: string
  href: string
}

/**
 * Элемент навигации в sidebar.
 * Подсвечивается, если соответствует текущему пути.
 * Мемоизирован для оптимизации ререндеров (22+ элементов в sidebar).
 */
export const NavItem = memo(function NavItem({ title, href }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      asChild
      display="block"
      py={1.5}
      px={3}
      mx={1}
      mb={1}
      fontSize="sm"
      borderRadius="md"
      color={isActive ? 'brand.600' : 'fg.default'}
      bg={isActive ? 'brand.subtle' : 'transparent'}
      fontWeight={isActive ? 'semibold' : 'normal'}
      _hover={{
        bg: isActive ? 'brand.subtle' : 'bg.subtle',
        textDecoration: 'none',
      }}
      _dark={{
        color: isActive ? 'brand.400' : 'fg.default',
      }}
    >
      <NextLink href={href}>
        <Box as="span">{title}</Box>
      </NextLink>
    </Link>
  )
})
