'use client'

import { Box, Flex, Icon, Link, Text, VStack } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { LuChartBar, LuFiles, LuHistory, LuKeyboard, LuPackage, LuPrinter, LuScan, LuSettings } from 'react-icons/lu'

interface NavItemProps {
  href: string
  icon: ReactNode
  children: ReactNode
}

function NavItem({ href, icon, children }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      as={NextLink}
      href={href}
      display="flex"
      alignItems="center"
      gap={3}
      px={4}
      py={3}
      borderRadius="lg"
      fontWeight={isActive ? 'semibold' : 'normal'}
      color={isActive ? 'colorPalette.fg' : 'fg.muted'}
      bg={isActive ? 'colorPalette.subtle' : 'transparent'}
      _hover={{
        bg: isActive ? 'colorPalette.subtle' : 'bg.subtle',
        textDecoration: 'none',
      }}
      transition="all 0.2s"
    >
      {icon}
      <Text>{children}</Text>
    </Link>
  )
}

export function Sidebar() {
  return (
    <Box
      as="nav"
      w="250px"
      h="100vh"
      bg="bg.panel"
      borderRightWidth={1}
      borderColor="border.subtle"
      position="fixed"
      left={0}
      top={0}
      py={6}
      data-colorpalette="blue"
      display="flex"
      flexDirection="column"
    >
      <VStack align="stretch" gap={1} px={3} flex={1}>
        {/* Логотип */}
        <Flex align="center" gap={3} px={4} mb={6}>
          <Icon fontSize="2xl" color="colorPalette.fg">
            <LuPrinter />
          </Icon>
          <Box>
            <Text fontWeight="bold" fontSize="lg">
              Label Printer
            </Text>
            <Text fontSize="xs" color="fg.muted">
              Desktop
            </Text>
          </Box>
        </Flex>

        {/* Навигация */}
        <NavItem
          href="/home"
          icon={
            <Icon fontSize="xl">
              <LuScan />
            </Icon>
          }
        >
          Сканирование
        </NavItem>
        <NavItem
          href="/manual"
          icon={
            <Icon fontSize="xl">
              <LuKeyboard />
            </Icon>
          }
        >
          Ручной ввод
        </NavItem>
        <NavItem
          href="/batch"
          icon={
            <Icon fontSize="xl">
              <LuFiles />
            </Icon>
          }
        >
          Пакетная печать
        </NavItem>
        <NavItem
          href="/history"
          icon={
            <Icon fontSize="xl">
              <LuHistory />
            </Icon>
          }
        >
          История
        </NavItem>
        <NavItem
          href="/stats"
          icon={
            <Icon fontSize="xl">
              <LuChartBar />
            </Icon>
          }
        >
          Статистика
        </NavItem>
        <NavItem
          href="/products"
          icon={
            <Icon fontSize="xl">
              <LuPackage />
            </Icon>
          }
        >
          Товары
        </NavItem>

        <Box h={4} />

        <NavItem
          href="/settings"
          icon={
            <Icon fontSize="xl">
              <LuSettings />
            </Icon>
          }
        >
          Настройки
        </NavItem>
      </VStack>

      {/* Переключатель темы */}
      <Flex px={4} py={3} borderTopWidth={1} borderColor="border.subtle" justify="space-between" align="center">
        <Text fontSize="sm" color="fg.muted">
          Тема
        </Text>
        <ColorModeButton />
      </Flex>
    </Box>
  )
}
