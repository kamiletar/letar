import { Box, Heading, Link, Stack } from '@chakra-ui/react'
import { ProductForm } from '../_components/product-form'
import { createProduct } from './_actions/create-product.action'

export const metadata = {
  title: 'Создать товар - Админ',
}

export default function NewProductPage() {
  return (
    <Box>
      <Stack direction="row" justify="space-between" align="center" mb={6}>
        <Heading size="lg">Создать товар</Heading>
        <Link href="/admin/products" color="fg" _hover={{ color: 'white' }}>
          ← К списку товаров
        </Link>
      </Stack>

      <Box maxW="600px">
        <ProductForm onSubmit={createProduct} />
      </Box>
    </Box>
  )
}
