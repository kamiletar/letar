/**
 * Декоративный заголовок секции с левой brand-полоской.
 * Используется на публичных страницах для визуальной иерархии.
 */

import { Heading, type HeadingProps } from '@chakra-ui/react'

interface SectionHeadingProps extends HeadingProps {
  children: React.ReactNode
}

export function SectionHeading({ children, ...props }: SectionHeadingProps) {
  return (
    <Heading size="lg" borderLeftWidth="4px" borderLeftColor="brand.solid" pl={3} {...props}>
      {children}
    </Heading>
  )
}
