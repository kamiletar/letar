import { Card, Heading, Link, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'

import { getCategoryMetadata } from '@/lib/seo'

import { navData } from '../../_components/sidebar'

export const metadata: Metadata = getCategoryMetadata(
  'Кодексы',
  'Систематизированные своды норм права: Налоговый, Уголовный, Семейный, Трудовой и другие кодексы Российской Федерации.',
  '/codes'
)

export default function CodesPage() {
  const codes = navData.find((section) => section.title === 'Кодексы')?.items || []

  return (
    <VStack align="stretch" gap={6}>
      <Heading size="xl">Кодексы</Heading>
      <Text color="fg.muted">
        Систематизированные своды норм права, регулирующие определённые области общественных отношений.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {codes.map((code) => (
          <Link asChild key={code.href} _hover={{ textDecoration: 'none' }}>
            <NextLink href={code.href}>
              <Card.Root
                p={4}
                _hover={{ shadow: 'md', borderColor: 'brand.500' }}
                transition="all 0.2s"
                borderWidth="1px"
                borderColor="border"
              >
                <Heading size="sm" mb={1}>
                  {code.title}
                </Heading>
                {code.description && (
                  <Text fontSize="sm" color="fg.muted">
                    {code.description}
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
