import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { ProductSizeForm } from '../_components/product-size-form'
import type { ProductSizeFormData } from '../_schemas/product-size-form.schema'
import { createProductSize } from './_actions/create-product-size'

interface PageProps {
  searchParams: Promise<{ from?: string }>
}

export default async function NewProductSizePage({ searchParams }: PageProps) {
  const user = await requireAdmin()

  // Get search params
  const params = await searchParams
  const fromId = params.from

  // If copying from existing size, load it
  let defaultValue: ProductSizeFormData | undefined
  let title = 'Создать новый размер'

  if (fromId) {
    const db = getEnhancedPrisma(user)
    const sourceSize = await db.productSize.findUnique({
      where: { id: fromId },
    })

    if (sourceSize) {
      // Copy all fields but modify RU to make it unique
      defaultValue = {
        gender: sourceSize.gender,
        international: sourceSize.international,
        ru: `${sourceSize.ru} (копия)`,
        de: sourceSize.de,
        it: sourceSize.it,
        fr: sourceSize.fr,
        uk: sourceSize.uk,
        us: sourceSize.us,
        jeansFrom: sourceSize.jeansFrom,
        jeansTo: sourceSize.jeansTo,
        bustMin: sourceSize.bustMin,
        bustMax: sourceSize.bustMax,
        waistMin: sourceSize.waistMin,
        waistMax: sourceSize.waistMax,
        hipsMin: sourceSize.hipsMin,
        hipsMax: sourceSize.hipsMax,
        sortOrder: sourceSize.sortOrder,
      }
      title = `Копировать размер "${sourceSize.ru}"`
    }
  }

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/sizes">← Вернуться к списку размеров</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none">
            {title}
          </Heading>
        </Box>

        <ProductSizeForm action={createProductSize} defaultValue={defaultValue} submitLabel="Создать" />
      </VStack>
    </Container>
  )
}
