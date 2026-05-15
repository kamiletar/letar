'use client'

import { LogoIcon } from '@/app/_components/icons/logo-icon'
import { Link as ChakraLink, Heading, Span } from '@chakra-ui/react'
import Link from 'next/link'

interface LogoWithTextProps {
  size?: 'md' | 'lg' | 'xl'
}

const sizeConfig = {
  md: { heading: 'xl' as const, icon: '48px' },
  lg: { heading: '2xl' as const, icon: '64px' },
  xl: { heading: '3xl' as const, icon: '80px' },
}

/**
 * Логотип с названием "НаПрава.РФ"
 * Переиспользуется на главной, страницах авторизации и 404
 */
export function LogoWithText({ size = 'lg' }: LogoWithTextProps) {
  const config = sizeConfig[size]

  return (
    <Heading size={config.heading}>
      <ChakraLink asChild color="brand.500" display="flex" alignItems="center" gap={0}>
        <Link href="/">
          <LogoIcon width={config.icon} height={config.icon} />
          <Span pl={2}>НаПрава</Span>
          <Span color="accent.500">.РФ</Span>
        </Link>
      </ChakraLink>
    </Heading>
  )
}
