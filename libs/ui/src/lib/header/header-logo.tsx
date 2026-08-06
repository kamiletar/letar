'use client'

import type { BoxProps } from '@chakra-ui/react'
import { Box, Text } from '@chakra-ui/react'
import Link from 'next/link'
import type { ReactNode } from 'react'

export interface HeaderLogoProps extends Omit<BoxProps, 'children'> {
  /**
   * URL для ссылки с логотипа
   * @default '/'
   */
  href?: string
  /**
   * Контент логотипа (текст или компонент)
   */
  children?: ReactNode
  /**
   * Показывать как текст (если children — строка)
   * @default true
   */
  asText?: boolean
}

/**
 * Компонент логотипа в Header
 *
 * @example
 * ```tsx
 * // Текстовый логотип
 * <Header.Logo>My Brand</Header.Logo>
 *
 * // Кастомный компонент
 * <Header.Logo href="/">
 *   <Image src="/logo.svg" alt="Logo" />
 * </Header.Logo>
 * ```
 */
export function HeaderLogo({ href = '/', children, asText = true, ...boxProps }: HeaderLogoProps) {
  const content = typeof children === 'string' && asText
    ? (
      <Text
        fontSize="xl"
        fontWeight="bold"
        letterSpacing="tight"
        color="fg"
        _hover={{ color: 'colorPalette.600' }}
        transition="color 0.2s"
      >
        {children}
      </Text>
    )
    : children

  return (
    <Box asChild flexShrink={0} {...boxProps}>
      <Link href={href}>{content}</Link>
    </Box>
  )
}
