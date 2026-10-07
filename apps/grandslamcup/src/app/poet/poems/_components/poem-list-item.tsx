/**
 * Карточка стихотворения в списке «Мои стихи».
 * На телефоне — колонкой: текст на всю ширину, кнопки отдельной строкой снизу.
 */

import { formatDate } from '@/lib/format-date'
import { Badge, Box, Button, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuPenLine } from 'react-icons/lu'

import { DeletePoemButton } from './delete-poem-button'

export interface PoemListItemData {
  id: string
  title: string
  text: string
  published: boolean
  createdAt: Date
}

export function PoemListItem({ poem }: { poem: PoemListItemData }) {
  return (
    <Box
      key={poem.id}
      bg="bg.panel"
      borderRadius="xl"
      p={4}
      borderWidth="1px"
      borderColor="border"
      _hover={{ shadow: 'sm', borderColor: 'border.emphasized' }}
      transitionProperty="box-shadow, border-color"
      transitionDuration="0.15s"
    >
      {/* На телефоне карточка в колонку: текст на всю ширину, кнопки отдельной строкой */}
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', md: 'start' }}
        gap={{ base: 3, md: 4 }}
      >
        <VStack gap={1} align="start" flex={1} minW={0}>
          <Flex wrap="wrap" align="center" gap={2} w="full">
            <Text
              fontWeight="semibold"
              fontSize={{ base: 'lg', md: 'md' }}
              lineClamp={2}
              minW={0}
              wordBreak="break-word"
            >
              {poem.title}
            </Text>
            <Badge colorPalette={poem.published ? 'green' : 'gray'} variant="subtle" size="sm" flexShrink={0}>
              {poem.published ? 'Опубликовано' : 'Черновик'}
            </Badge>
          </Flex>
          <Text fontSize="sm" color="fg.muted" lineClamp={2} whiteSpace="pre-wrap" wordBreak="break-word">
            {poem.text.slice(0, 100)}
            {poem.text.length > 100 ? '...' : ''}
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            {formatDate(poem.createdAt)}
          </Text>
        </VStack>
        <HStack
          gap={2}
          flexShrink={0}
          justify={{ base: 'space-between', md: 'flex-end' }}
          borderTopWidth={{ base: '1px', md: '0' }}
          borderColor="border.muted"
          pt={{ base: 2, md: 0 }}
        >
          <Button variant="ghost" size={{ base: 'md', md: 'sm' }} asChild>
            <Link href={`/poet/poems/${poem.id}/edit`}>
              <LuPenLine size={16} />
              Редактировать
            </Link>
          </Button>
          <DeletePoemButton poemId={poem.id} poemTitle={poem.title} />
        </HStack>
      </Flex>
    </Box>
  )
}
