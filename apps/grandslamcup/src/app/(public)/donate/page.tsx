/**
 * Страница донатов — ссылки на внешние сервисы
 */

import { EmptyState } from '@/app/_components/empty-state'
import { prisma } from '@/lib/db'
import { Badge, Box, Button, Card, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { LuExternalLink, LuHeart } from 'react-icons/lu'

export const metadata: Metadata = {
  title: 'Поддержать',
  description: 'Поддержите Кубок Большого Слэма — ваш вклад идёт в призовой фонд турнира',
  alternates: { canonical: '/donate' },
}

export default async function DonatePage() {
  const links = await prisma.donateLink.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    include: { city: { select: { name: true, slug: true } } },
  })

  return (
    <VStack gap={8} align="stretch" maxW="700px" mx="auto">
      <VStack gap={3} textAlign="center">
        <Box color="brand.fg">
          <LuHeart size={48} />
        </Box>
        <Heading as="h1" size="2xl">
          Поддержать КБС
        </Heading>
        <Text color="fg.muted" maxW="500px">
          Кубок Большого Слэма — некоммерческий проект. Ваш вклад идёт в призовой фонд турнира и помогает проводить
          матчи на лучших площадках города.
        </Text>
      </VStack>

      {links.length === 0 ? (
        <EmptyState>
          <Text color="fg.muted">Ссылки для пожертвований скоро появятся</Text>
        </EmptyState>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          {links.map((link) => (
            <Card.Root key={link.id}>
              <Card.Body>
                <VStack gap={3} align="start">
                  {link.city && (
                    <Badge colorPalette="purple" size="sm">
                      {link.city.name}
                    </Badge>
                  )}
                  <Heading size="md">{link.name}</Heading>
                  {link.description && (
                    <Text fontSize="sm" color="fg.muted">
                      {link.description}
                    </Text>
                  )}
                  <Box asChild>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <Button colorPalette="brand" size="sm" w="full">
                        <LuExternalLink size={16} />
                        Перейти
                      </Button>
                    </a>
                  </Box>
                </VStack>
              </Card.Body>
            </Card.Root>
          ))}
        </Grid>
      )}
    </VStack>
  )
}
