import { Card, Heading, Link, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'

import { getCategoryMetadata } from '@/lib/seo'

import { navData } from '../../_components/sidebar'

export const metadata: Metadata = getCategoryMetadata(
  'Регламенты',
  'Документы, устанавливающие порядок проведения процедур: Дуэльный, Вечевой и Муниципальный регламенты.',
  '/regulations'
)

export default function RegulationsPage() {
  const regulations = navData.find((section) => section.title === 'Регламенты')?.items || []

  return (
    <VStack align="stretch" gap={6}>
      <Heading size="xl">Регламенты</Heading>
      <Text color="fg.muted">Документы, устанавливающие порядок проведения отдельных процедур и церемоний.</Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {regulations.map((regulation) => (
          <Link asChild key={regulation.href} _hover={{ textDecoration: 'none' }}>
            <NextLink href={regulation.href}>
              <Card.Root
                p={4}
                _hover={{ shadow: 'md', borderColor: 'brand.500' }}
                transition="all 0.2s"
                borderWidth="1px"
                borderColor="border"
              >
                <Heading size="sm" mb={1}>
                  {regulation.title}
                </Heading>
                {regulation.description && (
                  <Text fontSize="sm" color="fg.muted">
                    {regulation.description}
                  </Text>
                )}
              </Card.Root>
            </NextLink>
          </Link>
        ))}
      </SimpleGrid>
    </VStack>
  )
}
