/**
 * Все альбомы поэта.
 */

import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { playerDisplayName } from '@/lib/player-utils'
import { Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuArrowLeft } from 'react-icons/lu'

import { AlbumPoster } from '../_components/album-poster'

type Params = Promise<{ citySlug: string; slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug, slug } = await params
  const player = await prisma.player.findUnique({ where: { slug }, select: { name: true } })
  if (!player) {
    return { title: 'Поэт не найден' }
  }
  return {
    title: `Альбомы — ${player.name}`,
    alternates: { canonical: `/${citySlug}/players/${slug}/albums` },
  }
}

export default async function PlayerAlbumsPage({ params }: { params: Params }) {
  const { citySlug, slug } = await params

  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const player = await prisma.player.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      disambiguation: true,
      albums: {
        where: { publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          publishedAt: true,
          _count: { select: { albumPoems: true } },
        },
      },
    },
  })

  if (!player) {
    notFound()
  }

  return (
    <VStack gap={8} align="stretch">
      <Link href={`/${citySlug}/players/${slug}`} style={{ textDecoration: 'none' }}>
        <HStack gap={2} color="fg.muted" _hover={{ color: 'fg' }} transition="color 0.1s" fontSize="sm">
          <LuArrowLeft />
          <Text>{playerDisplayName(player)}</Text>
        </HStack>
      </Link>

      <Heading as="h1" size="xl">
        Альбомы
      </Heading>

      {player.albums.length > 0 ? (
        <Grid
          templateColumns={{
            base: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(5, 1fr)',
          }}
          gap={4}
        >
          {player.albums.map((album) => (
            <AlbumPoster
              key={album.id}
              title={album.title}
              href={`/${citySlug}/players/${slug}/albums/${album.slug}`}
              coverImage={album.coverImage}
              year={album.publishedAt ? new Date(album.publishedAt).getFullYear() : null}
              count={album._count.albumPoems}
              variant="album"
            />
          ))}
        </Grid>
      ) : (
        <Text color="fg.muted" textAlign="center" py={16}>
          Поэт ещё не опубликовал ни одного альбома
        </Text>
      )}
    </VStack>
  )
}
