'use client'

import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { signOut } from '@/lib/auth-client'
import { Box, Button, Container, Flex, Heading, HStack, Icon, Link } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LuActivity,
  LuBuilding2,
  LuCreditCard,
  LuFileText,
  LuGauge,
  LuHouse,
  LuLogOut,
  LuMessageSquare,
  LuScale,
  LuShield,
  LuUsers,
} from 'react-icons/lu'

const navItems = [
  { href: '/owner', label: 'Обзор', icon: LuHouse },
  { href: '/owner/users', label: 'Пользователи', icon: LuUsers },
  { href: '/owner/schools', label: 'Автошколы', icon: LuBuilding2 },
  { href: '/owner/tickets', label: 'Обращения', icon: LuMessageSquare },
  { href: '/owner/legal', label: 'Юр. документы', icon: LuScale },
  { href: '/owner/plans', label: 'Тарифы', icon: LuCreditCard },
  { href: '/owner/rate-limits', label: 'API лимиты', icon: LuGauge },
  { href: '/owner/api-logs', label: 'Логи API', icon: LuActivity },
  { href: '/owner/audit', label: 'Аудит', icon: LuFileText },
]

export function OwnerHeader() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Box bg="bg" borderBottomWidth="1px" borderColor="border" position="sticky" top={0} zIndex={10}>
      <Container maxW="container.xl">
        <Flex h="16" align="center" justify="space-between">
          <HStack gap={2}>
            <Icon as={LuShield} boxSize={6} color="fg.accent" />
            <Heading size="md">Панель владельца</Heading>
          </HStack>
          <HStack gap={2}>
            <Link as={NextLink} href="/dashboard" fontSize="sm" color="fg.muted">
              ← На главную
            </Link>
            <ColorModeButton />
            <Button size="sm" variant="ghost" color="fg.muted" onClick={handleSignOut}>
              <Icon as={LuLogOut} boxSize={4} />
              Выход
            </Button>
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}

export function OwnerNav() {
  return (
    <Box bg="bg" borderBottomWidth="1px" borderColor="border">
      <Container maxW="container.xl">
        <HStack gap={0} overflowX="auto" py={2}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              as={NextLink}
              href={item.href}
              px={4}
              py={2}
              borderRadius="md"
              fontSize="sm"
              fontWeight="medium"
              color="fg.muted"
              _hover={{ bg: 'bg.muted', color: 'fg' }}
              whiteSpace="nowrap"
            >
              <HStack gap={2}>
                <Icon as={item.icon} boxSize={4} />
                <span>{item.label}</span>
              </HStack>
            </Link>
          ))}
        </HStack>
      </Container>
    </Box>
  )
}
