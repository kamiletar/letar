'use client'

import { Drawer, IconButton, Portal } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuMenu, LuX } from 'react-icons/lu'

import { HomeLink } from './home-link'
import { SidebarNav } from './sidebar-nav'

/**
 * Мобильная версия sidebar в виде Drawer.
 * Показывается на экранах < 1024px.
 */
export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false)

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <>
      {/* Кнопка открытия */}
      <IconButton
        aria-label="Открыть меню"
        variant="ghost"
        size="sm"
        display={{ base: 'flex', lg: 'none' }}
        onClick={() => setIsOpen(true)}
      >
        <LuMenu />
      </IconButton>

      {/* Drawer с навигацией */}
      <Drawer.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)} placement="start">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content maxW="280px">
              <Drawer.Header borderBottomWidth="1px">
                <Drawer.Title>Навигация</Drawer.Title>
                <Drawer.CloseTrigger asChild position="absolute" top={3} right={3}>
                  <IconButton aria-label="Закрыть" variant="ghost" size="sm">
                    <LuX />
                  </IconButton>
                </Drawer.CloseTrigger>
              </Drawer.Header>

              <Drawer.Body py={4}>
                <HomeLink onClick={handleClose} />
                <SidebarNav onItemClick={handleClose} />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </>
  )
}
