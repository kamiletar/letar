'use client'

/**
 * Хедер кабинета поэта — тонкая обёртка над RoleHeader
 */

import { RoleHeader } from '@/app/_components/header/role-header'
import { Text } from '@chakra-ui/react'
import Link from 'next/link'
import { poetNavItems } from './poet-sidebar'

interface PoetHeaderProps {
  playerName: string
  publicProfileHref: string | null
}

export function PoetHeader({ playerName, publicProfileHref }: PoetHeaderProps) {
  return (
    <RoleHeader
      title="Кубок Большого Слэма — Кабинет поэта"
      drawerTitle="КБС Поэт"
      colorPalette="teal"
      navItems={poetNavItems}
      rootHref="/poet"
      rightContent={
        <>
          <Text fontSize="sm" fontWeight="semibold" color="teal.fg">
            {playerName}
          </Text>
          {publicProfileHref && (
            <Link href={publicProfileHref}>
              <Text fontSize="sm" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                Мой профиль
              </Text>
            </Link>
          )}
          <Link href="/">
            <Text fontSize="sm" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
              На сайт
            </Text>
          </Link>
        </>
      }
    />
  )
}
