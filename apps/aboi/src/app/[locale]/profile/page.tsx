import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth-utils'
import { prismaAuth } from '@/lib/prisma'

export default async function ProfilePage() {
  const user = await requireAuth()
  const [ordersCount, addressesCount, wishlistCount] = await Promise.all([
    prismaAuth.order.count({ where: { userId: user.id } }),
    prismaAuth.address.count({ where: { userId: user.id } }),
    prismaAuth.wishlist.count({ where: { userId: user.id } }),
  ])

  return (
    <Container maxW="5xl" py={{ base: 8, md: 12 }}>
      <Stack gap={6}>
        <Stack gap={2}>
          <Heading as="h1" size="3xl">
            Личный кабинет
          </Heading>
          <Text color="fg.muted">
            Привет, {user.name ?? user.email}!
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
          <ProfileCard label="Заказы" count={ordersCount} href="/profile/orders" />
          <ProfileCard label="Адреса доставки" count={addressesCount} href="/profile/addresses" />
          <ProfileCard label="Избранное" count={wishlistCount} href="/profile/favorites" />
          <ProfileCard label="Партнёрская программа" count={null} href="/profile/referrals" />
          <ProfileCard label="Настройки" count={null} href="/profile/settings" />
        </SimpleGrid>

        <Box pt={4}>
          <Box asChild color="red.fg" fontSize="sm" _hover={{ textDecoration: 'underline' }}>
            <Link href="/sign-out">Выйти из аккаунта →</Link>
          </Box>
        </Box>
      </Stack>
    </Container>
  )
}

function ProfileCard({ label, count, href }: { label: string; count: number | null; href: string }) {
  return (
    <Stack
      asChild
      p={5}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border"
      bg="bg.surface"
      _hover={{ borderColor: 'brand.solid' }}
      gap={1}
    >
      <Link href={href}>
        <Text fontSize="sm" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
          {label}
        </Text>
        {count !== null && (
          <Text fontSize="3xl" fontWeight="bold">
            {count}
          </Text>
        )}
      </Link>
    </Stack>
  )
}
