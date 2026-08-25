'use client'

import { RoleHeader } from '@/app/_components/header/role-header'
import { Text } from '@chakra-ui/react'
import Link from 'next/link'
import { navItems } from './admin-sidebar'

interface AdminHeaderProps {
  userName: string | null
}

export function AdminHeader({ userName }: AdminHeaderProps) {
  return (
    <RoleHeader
      title="Кубок Большого Слэма — Админ-панель"
      shortTitle="КБС Админ"
      drawerTitle="КБС Админ"
      colorPalette="brand"
      navItems={navItems}
      rootHref="/admin"
      rightContent={
        <>
          <Text fontSize="sm" color="fg.muted" display={{ base: 'none', md: 'block' }}>
            {userName || 'Администратор'}
          </Text>
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
