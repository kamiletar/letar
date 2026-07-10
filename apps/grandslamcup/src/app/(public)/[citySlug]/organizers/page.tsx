/**
 * Страница оргкомитета города.
 * Данные статические — обновляются в _data/organizers-data.ts.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { getCityBySlug } from '@/lib/city'
import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuExternalLink, LuUsersRound } from 'react-icons/lu'
import { ORGANIZERS_BY_CITY } from './_data/organizers-data'

type Params = Promise<{ citySlug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return { title: 'Город не найден' }
  }
  return {
    title: `Оргкомитет — ${city.name}`,
    description: `Организаторы Кубка Большого Слэма в ${city.name}`,
    alternates: { canonical: `/${citySlug}/organizers` },
  }
}

export default async function OrganizersPage({ params }: { params: Params }) {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const organizers = ORGANIZERS_BY_CITY[citySlug] ?? []

  return (
    <VStack gap={8} align="stretch">
      <Flex justify="space-between" align="center">
        <SectionHeading>Оргкомитет</SectionHeading>
        {organizers.length > 0 && (
          <Text fontSize="sm" color="fg.muted">
            {organizers.length} человек
          </Text>
        )}
      </Flex>

      {organizers.length > 0 ? (
        <>
          {/* Сетка карточек организаторов */}
          <Box display="grid" gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={5}>
            {organizers.map((org) => (
              <Box
                key={org.slug}
                borderRadius="2xl"
                borderWidth="1px"
                borderColor="border"
                bg="bg.panel"
                overflow="hidden"
                transition="box-shadow 0.15s"
                _hover={{ boxShadow: 'md' }}
              >
                {/* Фото */}
                <Box position="relative" aspectRatio={1} bg="bg.subtle">
                  <Image
                    src={`/organizers/${org.slug}.jpg`}
                    alt={org.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </Box>

                {/* Текст */}
                <Box p={4}>
                  <Flex justify="space-between" align="start" gap={2} mb={1}>
                    <Text fontWeight="bold" fontSize="lg" lineClamp={1}>
                      {org.name}
                    </Text>
                    {org.socialUrl && (
                      <Box asChild flexShrink={0} color="fg.muted" _hover={{ color: 'brand.solid' }} mt={0.5}>
                        <Link
                          href={org.socialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Профиль ${org.name}`}
                        >
                          <LuExternalLink size={16} />
                        </Link>
                      </Box>
                    )}
                  </Flex>
                  <Text fontSize="sm" color="fg.muted" lineClamp={3}>
                    {org.bio}
                  </Text>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Дисклеймер */}
          <Box bg="bg.subtle" borderRadius="xl" px={5} py={4} borderWidth="1px" borderColor="border.muted">
            <Text fontSize="sm" color="fg.muted" textAlign="center">
              💾 Оргкомитет отвечает за все организационные вопросы по проведению КБС в Москве, но не влияет на итоговые
              результаты матчей и оценки команд.
            </Text>
          </Box>
        </>
      ) : (
        <VStack py={16} textAlign="center" gap={4}>
          <Box color="fg.subtle">
            <LuUsersRound size={48} />
          </Box>
          <Heading size="md" color="fg.muted">
            Информация об оргкомитете появится позже
          </Heading>
        </VStack>
      )}
    </VStack>
  )
}
