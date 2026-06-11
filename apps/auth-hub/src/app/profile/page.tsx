import { isAdmin, requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Avatar, Badge, Box, Card, Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import { LuFingerprint, LuKey, LuKeyRound, LuLink, LuMail, LuPencil, LuShield, LuUser, LuUsers } from 'react-icons/lu'
import { PasskeyPromptBanner } from './_components/passkey-prompt-banner'
import { SignOutButton } from './_components/sign-out-button'

export const metadata: Metadata = {
  title: 'Профиль',
}

/**
 * Профиль пользователя — карточка + навигация по разделам
 */
export default async function ProfilePage() {
  const session = await requireAuth()
  const user = session.user
  const userIsAdmin = await isAdmin()

  // Получаем связанные аккаунты и passkeys
  const [accounts, passkeyCount] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      select: { providerId: true },
    }),
    prisma.passkey.count({ where: { userId: user.id } }),
  ])

  return (
    <Box maxW="lg" mx="auto" p={6}>
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
                    <Badge colorPalette={user.emailVerified ? 'green' : 'yellow'} size="sm">
                      {user.emailVerified ? 'подтверждён' : 'не подтверждён'}
                    </Badge>
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
              <Text fontSize="sm" color="fg.muted">
                Зарегистрирован:{' '}
                {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Баннер: добавить passkey после входа (показывается один раз) */}
        <PasskeyPromptBanner hasPasskeys={passkeyCount > 0} />

        {/* Навигация */}
        <Stack gap={3}>
          <Card.Root asChild>
            <NextLink href="/profile/settings">
              <Card.Body py={3}>
                <HStack gap={3}>
                  <LuPencil size={20} />
                  <Box>
                    <Text fontWeight="medium">Настройки профиля</Text>
                    <Text color="fg.muted" fontSize="sm">
                      Изменить имя
                    </Text>
                  </Box>
                </HStack>
              </Card.Body>
            </NextLink>
          </Card.Root>

          <Card.Root asChild>
            <NextLink href="/profile/connected-accounts">
              <Card.Body py={3}>
                <HStack gap={3}>
                  <LuLink size={20} />
                  <Box>
                    <Text fontWeight="medium">Связанные аккаунты</Text>
                    <Text color="fg.muted" fontSize="sm">
                      {accounts.length} подключённых провайдеров
                    </Text>
                  </Box>
                </HStack>
              </Card.Body>
            </NextLink>
          </Card.Root>

          <Card.Root asChild>
            <NextLink href="/profile/change-password">
              <Card.Body py={3}>
                <HStack gap={3}>
                  <LuKey size={20} />
                  <Box>
                    <Text fontWeight="medium">Пароль</Text>
                    <Text color="fg.muted" fontSize="sm">
                      {accounts.some((a) => a.providerId === 'credential') ? 'Установлен' : 'Не установлен'}
                    </Text>
                  </Box>
                </HStack>
              </Card.Body>
            </NextLink>
          </Card.Root>

          <Card.Root asChild>
            <NextLink href="/profile/passkeys">
              <Card.Body py={3}>
                <HStack gap={3}>
                  <LuFingerprint size={20} />
                  <Box>
                    <Text fontWeight="medium">Ключи доступа</Text>
                    <Text color="fg.muted" fontSize="sm">
                      {passkeyCount > 0
                        ? `${passkeyCount} ключ${passkeyCount === 1 ? '' : passkeyCount < 5 ? 'а' : 'ей'}`
                        : 'Не настроены'}
                    </Text>
                  </Box>
                </HStack>
              </Card.Body>
            </NextLink>
          </Card.Root>

          {userIsAdmin && (
            <Card.Root asChild>
              <NextLink href="/admin">
                <Card.Body py={3}>
                  <HStack gap={3}>
                    <LuUsers size={20} />
                    <Box>
                      <Text fontWeight="medium">Администрирование</Text>
                      <Text color="fg.muted" fontSize="sm">
                        Управление пользователями и клиентами
                      </Text>
                    </Box>
                  </HStack>
                </Card.Body>
              </NextLink>
            </Card.Root>
          )}
        </Stack>

        {/* Кнопка выхода */}
        <SignOutButton />
      </Stack>
    </Box>
  )
}
