'use client'

import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { UserMenu } from '@/app/_components/user-menu'
import { Box, Button, Link as ChakraLink, Container, Flex, Heading, HStack, Span } from '@chakra-ui/react'
import Link from 'next/link'

import { LogoIcon } from '@/app/_components/icons/logo-icon'
import { MobileMenu } from './mobile-menu'

interface HeaderProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
}

export function Header({ user }: HeaderProps) {
  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex="sticky"
      bg="bg.panel"
      backdropFilter="blur(10px)"
      borderBottomWidth={1}
    >
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center" py={1}>
          <Heading size="2xl">
            <ChakraLink asChild color={'brand.500'} display={'flex'} gap={0}>
              <Link href="/">
                <LogoIcon width={'64px'} height={'64px'} />
                <Span pl={2}>НаПрава</Span>
                <Span color={'accent.500'}>.РФ</Span>
              </Link>
            </ChakraLink>
          </Heading>

          {/* Desktop навигация */}
          <HStack gap={8} display={{ base: 'none', md: 'flex' }}>
            <Button asChild variant="ghost" size="sm">
              <Link href="#features">Возможности</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="#how-it-works">Как это работает</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/schools">Автошколы</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/instructors">Инструкторы</Link>
            </Button>
          </HStack>

          <HStack gap={2}>
            <ColorModeButton />
            {user ? (
              <UserMenu user={user} />
            ) : (
              <>
                {/* Desktop кнопки входа */}
                <Button asChild variant="ghost" size="sm" display={{ base: 'none', md: 'flex' }}>
                  <Link href="/sign-up">Регистрация</Link>
                </Button>
                <Button asChild size="sm" colorPalette="brand" display={{ base: 'none', md: 'flex' }}>
                  <Link href="/sign-in">Войти</Link>
                </Button>
              </>
            )}
            {/* Mobile hamburger меню */}
            <MobileMenu user={user} />
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}
