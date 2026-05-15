'use client'

import type { LinkProps } from '@chakra-ui/react'
import { Link as ChakraLink } from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'

type props = Omit<LinkProps, 'href'> & Required<Pick<LinkProps, 'href'>>

export const NavLink = ({ href, children, ...otherProps }: props) => {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <ChakraLink asChild fontWeight={isActive ? 'bold' : 'normal'} {...otherProps}>
      <NextLink href={href}>{children}</NextLink>
    </ChakraLink>
  )
}
