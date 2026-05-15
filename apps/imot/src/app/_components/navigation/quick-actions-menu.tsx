'use client'

import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '@/app/_components/ui/menu'
import { Button } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuCalendar, LuFileText, LuPlus, LuUser } from 'react-icons/lu'

/**
 * Quick Actions menu для специалистов
 * Позволяет быстро создавать клиентов, сессии и планы
 */
export function QuickActionsMenu() {
  return (
    <MenuRoot positioning={{ placement: 'bottom' }}>
      <MenuTrigger asChild>
        <Button colorPalette="fg" size="sm">
          <LuPlus /> Создать
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem asChild value="client">
          <NextLink href="/clients/new">
            <LuUser /> Новый клиент
          </NextLink>
        </MenuItem>
        <MenuItem asChild value="session">
          <NextLink href="/sessions/new">
            <LuCalendar /> Новая сессия
          </NextLink>
        </MenuItem>
        <MenuItem asChild value="plan">
          <NextLink href="/plans/new">
            <LuFileText /> Новый план
          </NextLink>
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  )
}
