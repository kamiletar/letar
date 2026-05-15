/**
 * Список опубликованных стихов поэта.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuPenLine } from 'react-icons/lu'

interface PlayerPoemsListProps {
  poems: Array<{ id: string; title: string; slug: string }>
  citySlug: string
  playerSlug: string
}

export function PlayerPoemsList({ poems, citySlug, playerSlug }: PlayerPoemsListProps) {
  if (poems.length === 0) {
    return null
  }

  return (
    <Box>
      <SectionHeading mb={3}>Стихи</SectionHeading>
      <VStack gap={2} align="stretch">
        {poems.map((poem) => (
          <Link key={poem.id} href={`/${citySlug}/players/${playerSlug}/poems/${poem.slug}`}>
            <Flex
              bg="bg.panel"
              borderRadius="xl"
              px={4}
              py={3}
              borderWidth="1px"
              borderColor="border"
              align="center"
              _hover={{ shadow: 'sm', borderColor: 'border.emphasized', transform: 'translateY(-1px)' }}
              transition="all 0.2s"
            >
              <HStack gap={2}>
                <LuPenLine size={16} />
                <Text fontSize="sm" fontWeight="medium">
                  {poem.title}
                </Text>
              </HStack>
            </Flex>
          </Link>
        ))}
      </VStack>
    </Box>
  )
}
