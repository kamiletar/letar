/**
 * Страница редактирования профиля поэта
 */

import { prisma } from '@/lib/db'
import { requirePoet } from '@/lib/roles'
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { PoetProfileForm } from './_components/poet-profile-form'

export default async function PoetProfilePage() {
  const poet = await requirePoet()

  const player = await prisma.player.findUnique({
    where: { id: poet.playerId },
    select: {
      id: true,
      name: true,
      photo: true,
      bio: true,
      socialLinks: true,
    },
  })

  if (!player) {
    return <Text color="fg.muted">Профиль не найден</Text>
  }

  /** Ссылка на публичный профиль */
  const publicProfileHref = poet.citySlug
    ? `/${poet.citySlug}/players/${poet.playerSlug}`
    : `/players/${poet.playerSlug}`

  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">Профиль</Heading>

      <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
        <PoetProfileForm
          playerId={player.id}
          playerName={player.name}
          playerPhoto={player.photo}
          bio={player.bio}
          socialLinks={(player.socialLinks as Array<{ platform: string; url: string }>) ?? []}
        />
      </Box>

      {/* Ссылки */}
      <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
        <Heading size="sm" mb={3}>
          Ссылки
        </Heading>
        <VStack gap={2} align="stretch">
          <Link href={publicProfileHref}>
            <Text fontSize="sm" color="teal.fg" _hover={{ textDecoration: 'underline' }}>
              Мой публичный профиль →
            </Text>
          </Link>
          <Link href="https://auth.letar.best" target="_blank">
            <Text fontSize="sm" color="teal.fg" _hover={{ textDecoration: 'underline' }}>
              Настройки аккаунта (Ключница) →
            </Text>
          </Link>
        </VStack>
      </Box>
    </VStack>
  )
}
