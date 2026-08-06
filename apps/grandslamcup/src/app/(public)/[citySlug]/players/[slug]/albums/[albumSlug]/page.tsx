/**
 * Страница альбома стихотворений поэта.
 */

import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { playerDisplayName } from '@/lib/player-utils'
import { Box, Heading, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuArrowLeft, LuBookOpen } from 'react-icons/lu'

import { AlbumPoemItem } from './_components/album-poem-item'

type Params = Promise<{ citySlug: string; slug: string; albumSlug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug, slug, albumSlug } = await params
  const album = await prisma.album.findUnique({
    where: { slug: albumSlug },
    select: { title: true, player: { select: { name: true } } },
  })
  if (!album) {
    return { title: 'Альбом не найден' }
  }
  return {
    title: `${album.title} — ${album.player.name}`,
    alternates: { canonical: `/${citySlug}/players/${slug}/albums/${albumSlug}` },
    openGraph: { title: album.title, description: `Альбом стихотворений ${album.player.name}` },
  }
}

export default async function AlbumPage({ params }: { params: Params }) {
  const { citySlug, slug, albumSlug } = await params

  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const album = await prisma.album.findUnique({
    where: { slug: albumSlug },
    include: {
      player: { select: { id: true, name: true, slug: true, disambiguation: true } },
      albumPoems: {
        where: { poem: { published: true } },
        orderBy: { sortOrder: 'asc' },
        include: {
          poem: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  })

  if (!album || !album.publishedAt) {
    notFound()
  }
  if (album.player.slug !== slug) {
    notFound()
  }

  const year = new Date(album.publishedAt).getFullYear()

  return (
    <VStack gap={8} align="stretch" maxW="2xl" mx="auto">
      {/* Навигация */}
      <Link href={`/${citySlug}/players/${slug}`} style={{ textDecoration: 'none' }}>
        <HStack gap={2} color="fg.muted" _hover={{ color: 'fg' }} transition="color 0.1s" fontSize="sm">
          <LuArrowLeft />
          <Text>{playerDisplayName(album.player)}</Text>
        </HStack>
      </Link>

      {/* Hero альбома */}
      <HStack gap={6} align="start">
        <Box
          w={{ base: 24, md: 32 }}
          h={{ base: 24, md: 32 }}
          borderRadius="xl"
          overflow="hidden"
          bg="brand.950"
          borderWidth="1px"
          borderColor="whiteAlpha.100"
          flexShrink={0}
        >
          {album.coverImage
            ? (
              <Image
                src={album.coverImage.startsWith('http') ? album.coverImage : `/api/files/${album.coverImage}`}
                alt={album.title}
                width={128}
                height={128}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              />
            )
            : (
              <Box display="flex" alignItems="center" justifyContent="center" h="full" color="brand.400">
                <LuBookOpen size={40} />
              </Box>
            )}
        </Box>

        <VStack align="start" gap={1} flex={1}>
          <Text fontSize="sm" color="fg.subtle">
            {year}
          </Text>
          <Heading as="h1" size="xl">
            {album.title}
          </Heading>
          <Link href={`/${citySlug}/players/${slug}`} style={{ textDecoration: 'none' }}>
            <Text color="brand.300" fontSize="sm" _hover={{ color: 'brand.200' }}>
              {playerDisplayName(album.player)}
            </Text>
          </Link>
          <Text fontSize="sm" color="fg.muted">
            {album.albumPoems.length} {album.albumPoems.length === 1
              ? 'стихотворение'
              : album.albumPoems.length < 5
              ? 'стихотворения'
              : 'стихотворений'}
          </Text>
        </VStack>
      </HStack>

      <Separator />

      {/* Список стихов */}
      <VStack gap={1} align="stretch">
        {album.albumPoems.map((ap, i) => (
          <AlbumPoemItem
            key={ap.id}
            index={i + 1}
            title={ap.poem.title}
            href={`/${citySlug}/players/${slug}/poems/${ap.poem.slug}`}
          />
        ))}
        {album.albumPoems.length === 0 && (
          <Text color="fg.muted" textAlign="center" py={8}>
            В альбоме пока нет стихотворений
          </Text>
        )}
      </VStack>
    </VStack>
  )
}
