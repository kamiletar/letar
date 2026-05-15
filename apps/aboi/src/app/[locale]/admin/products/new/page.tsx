import { Heading, Stack } from '@chakra-ui/react'
import { ProductForm } from '../_components/product-form'

export default function NewProductPage() {
  return (
    <Stack gap={6} maxW="3xl">
      <Heading as="h1" size="2xl">
        Новый товар
      </Heading>
      <ProductForm mode="create" />
    </Stack>
  )
}
