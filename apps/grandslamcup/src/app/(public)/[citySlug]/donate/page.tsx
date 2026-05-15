/**
 * Страница донатов города — ссылки на внешние сервисы
 */

import { EmptyState } from '@/app/_components/empty-state'
import { getCities, getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { Box, Button, Card, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LuExternalLink, LuHeart } from 'react-icons/lu'

type Params = Promise<{ citySlug: string }>

export async function generateStaticParams() {
  const cities = await getCities()
  return cities.map((city) => ({ citySlug: city.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return { title: 'Поддержать' }
  }
  return {
    title: `Поддержать — ${city.name}`,
    description: `Поддержите Кубок Большого Слэма в городе ${city.name} — ваш вклад идёт в призовой фонд турнира`,
    alternates: { canonical: `/${citySlug}/donate` },
  }
}

export default async function CityDonatePage({ params }: { params: Params }) {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const links = await prisma.donateLink.findMany({
    where: { active: true, cityId: city.id },
    orderBy: { order: 'asc' },
  })

  return (
    <VStack gap={8} align="stretch" maxW="700px" mx="auto">
      <VStack gap={3} textAlign="center">
        <Box color="brand.fg">
          <LuHeart size={48} />
        </Box>
        <Heading as="h1" size="2xl">
          Поддержать КБС — {city.name}
        </Heading>
        <Text color="fg.muted" maxW="500px">
          Кубок Большого Слэма — некоммерческий проект. Ваш вклад идёт в призовой фонд турнира и помогает проводить
          матчи на лучших площадках города.
        </Text>
      </VStack>

      {links.length === 0 ? (
        <EmptyState>
          <Text color="fg.muted">Ссылки для пожертвований в {city.name} скоро появятся</Text>
        </EmptyState>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          {links.map((link) => (
            <Card.Root key={link.id}>
              <Card.Body>
                <VStack gap={3} align="start">
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
