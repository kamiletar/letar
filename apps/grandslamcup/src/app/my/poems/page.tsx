/**
 * Хаб управления стихами и альбомами поэта.
 */

import { prisma } from '@/lib/db'
import { requirePoet } from '@/lib/roles'
import { Button, Heading, HStack, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LuPlus } from 'react-icons/lu'

import { AlbumsList } from './_components/albums-list'

export const metadata: Metadata = {
  title: 'Мои стихи и альбомы',
}

export default async function MyPoemsPage() {
  const poet = await requirePoet()

  const albums = await prisma.album.findMany({
    where: { playerId: poet.playerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      publishedAt: true,
      _count: { select: { albumPoems: true } },
    },
  })

  return (
    <VStack gap={8} align="stretch">
      <HStack justify="space-between" align="center">
        <Heading as="h1" size="xl">
          Мои альбомы
        </Heading>
        <Link href="/my/poems/albums/new">
          <Button colorPalette="brand" size="sm">
            <LuPlus />
            Новый альбом
          </Button>
        </Link>
      </HStack>

      <AlbumsList albums={albums} />
    </VStack>
  )
}
