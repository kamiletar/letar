import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Heading, Link, Stack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { ProductForm } from '../../_components/product-form'
import { deleteProduct } from './_actions/delete-product.action'
import { updateProduct } from './_actions/update-product.action'

export const metadata = {
  title: 'Редактировать товар - Админ',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const db = getEnhancedPrisma(session.user)
  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: {
        include: { image: true },
        orderBy: { order: 'asc' },
      },
      ogImageRel: true,
    },
  })

  if (!product) {
    return notFound()
  }

  const deleteAction = deleteProduct.bind(null, id)

  return (
    <Box>
      <Stack direction="row" justify="space-between" align="center" mb={6}>
        <Heading size="lg">Редактировать: {product.name}</Heading>
        <Stack direction="row" gap={4}>
          <Link href={`/admin/products/${product.id}`} color="fg" _hover={{ color: 'fg.brand' }}>
            Просмотр
          </Link>
          <Link href="/admin/products" color="fg.muted" _hover={{ color: 'fg.brand' }}>
            ← К списку
          </Link>
        </Stack>
      </Stack>

      <Box maxW="600px">
        <ProductForm product={product} onSubmit={updateProduct.bind(null, id)} />

        <Box mt={8} pt={6} borderTopWidth="1px" borderColor="border.subtle">
          <form action={deleteAction}>
            <Button type="submit" colorPalette="red" variant="outline">
              Удалить товар
            </Button>
          </form>
        </Box>
      </Box>
    </Box>
  )
}
