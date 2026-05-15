import type { Gender } from '@/generated/prisma'
import { Link } from '@/i18n/navigation'
import { requireAuth } from '@/lib/auth'
import { Box, Container, Heading, Text } from '@chakra-ui/react'
import { Suspense } from 'react'
import { getCart } from './_actions/get-cart'
import { CartList } from './_components/cart-list'
import { CartRecommendations } from './_components/cart-recommendations'
import { CartSummary } from './_components/cart-summary'

export const metadata = {
  title: 'Корзина — Премиум РосСтиль',
  description: 'Ваша корзина покупок',
}

/** Определяет преобладающий пол из массива значений */
function getDominantGender(genders: Gender[]): Gender {
  const counts = genders.reduce(
    (acc, g) => {
      acc[g] = (acc[g] || 0) + 1
      return acc
    },
    {} as Record<Gender, number>
  )
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Gender) || 'FEMALE'
}

export default async function CartPage() {
  // Проверка авторизации
  await requireAuth()

  // Получение корзины
  const cart = await getCart()

  return (
    <Container maxW="7xl" py={8}>
      <Heading textAlign={'center'} size="3xl" mb={8} textTransform="none">
        Корзина
      </Heading>

      {!cart || cart.items.length === 0 ? (
        <Box textAlign="center" py={12}>
          <Text fontSize="xl" color="fg.muted" mb={4}>
            Ваша корзина пуста
          </Text>
          <Text color="fg.muted">
            Перейдите в{' '}
            <Link href="/catalog" style={{ textDecoration: 'underline' }}>
              каталог
            </Link>
            , чтобы добавить товары
          </Text>
        </Box>
      ) : (
        <>
          <Box display="grid" gridTemplateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
            {/* Список товаров */}
            <CartList items={cart.items} />

            {/* Итого */}
            <CartSummary items={cart.items} />
          </Box>

          {/* Рекомендации */}
          <Suspense>
            <CartRecommendations
              productIdsInCart={[
                ...new Set(
                  cart.items.map(
                    (item: { productItem: { variant: { product: { id: string } } } }) =>
                      item.productItem.variant.product.id
                  )
                ),
              ]}
              categoriesInCart={[
                ...new Set(
                  cart.items.map(
                    (item: { productItem: { variant: { product: { categoryId: string | null } } } }) =>
                      item.productItem.variant.product.categoryId
                  )
                ),
              ]}
              genderInCart={getDominantGender(
                cart.items.map(
                  (item: { productItem: { variant: { product: { gender: Gender } } } }) =>
                    item.productItem.variant.product.gender
                )
              )}
            />
          </Suspense>
        </>
      )}
    </Container>
  )
}
