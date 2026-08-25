'use client'

import { RoleHeader } from '@/app/_components/header/role-header'
import { Text } from '@chakra-ui/react'
import Link from 'next/link'
import { coachNavItems } from './coach-sidebar'

interface CoachHeaderProps {
  teamName: string
}

export function CoachHeader({ teamName }: CoachHeaderProps) {
  return (
    <RoleHeader
      title="Кубок Большого Слэма — Кабинет тренера"
      drawerTitle="КБС Тренер"
      colorPalette="teal"
      navItems={coachNavItems}
      rootHref="/coach"
      rightContent={
        <>
          <Text fontSize="sm" fontWeight="semibold" color="teal.fg">
            {teamName}
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
