/**
 * Список стихов текущего поэта — опубликованные и черновики.
 */

import { EmptyState } from '@/app/_components/empty-state'
import { SectionHeading } from '@/app/_components/section-heading'
import { prisma } from '@/lib/db'
import { requirePoet } from '@/lib/roles'
import { Button, Flex, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuPlus } from 'react-icons/lu'
import { PoemListItem } from './_components/poem-list-item'

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
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <SectionHeading>Мои стихи</SectionHeading>
        <Button colorPalette="teal" size="sm" asChild>
          <Link href="/poet/poems/create">
            <LuPlus size={16} />
            <Text display={{ base: 'none', sm: 'inline' }}>Написать стихотворение</Text>
            <Text display={{ base: 'inline', sm: 'none' }}>Написать</Text>
          </Link>
        </Button>
      </Flex>

      {poems.length === 0
        ? (
          <EmptyState>
            <Text color="fg.muted" mb={4}>
              У вас пока нет стихотворений
            </Text>
            <Button colorPalette="teal" asChild>
              <Link href="/poet/poems/create">Написать первое стихотворение</Link>
            </Button>
          </EmptyState>
        )
        : (
          <VStack gap={3} align="stretch">
            {poems.map((poem) => <PoemListItem key={poem.id} poem={poem} />)}
          </VStack>
        )}
    </VStack>
  )
}
