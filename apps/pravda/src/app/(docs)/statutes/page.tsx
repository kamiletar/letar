import { Card, Heading, Link, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'

import { getCategoryMetadata } from '@/lib/seo'

import { navData } from '../../_components/sidebar'

export const metadata: Metadata = getCategoryMetadata(
  'Уставы',
  'Нормативные документы, определяющие порядок организации: Церковный, Торговый, Военный, Образовательный и другие уставы.',
  '/statutes'
)

export default function ChartersPage() {
  const charters = navData.find((section) => section.title === 'Уставы')?.items || []

  return (
    <VStack align="stretch" gap={6}>
      <Heading size="xl">Уставы</Heading>
      <Text color="fg.muted">
        Нормативные документы, определяющие порядок организации и деятельности отдельных учреждений, ведомств и
        отраслей.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {charters.map((charter) => (
          <Link asChild key={charter.href} _hover={{ textDecoration: 'none' }}>
            <NextLink href={charter.href}>
              <Card.Root
                p={4}
                _hover={{ shadow: 'md', borderColor: 'brand.500' }}
                transition="all 0.2s"
                borderWidth="1px"
                borderColor="border"
              >
                <Heading size="sm" mb={1}>
                  {charter.title}
                </Heading>
                {charter.description && (
                  <Text fontSize="sm" color="fg.muted">
                    {charter.description}
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
