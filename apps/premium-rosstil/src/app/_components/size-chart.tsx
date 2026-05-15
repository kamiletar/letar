import { Gender } from '@/generated/prisma'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Heading, Table, Text } from '@chakra-ui/react'

interface SizeChartProps {
  /**
   * Filter sizes by gender.
   * If not provided, shows all sizes.
   */
  gender?: Gender

  /**
   * Optional title for the chart.
   * Defaults to "Таблица размеров"
   */
  title?: string

  /**
   * Show measurements columns.
   * Defaults to true.
   */
  showMeasurements?: boolean
}

/**
 * Format gender for display
 */
function formatGender(gender: Gender): string {
  switch (gender) {
    case Gender.MALE:
      return 'Мужской'
    case Gender.FEMALE:
      return 'Женский'
    default:
      return gender
  }
}

/**
 * Public size chart component for displaying size tables on the website.
 *
 * Usage:
 * ```tsx
 * // Show all sizes
 * <SizeChart />
 *
 * // Show only female sizes
 * <SizeChart gender={Gender.FEMALE} />
 *
 * // Custom title
 * <SizeChart title="Женские размеры" gender={Gender.FEMALE} />
 * ```
 */
export async function SizeChart({ gender, title = 'Таблица размеров', showMeasurements = true }: SizeChartProps) {
  // Get public Prisma client (no user context needed for public data)
  const db = getEnhancedPrisma()

  // Fetch sizes, optionally filtered by gender
  const sizes = await db.productSize.findMany({
    where: gender ? { gender } : undefined,
    orderBy: [{ gender: 'asc' }, { sortOrder: 'asc' }, { ru: 'asc' }],
  })

  if (sizes.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="fg.muted">
          {gender ? `Нет размеров для категории "${formatGender(gender)}"` : 'Размерная сетка пока не заполнена'}
        </Text>
      </Box>
    )
  }

  // Group sizes by gender if showing all
  const shouldGroupByGender = !gender && sizes.some((s: { gender: Gender }) => s.gender !== sizes[0].gender)

  if (shouldGroupByGender) {
    // Group by gender
    const femaleSizes = sizes.filter((s: { gender: Gender }) => s.gender === Gender.FEMALE)
    const maleSizes = sizes.filter((s: { gender: Gender }) => s.gender === Gender.MALE)

    return (
      <Box>
        <Heading size="xl" mb={6} textTransform="none">
          {title}
        </Heading>

        {femaleSizes.length > 0 && (
          <Box mb={8}>
            <Heading size="lg" mb={4} textTransform="none">
              Женские размеры
            </Heading>
            <SizeTable sizes={femaleSizes} showMeasurements={showMeasurements} />
          </Box>
        )}

        {maleSizes.length > 0 && (
          <Box>
            <Heading size="lg" mb={4} textTransform="none">
              Мужские размеры
            </Heading>
            <SizeTable sizes={maleSizes} showMeasurements={showMeasurements} />
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Box>
      <Heading size="xl" mb={6} textTransform="none">
        {title}
      </Heading>
      <SizeTable sizes={sizes} showMeasurements={showMeasurements} />
    </Box>
  )
}

/**
 * Internal table component for rendering size data
 */
function SizeTable({
  sizes,
  showMeasurements,
}: {
  sizes: Array<{
    ru: string
    international: string
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
  }>
  showMeasurements: boolean
}) {
  return (
    <Box overflowX="auto">
      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>RU</Table.ColumnHeader>
            <Table.ColumnHeader>Международный</Table.ColumnHeader>
            <Table.ColumnHeader>DE</Table.ColumnHeader>
            <Table.ColumnHeader>IT</Table.ColumnHeader>
            <Table.ColumnHeader>FR</Table.ColumnHeader>
            <Table.ColumnHeader>UK</Table.ColumnHeader>
            <Table.ColumnHeader>US</Table.ColumnHeader>
            <Table.ColumnHeader>Джинсы</Table.ColumnHeader>
            {showMeasurements && (
              <>
                <Table.ColumnHeader>Грудь (см)</Table.ColumnHeader>
                <Table.ColumnHeader>Талия (см)</Table.ColumnHeader>
                <Table.ColumnHeader>Бедра (см)</Table.ColumnHeader>
              </>
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sizes.map((size) => (
            <Table.Row key={size.ru}>
              <Table.Cell>
                <Text fontWeight="medium">{size.ru}</Text>
              </Table.Cell>
              <Table.Cell>{size.international}</Table.Cell>
              <Table.Cell>{size.de}</Table.Cell>
              <Table.Cell>{size.it}</Table.Cell>
              <Table.Cell>{size.fr}</Table.Cell>
              <Table.Cell>{size.uk}</Table.Cell>
              <Table.Cell>{size.us}</Table.Cell>
              <Table.Cell>
                {size.jeansFrom} - {size.jeansTo}
              </Table.Cell>
              {showMeasurements && (
                <>
                  <Table.Cell>
                    {size.bustMin} - {size.bustMax}
                  </Table.Cell>
                  <Table.Cell>
                    {size.waistMin} - {size.waistMax}
                  </Table.Cell>
                  <Table.Cell>
                    {size.hipsMin} - {size.hipsMax}
                  </Table.Cell>
                </>
              )}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
