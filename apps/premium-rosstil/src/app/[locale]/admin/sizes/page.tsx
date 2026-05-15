import { Gender } from '@/generated/prisma'
import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Flex, Heading, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { CreateFromPresetModal } from './_components/create-from-preset-modal'
import { SizeFilters } from './_components/size-filters'
import { SortableSizesTable } from './_components/sortable-sizes-table'

/**
 * Type for size with usage count
 */
type SizeWithCount = {
  id: string
  gender: Gender
  international: string
  ru: string
  de: string
  it: string
  fr: string
  uk: string
  us: string
  jeansFrom: string
  jeansTo: string
  bustMin: number
  bustMax: number
  waistMin: number
  waistMax: number
  hipsMin: number
  hipsMax: number
  sortOrder: number
  _count: {
    items: number
  }
}

/**
 * Groups sizes by gender for better table organization
 * Returns sizes grouped by FEMALE first, then MALE
 */
function groupSizesByGender(sizes: SizeWithCount[]): Map<Gender, SizeWithCount[]> {
  const groups = new Map<Gender, SizeWithCount[]>()

  // Group sizes by gender
  for (const size of sizes) {
    const existing = groups.get(size.gender) || []
    existing.push(size)
    groups.set(size.gender, existing)
  }

  // Return in specific order: FEMALE first, then MALE
  const orderedGroups = new Map<Gender, SizeWithCount[]>()
  if (groups.has(Gender.FEMALE)) {
    orderedGroups.set(Gender.FEMALE, groups.get(Gender.FEMALE)!)
  }
  if (groups.has(Gender.MALE)) {
    orderedGroups.set(Gender.MALE, groups.get(Gender.MALE)!)
  }

  return orderedGroups
}

/**
 * Filters sizes based on search params
 */
function filterSizes(
  sizes: SizeWithCount[],
  genderFilter: string | undefined,
  searchQuery: string | undefined
): SizeWithCount[] {
  let filtered = sizes

  // Filter by gender
  if (genderFilter && genderFilter !== 'ALL') {
    filtered = filtered.filter((size) => size.gender === genderFilter)
  }

  // Filter by search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase().trim()
    filtered = filtered.filter((size) => {
      return (
        size.ru.toLowerCase().includes(query) ||
        size.international.toLowerCase().includes(query) ||
        size.de.toLowerCase().includes(query) ||
        size.it.toLowerCase().includes(query) ||
        size.fr.toLowerCase().includes(query) ||
        size.uk.toLowerCase().includes(query) ||
        size.us.toLowerCase().includes(query) ||
        size.jeansFrom.toLowerCase().includes(query) ||
        size.jeansTo.toLowerCase().includes(query)
      )
    })
  }

  return filtered
}

interface PageProps {
  searchParams: Promise<{
    gender?: string
    search?: string
  }>
}

export default async function AdminSizesPage({ searchParams }: PageProps) {
  const user = await requireAdmin()

  // Get enhanced Prisma client with access control policies
  const db = getEnhancedPrisma(user)

  // Get all sizes ordered by sortOrder and gender, with usage count
  const allSizes = await db.productSize.findMany({
    orderBy: [{ sortOrder: 'asc' }, { gender: 'asc' }, { ru: 'asc' }],
    include: {
      _count: {
        select: {
          items: true, // Count how many ProductItems use this size
        },
      },
    },
  })

  // Get search params
  const params = await searchParams
  const genderFilter = params.gender
  const searchQuery = params.search

  // Apply filters
  // Cast для совместимости типов с _count между ZenStack и Prisma
  const sizes = filterSizes(allSizes as unknown as SizeWithCount[], genderFilter, searchQuery)

  // Group sizes by gender for better organization
  const groupedSizes = groupSizesByGender(sizes)

  return (
    <Container maxW="8xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin">← Вернуться к панели администратора</NextLink>
          </Link>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Размеры
            </Heading>
            <Flex gap={2}>
              <CreateFromPresetModal />
              <Button asChild colorPalette="fg">
                <NextLink href="/admin/sizes/new">Создать</NextLink>
              </Button>
            </Flex>
          </Box>
        </Box>

        {/* Filters and search */}
        <SizeFilters totalCount={allSizes.length} filteredCount={sizes.length} />

        {sizes.length > 0 ? (
          <SortableSizesTable groupedSizes={groupedSizes} />
        ) : (
          <Box textAlign="center" py={8}>
            <Text color="fg.muted" mb={4}>
              {allSizes.length === 0 ? 'Нет размеров для отображения' : 'Нет размеров, соответствующих фильтрам'}
            </Text>
            {allSizes.length === 0 && (
              <Button asChild colorPalette="fg">
                <NextLink href="/admin/sizes/new">Создать первый размер</NextLink>
              </Button>
            )}
          </Box>
        )}
      </VStack>
    </Container>
  )
}
