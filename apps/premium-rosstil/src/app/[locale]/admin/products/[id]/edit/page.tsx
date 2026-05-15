import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Heading, HStack, Link, Separator, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { LuExternalLink } from 'react-icons/lu'
import { ProductForm } from '../../_components/product-form'
import { updateProduct } from './_actions/update-product'
import { DeleteProductButton } from './_components/delete-product-button'
import { VariantsManagement } from './_components/variants-management'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
  const user = await requireAdmin()
  const { id } = await params
  const db = getEnhancedPrisma(user)

  // Get product by ID with variants, items, and images
  const product = await db.product.findUnique({
    where: { id },
    include: {
      variants: {
        include: {
          items: {
            include: {
              size: true,
            },
            orderBy: {
              sizeId: 'asc',
            },
          },
          images: {
            include: {
              image: true, // Включаем связь с Image для получения path
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      },
    },
  })

  // If product not found, show 404
  if (!product) {
    notFound()
  }

  // Сериализуем Decimal в number для передачи в клиентские компоненты
  type ProductVariant = (typeof product.variants)[number]
  const serializedVariants = product.variants.map((variant: ProductVariant) => ({
    ...variant,
    items: variant.items.map((item: ProductVariant['items'][number]) => ({
      ...item,
      price: Number(item.price),
    })),
  }))

  // Get all sizes for product's gender
  const allSizes = await db.productSize.findMany({
    where: { gender: product.gender },
    orderBy: { sortOrder: 'asc' },
  })

  // Получаем все категории для выбора
  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  })

  // Bind ID to update action
  const updateAction = updateProduct.bind(null, id)

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/products">← Вернуться к списку продуктов</NextLink>
          </Link>
          <HStack justify="space-between" align="start" mb={4}>
            <Heading size="2xl" textTransform="none">
              Редактировать продукт
            </Heading>
            <HStack gap={2}>
              <Button asChild variant="outline" colorPalette="fg">
                <NextLink href={`/catalog/${id}`} target="_blank">
                  <LuExternalLink />
                  Просмотр в каталоге
                </NextLink>
              </Button>
              <DeleteProductButton id={id} productName={product.name} />
            </HStack>
          </HStack>
        </Box>

        {/* Основная информация о продукте */}
        <Box>
          <Heading size="lg" textTransform="none" mb={4}>
            Основная информация
          </Heading>
          <ProductForm
            action={updateAction}
            defaultValue={{
              name: product.name,
              description: product.description ?? undefined,
              gender: product.gender,
              categoryId: product.categoryId ?? undefined,
            }}
            submitLabel="Сохранить изменения"
            categories={categories}
          />
        </Box>

        <Separator />

        {/* Управление вариантами продукта */}
        <Box>
          <VariantsManagement
            productId={id}
            productGender={product.gender}
            variants={serializedVariants}
            allSizes={allSizes}
          />
        </Box>
      </VStack>
    </Container>
  )
}
