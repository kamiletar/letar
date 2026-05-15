'use client'

import { Link, Text } from '@chakra-ui/react'
import NextLink from 'next/link'

interface HomeLinkProps {
  /** Колбэк при клике (для закрытия мобильного меню) */
  onClick?: () => void
}

/**
 * Ссылка на главную страницу.
 * Используется в sidebar и mobile-sidebar.
 */
export function HomeLink({ onClick }: HomeLinkProps) {
  return (
    <Link asChild mb={6} display="block" onClick={onClick}>
      <NextLink href="/">
        <Text fontSize="sm" color="fg.muted" _hover={{ color: 'brand.600' }}>
          ← На главную
        </Text>
      </NextLink>
    </Link>
  )
}
