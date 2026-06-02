'use client'

import type { UserWithRoles } from '@/lib/auth'
import { signOut } from '@/lib/auth-client'
import { Avatar, Badge, Box, Button, Card, Container, Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuKeyRound, LuLogOut, LuMail, LuShield, LuUser } from 'react-icons/lu'

interface ProfilePageProps {
  user: UserWithRoles
}

/**
 * Страница профиля авторизованного пользователя
 */
export function ProfilePage({ user }: ProfilePageProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleSignOut() {
    setLoggingOut(true)
    await signOut({ fetchOptions: { onSuccess: () => router.push('/sign-in') } })
  }

  return (
    <Container maxW="lg" py={12}>
      <Stack gap={6}>
        {/* Заголовок */}
        <HStack gap={3}>
          <LuKeyRound size={28} />
          <Heading size="xl">Ключница</Heading>
        </HStack>

        <Text color="fg.muted">Единый аккаунт для всех сервисов Letar</Text>

        <Separator />

        {/* Карточка профиля */}
        <Card.Root>
          <Card.Body>
            <Stack gap={5}>
              <HStack gap={4}>
                <Avatar.Root size="xl">
                  {user.image ? (
                    <Avatar.Image src={user.image} alt={user.name ?? ''} />
                  ) : (
                    <Avatar.Fallback>
                      <LuUser size={24} />
                    </Avatar.Fallback>
                  )}
                </Avatar.Root>
                <Stack gap={1}>
                  <Heading size="lg">{user.name || 'Пользователь'}</Heading>
                  <HStack gap={2} color="fg.muted">
                    <LuMail size={14} />
                    <Text fontSize="sm">{user.email}</Text>
                    {user.emailVerified && (
                      <Badge colorPalette="green" size="sm">
                        подтверждён
                      </Badge>
                    )}
                    {!user.emailVerified && (
                      <Badge colorPalette="yellow" size="sm">
                        не подтверждён
                      </Badge>
                    )}
                  </HStack>
                </Stack>
              </HStack>

              <Separator />

              {/* Роли */}
              <Box>
                <HStack gap={2} mb={2}>
                  <LuShield size={16} />
                  <Text fontWeight="medium" fontSize="sm">
                    Роли
                  </Text>
                </HStack>
                <HStack gap={2} flexWrap="wrap">
                  {(user.roles ?? ['USER']).map((role) => (
                    <Badge key={role} variant="outline" size="sm">
                      {role}
                    </Badge>
                  ))}
                </HStack>
              </Box>

              {/* Дата регистрации */}
              <Box>
                <Text fontSize="sm" color="fg.muted">
                  Зарегистрирован:{' '}
                  {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </Box>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Кнопка выхода */}
        <Button variant="outline" colorPalette="red" onClick={handleSignOut} loading={loggingOut} w="full">
          <LuLogOut />
          Выйти
        </Button>
      </Stack>
    </Container>
  )
}
