'use client'

import { Button, CloseButton, Drawer, IconButton, Portal, Separator, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useState } from 'react'
import { LuMenu } from 'react-icons/lu'

interface MobileMenuProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
}

/**
 * Мобильное меню для лендинга.
 * - Hamburger кнопка видна только на мобильных
 * - Drawer выезжает снизу на мобильных (placement="bottom")
 * - Содержит навигационные ссылки и кнопки входа/регистрации
 */
export function MobileMenu({ user }: MobileMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="bottom">
      {/* Hamburger кнопка - только на мобильных */}
      <Drawer.Trigger asChild>
        <IconButton aria-label="Открыть меню" variant="ghost" size="sm" display={{ base: 'flex', md: 'none' }}>
          <LuMenu size={20} />
        </IconButton>
      </Drawer.Trigger>

      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content roundedTop="2xl" maxH="70vh">
            <Drawer.Header borderBottomWidth={1}>
              <Drawer.Title>Меню</Drawer.Title>
              <Drawer.CloseTrigger asChild position="absolute" top={3} right={3}>
                <CloseButton size="sm" />
              </Drawer.CloseTrigger>
            </Drawer.Header>

            <Drawer.Body py={4}>
              <VStack gap={2} align="stretch">
                {/* Навигационные ссылки */}
                <Button asChild variant="ghost" justifyContent="flex-start" size="lg" onClick={() => setOpen(false)}>
                  <Link href="#features">Возможности</Link>
                </Button>

                <Button asChild variant="ghost" justifyContent="flex-start" size="lg" onClick={() => setOpen(false)}>
                  <Link href="#how-it-works">Как это работает</Link>
                </Button>

                <Button asChild variant="ghost" justifyContent="flex-start" size="lg" onClick={() => setOpen(false)}>
                  <Link href="/schools">Автошколы</Link>
                </Button>

                <Button asChild variant="ghost" justifyContent="flex-start" size="lg" onClick={() => setOpen(false)}>
                  <Link href="/instructors">Инструкторы</Link>
                </Button>

                <Separator my={2} />

                {/* Кнопки входа/регистрации */}
                {user ? (
                  <Button asChild colorPalette="brand" size="lg" onClick={() => setOpen(false)}>
                    <Link href="/dashboard">Личный кабинет</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" size="lg" onClick={() => setOpen(false)}>
                      <Link href="/sign-in">Войти</Link>
                    </Button>

                    <Button asChild colorPalette="primary" size="lg" onClick={() => setOpen(false)}>
                      <Link href="/sign-up">Регистрация</Link>
                    </Button>
                  </>
                )}
              </VStack>
            </Drawer.Body>

            <Drawer.Footer borderTopWidth={1} justifyContent="center">
              <Text fontSize="sm" color="fg.muted">
                НаПрава.РФ — Платформа для автошкол
              </Text>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
