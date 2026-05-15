/**
 * Детальная страница новости — markdown рендеринг
 */

import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format-date'
import { Badge, Box, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { MarkdownContent } from './_components/markdown-content'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.newsPost.findUnique({
    where: { slug, published: true },
    select: { title: true, excerpt: true },
  })
  if (!post) {
    return { title: 'Новость не найдена' }
  }
  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: { canonical: `/news/${slug}` },
  }
}

export default async function NewsDetailPage({ params }: { params: Params }) {
  const { slug } = await params

  const post = await prisma.newsPost.findUnique({
    where: { slug, published: true },
    include: {
      author: { select: { name: true } },
      match: {
        select: {
          id: true,
          homeTeam: { select: { team: { select: { name: true } } } },
          awayTeam: { select: { team: { select: { name: true } } } },
          homeScore: true,
          awayScore: true,
        },
      },
    },
  })

  if (!post) {
    notFound()
  }

  return (
    <VStack gap={6} align="stretch" maxW="800px" mx="auto">
      {/* Шапка */}
      <VStack gap={2} align="start">
        {post.match && (
          <Link href={`/matches/${post.match.id}`}>
            <Badge colorPalette="blue" size="sm" cursor="pointer">
              Обзор: {post.match.homeTeam.team.name} {post.match.homeScore} : {post.match.awayScore}{' '}
              {post.match.awayTeam.team.name}
            </Badge>
          </Link>
        )}
        <Heading as="h1" size="2xl">
          {post.title}
        </Heading>
        <Text fontSize="sm" color="fg.muted">
          {post.publishedAt ? formatDate(post.publishedAt) : ''}
          {post.author.name && ` • ${post.author.name}`}
        </Text>
      </VStack>

      {/* Контент */}
      <Box>
        <MarkdownContent content={post.content} />
      </Box>

      {/* Назад */}
      <Link href="/news">
        <Text color="brand.fg" fontSize="sm">
          ← Все новости
        </Text>
      </Link>
    </VStack>
  )
}
