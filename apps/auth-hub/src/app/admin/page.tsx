import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Box, Card, Heading, HStack, SimpleGrid, Stat, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import { LuSettings, LuUsers } from 'react-icons/lu'

export const metadata: Metadata = {
  title: 'Администрирование',
}

/**
 * Админ-панель ключницы
 */
export default async function AdminPage() {
  await requireAdmin()

  const [userCount, clientCount, profileCount] = await Promise.all([
    prisma.user.count(),
    prisma.oauthApplication.count(),
    prisma.projectProfile.count(),
  ])

  return (
    <Box maxW="4xl" mx="auto" p={6}>
      <Heading size="xl" mb={6}>
        Администрирование
      </Heading>

      {/* Статистика */}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={8}>
        <Card.Root>
          <Card.Body>
            <Stat.Root>
              <Stat.Label>Пользователи</Stat.Label>
              <Stat.ValueText>{userCount}</Stat.ValueText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body>
            <Stat.Root>
              <Stat.Label>OAuth клиенты</Stat.Label>
              <Stat.ValueText>{clientCount}</Stat.ValueText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body>
            <Stat.Root>
              <Stat.Label>Профили проектов</Stat.Label>
              <Stat.ValueText>{profileCount}</Stat.ValueText>
            </Stat.Root>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {/* Навигация */}
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <Card.Root asChild>
          <NextLink href="/admin/clients">
            <Card.Body>
              <HStack gap={3}>
                <LuSettings size={24} />
                <Box>
                  <Text fontWeight="bold">OAuth клиенты</Text>
                  <Text color="fg.muted" fontSize="sm">
                    Управление зарегистрированными приложениями
                  </Text>
                </Box>
              </HStack>
            </Card.Body>
          </NextLink>
        </Card.Root>

        <Card.Root asChild>
          <NextLink href="/admin/users">
            <Card.Body>
              <HStack gap={3}>
                <LuUsers size={24} />
                <Box>
                  <Text fontWeight="bold">Пользователи</Text>
                  <Text color="fg.muted" fontSize="sm">
                    Управление пользователями и профилями
                  </Text>
                </Box>
              </HStack>
            </Card.Body>
          </NextLink>
        </Card.Root>
      </SimpleGrid>
    </Box>
  )
}
