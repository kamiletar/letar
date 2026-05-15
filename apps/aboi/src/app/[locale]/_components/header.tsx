import { getCurrentUser } from '@/lib/auth-utils'
import { getCartViewAction } from '@/lib/cart'
import { Badge, Box, Button, Container, HStack, Link } from '@chakra-ui/react'
import NextLink from 'next/link'
import { Suspense } from 'react'

export async function Header() {
  return (
    <Box as="header" borderBottomWidth="1px" borderColor="border" bg="bg" position="sticky" top={0} zIndex="sticky">
      <Container maxW="6xl">
        <HStack h={16} justify="space-between">
          <Link
            asChild
            fontWeight="bold"
            fontSize="lg"
            color="fg"
            _hover={{ color: 'brand.solid', textDecoration: 'none' }}
          >
            <NextLink href="/">НейроАбоИ</NextLink>
          </Link>

          <HStack gap={6} display={{ base: 'none', md: 'flex' }}>
            <Link asChild fontSize="sm" color="fg.muted" _hover={{ color: 'fg', textDecoration: 'none' }}>
              <NextLink href="/catalog">Каталог</NextLink>
            </Link>
            <Link asChild fontSize="sm" color="fg.muted" _hover={{ color: 'fg', textDecoration: 'none' }}>
              <NextLink href="/delivery">Доставка</NextLink>
            </Link>
          </HStack>

          <HStack gap={2}>
            <Suspense fallback={<Box w={10} h={10} />}>
              <CartButton />
            </Suspense>
            <Suspense fallback={<Box w={16} h={10} />}>
              <AuthButton />
            </Suspense>
          </HStack>
        </HStack>
      </Container>
    </Box>
  )
}

async function CartButton() {
  const cart = await getCartViewAction()
  const count = cart.itemCount

  return (
    <Box position="relative" display="inline-flex">
      <Link asChild color="fg.muted" _hover={{ color: 'fg', textDecoration: 'none' }}>
        <NextLink href="/cart">
          <Box
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            w={10}
            h={10}
            borderRadius="md"
            _hover={{ bg: 'bg.subtle' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </Box>
        </NextLink>
      </Link>
      {count > 0 && (
        <Badge
          position="absolute"
          top="-1"
          right="-1"
          colorPalette="brand"
          borderRadius="full"
          fontSize="2xs"
          minW={4}
          h={4}
          display="flex"
          alignItems="center"
          justifyContent="center"
          px={1}
        >
          {count}
        </Badge>
      )}
    </Box>
  )
}

async function AuthButton() {
  const user = await getCurrentUser()

  if (user && !user.isAnonymous) {
    const isAdmin = user.roles.includes('ADMIN')
    return (
      <HStack gap={2}>
        {isAdmin && (
          <Button size="sm" variant="outline" colorPalette="orange" asChild>
            <NextLink href="/admin">Админка</NextLink>
          </Button>
        )}
        <Button size="sm" variant="ghost" asChild>
          <NextLink href="/profile">{user.name?.split(' ')[0] ?? 'Профиль'}</NextLink>
        </Button>
      </HStack>
    )
  }

  return (
    <Button size="sm" colorPalette="brand" asChild>
      <NextLink href="/sign-in">Войти</NextLink>
    </Button>
  )
}
