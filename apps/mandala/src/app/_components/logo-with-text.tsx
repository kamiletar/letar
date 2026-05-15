'use client'

import { HStack, Text } from '@chakra-ui/react'

interface LogoWithTextProps {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { fontSize: 'lg', gap: 2 },
  md: { fontSize: '2xl', gap: 3 },
  lg: { fontSize: '3xl', gap: 4 },
}

/**
 * Компонент логотипа с текстом "Elfafeya Art".
 * Используется на страницах авторизации и в навигации.
 */
export function LogoWithText({ size = 'md' }: LogoWithTextProps) {
  const { fontSize, gap } = sizes[size]

  return (
    <HStack gap={gap}>
      <Text fontSize={fontSize} fontWeight="bold" color="fg" fontFamily="serif" letterSpacing="wide">
        ✦ Elfafeya Art
      </Text>
    </HStack>
  )
}
