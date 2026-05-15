/**
 * Список стихов текущего поэта — опубликованные и черновики.
 */

import { EmptyState } from '@/app/_components/empty-state'
import { SectionHeading } from '@/app/_components/section-heading'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format-date'
import { requirePoet } from '@/lib/roles'
import { Badge, Box, Button, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuPenLine, LuPlus } from 'react-icons/lu'
import { DeletePoemButton } from './_components/delete-poem-button'

export default async function PoetPoemsPage() {
  const poet = await requirePoet()

  const poems = await prisma.poem.findMany({
    where: { playerId: poet.playerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      text: true,
      published: true,
      createdAt: true,
    },
  })

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center">
        <SectionHeading>Мои стихи</SectionHeading>
        <Button colorPalette="teal" size="sm" asChild>
          <Link href="/poet/poems/create">
            <LuPlus size={16} />
            Написать стихотворение
          </Link>
        </Button>
      </Flex>

      {poems.length === 0 ? (
        <EmptyState>
          <Text color="fg.muted" mb={4}>
            У вас пока нет стихотворений
          </Text>
          <Button colorPalette="teal" asChild>
            <Link href="/poet/poems/create">Написать первое стихотворение</Link>
          </Button>
        </EmptyState>
      ) : (
        <VStack gap={3} align="stretch">
          {poems.map((poem) => (
            <Box
              key={poem.id}
              bg="bg.panel"
              borderRadius="xl"
              p={4}
              borderWidth="1px"
              borderColor="border"
              _hover={{ shadow: 'sm', borderColor: 'border.emphasized' }}
              transition="all 0.15s"
            >
              <Flex justify="space-between" align="start" gap={4}>
                <VStack gap={1} align="start" flex={1} minW={0}>
                  <HStack gap={2}>
                    <Text fontWeight="semibold" lineClamp={1}>
                      {poem.title}
                    </Text>
                    <Badge colorPalette={poem.published ? 'green' : 'gray'} variant="subtle" size="sm" flexShrink={0}>
                      {poem.published ? 'Опубликовано' : 'Черновик'}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="fg.muted" lineClamp={2} whiteSpace="pre-wrap">
                    {poem.text.slice(0, 100)}
                    {poem.text.length > 100 ? '...' : ''}
                  </Text>
                  <Text fontSize="xs" color="fg.subtle">
                    {formatDate(poem.createdAt)}
                  </Text>
                </VStack>
                <HStack gap={2} flexShrink={0}>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/poet/poems/${poem.id}/edit`}>
                      <LuPenLine size={16} />
                      Редактировать
                    </Link>
                  </Button>
                  <DeletePoemButton poemId={poem.id} poemTitle={poem.title} />
                </HStack>
              </Flex>
            </Box>
          ))}
        </VStack>
      )}
    </VStack>
  )
}
