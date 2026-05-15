import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Flex, Grid, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { ProductSizeForm } from '../../_components/product-size-form'
import { updateProductSize } from './_actions/update-product-size'
import { DeleteSizeButton } from './_components/delete-size-button'
import { SizeUsageWidget } from './_components/size-usage-widget'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductSizePage({ params }: PageProps) {
  const user = await requireAdmin()

  // Get size ID from params
  const { id } = await params

  // Get enhanced Prisma client with access control policies
  const db = getEnhancedPrisma(user)

  // Fetch the size to edit
  const size = await db.productSize.findUnique({
    where: { id },
  })

  if (!size) {
    notFound()
  }

  // Bind the ID to the update action
  const updateAction = updateProductSize.bind(null, id)

  return (
    <Container maxW="8xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/sizes">← Вернуться к списку размеров</NextLink>
          </Link>
          <Flex justify="space-between" align="center" gap={4}>
            <Heading size="2xl" textTransform="none">
              Редактировать размер
            </Heading>
            <Flex gap={2}>
              <Button asChild colorPalette="fg" variant="outline">
                <NextLink href={`/admin/sizes/new?from=${id}`}>Копировать</NextLink>
              </Button>
              <DeleteSizeButton id={id} sizeName={`${size.ru} (${size.gender === 'FEMALE' ? 'Ж' : 'М'})`} />
            </Flex>
          </Flex>
        </Box>

        <Grid templateColumns={{ base: '1fr', lg: '1fr 400px' }} gap={8} alignItems="start">
          {/* Left column: Form */}
          <ProductSizeForm
            action={updateAction}
            defaultValue={{
              gender: size.gender,
              international: size.international,
              ru: size.ru,
              de: size.de,
              it: size.it,
              fr: size.fr,
              uk: size.uk,
              us: size.us,
              jeansFrom: size.jeansFrom,
              jeansTo: size.jeansTo,
              bustMin: size.bustMin,
              bustMax: size.bustMax,
              waistMin: size.waistMin,
              waistMax: size.waistMax,
              hipsMin: size.hipsMin,
              hipsMax: size.hipsMax,
              sortOrder: size.sortOrder,
            }}
            submitLabel="Сохранить"
          />

          {/* Right column: Usage widget */}
          <Box position="sticky" top="24px">
            <SizeUsageWidget sizeId={id} sizeName={`${size.ru} (${size.gender === 'FEMALE' ? 'Ж' : 'М'})`} />
          </Box>
        </Grid>
      </VStack>
    </Container>
  )
}
