import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type { LicenseCategory, TransmissionType } from '@letar/driving-school-db/prisma'
import { Suspense } from 'react'
import { CatalogHeader } from '../_components/catalog-header'
import { PreferredAreasReminder } from '../_components/preferred-areas-reminder'
import { InstructorsFilters } from './_components/instructors-filters'
import { InstructorsList } from './_components/instructors-list'

// Типы для search params
interface SearchParams {
  category?: LicenseCategory
  transmission?: TransmissionType
  city?: string
  minRating?: string
  teachesOnStudentCar?: string
  page?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export const metadata = {
  title: 'Каталог инструкторов | НаПрава.РФ',
  description: 'Найдите инструктора по вождению рядом с вами',
}

export default async function InstructorsCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <>
      <CatalogHeader />

      <Container maxW="container.xl" py={8}>
        <Stack gap={8}>
          {/* Заголовок */}
          <Box textAlign="center">
            <Heading size="2xl" mb={2}>
              Инструкторы по вождению
            </Heading>
            <Text fontSize="lg" color="fg.muted">
              Найдите инструктора, который поможет вам научиться водить
            </Text>
          </Box>

          {/* Напоминание о заполнении районов */}
          <Suspense fallback={null}>
            <PreferredAreasReminder />
          </Suspense>

          {/* Фильтры */}
          <Suspense fallback={<Box h="60px" />}>
            <InstructorsFilters searchParams={params} />
          </Suspense>

          {/* Список инструкторов */}
          <Suspense
            fallback={
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Box key={i} h="300px" bg="bg.subtle" borderRadius="lg" />
                ))}
              </SimpleGrid>
            }
          >
            <InstructorsList searchParams={params} />
          </Suspense>
        </Stack>
      </Container>
    </>
  )
}
