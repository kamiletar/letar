import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { Suspense } from 'react'
import { CatalogHeader } from '../_components/catalog-header'
import { PreferredAreasReminder } from '../_components/preferred-areas-reminder'
import { SchoolsFilters } from './_components/schools-filters'
import { getAvailableCities, SchoolsList } from './_components/schools-list'

// Типы для search params
interface SearchParams {
  category?: LicenseCategory
  city?: string
  minRating?: string
  page?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export const metadata = {
  title: 'Каталог автошкол | НаПрава.РФ',
  description: 'Найдите автошколу рядом с вами',
}

export default async function SchoolsCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams

  // Города из кэшированного запроса (тот же запрос что использует SchoolsList)
  const availableCities = await getAvailableCities()

  return (
    <>
      <CatalogHeader />

      <Container maxW="container.xl" py={8}>
        <Stack gap={8}>
          {/* Заголовок */}
          <Box textAlign="center">
            <Heading size="2xl" mb={2}>
              Автошколы
            </Heading>
            <Text fontSize="lg" color="fg.muted">
              Найдите автошколу для получения водительских прав
            </Text>
          </Box>

          {/* Напоминание о заполнении районов */}
          <Suspense fallback={null}>
            <PreferredAreasReminder />
          </Suspense>

          {/* Фильтры */}
          <Suspense fallback={<Box h="60px" />}>
            <SchoolsFilters searchParams={params} availableCities={availableCities} />
          </Suspense>

          {/* Список школ */}
          <Suspense
            fallback={
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Box key={i} h="250px" bg="bg.subtle" borderRadius="lg" />
                ))}
              </SimpleGrid>
            }
          >
            <SchoolsList searchParams={params} />
          </Suspense>
        </Stack>
      </Container>
    </>
  )
}
