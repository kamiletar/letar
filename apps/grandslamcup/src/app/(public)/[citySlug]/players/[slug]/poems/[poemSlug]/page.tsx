/**
 * Публичная страница стихотворения — заголовок, текст, автор.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format-date'
import { Box, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Params = Promise<{ citySlug: string; slug: string; poemSlug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { poemSlug, slug } = await params

  const poem = await prisma.poem.findUnique({
    where: { slug: poemSlug },
    select: {
      title: true,
      text: true,
      published: true,
      player: { select: { name: true, slug: true } },
    },
  })

  if (!poem || !poem.published || poem.player.slug !== slug) {
    return { title: 'Стихотворение не найдено' }
  }

  return {
    title: `${poem.title} — ${poem.player.name}`,
    description: poem.text.slice(0, 160),
    openGraph: {
      title: poem.title,
      description: `${poem.player.name} — ${poem.text.slice(0, 120)}`,
      siteName: 'Grand Slam Cup',
    },
  }
}

export default async function PoemPage({ params }: { params: Params }) {
  const { citySlug, slug, poemSlug } = await params

  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const poem = await prisma.poem.findUnique({
    where: { slug: poemSlug },
    include: {
      player: {
        select: { id: true, name: true, slug: true, cityId: true },
      },
    },
  })

  // Проверяем: стих опубликован, автор совпадает с slug, автор из нужного города
  if (!poem || !poem.published || poem.player.slug !== slug || poem.player.cityId !== city.id) {
    notFound()
  }

  const playerHref = `/${citySlug}/players/${poem.player.slug}`

  return (
    <VStack gap={6} align="stretch" maxW="720px" mx="auto">
      {/* Обложка */}
      {poem.coverImage && (
        <Box borderRadius="xl" overflow="hidden" maxH="400px">
          <Image
            src={poem.coverImage.startsWith('http') ? poem.coverImage : `/api/files/${poem.coverImage}`}
            alt={poem.title}
            width={720}
            height={400}
            style={{ objectFit: 'cover', width: '100%', maxHeight: '400px' }}
          />
        </Box>
      )}

      {/* Заголовок */}
      <SectionHeading>{poem.title}</SectionHeading>

      {/* Автор */}
      <Link href={playerHref}>
        <Text fontSize="sm" color="brand.solid" _hover={{ textDecoration: 'underline' }}>
          {poem.player.name}
        </Text>
      </Link>

      {/* Текст стиха */}
      <Box
        bg="bg.panel"
        borderRadius="xl"
        p={{ base: 4, md: 8 }}
        borderWidth="1px"
        borderColor="border"
        fontSize="md"
        lineHeight="tall"
        whiteSpace="pre-wrap"
      >
        {poem.text}
      </Box>

      {/* Дата */}
      <Text fontSize="xs" color="fg.muted">
        {formatDate(poem.createdAt)}
      </Text>
    </VStack>
  )
}
