import { Link } from '@/i18n/navigation'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { CustomOrderCard } from './_components/custom-order-card'
import { CustomOrdersSuccessAlert } from './_components/custom-orders-success-alert'

export const metadata = {
  title: 'Специальные заказы — Премиум РосСтиль',
  description: 'Ваши специальные заказы: пошив по меркам, оптовые заказы, заказы отсутствующих размеров',
}

interface PageProps {
  searchParams: Promise<{ success?: string; cancelled?: string }>
}

export default async function CustomOrdersPage({ searchParams }: PageProps) {
  const authUser = await requireAuth()

  const { success, cancelled } = await searchParams
  const alertType = cancelled ? 'cancelled' : success

  // Fetch custom orders for the current user
  const db = getEnhancedPrisma(authUser)
  const orders = await db.customOrder.findMany({
    where: {
      userId: authUser.id,
    },
    include: {
      product: {
        select: {
          name: true,
        },
      },
      variant: {
        select: {
          color: true,
        },
      },
      productItem: {
        include: {
          size: {
            select: {
              ru: true,
              international: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Fetch reference images for all orders in one query
  const allImageIds = orders.flatMap((o: (typeof orders)[number]) => o.referenceImageIds ?? [])
  const images =
    allImageIds.length > 0
      ? await db.image.findMany({
          where: { id: { in: allImageIds } },
          select: { id: true, path: true },
        })
      : []
  const imageMap = new Map(images.map((img: (typeof images)[number]) => [img.id, getImageUrl(img.path)]))

  return (
    <Container maxW="7xl" py={8}>
      <Heading size="3xl" mb={8} textTransform="none">
        Специальные заказы
      </Heading>

      {/* Success/info message after order creation or cancellation */}
      {alertType && <CustomOrdersSuccessAlert type={alertType} />}

      {orders.length === 0 ? (
        <Box textAlign="center" py={12}>
          <Text fontSize="xl" color="fg.muted" mb={4}>
            У вас пока нет специальных заказов
          </Text>
          <Text color="fg.muted">
            Специальные заказы можно оформить на{' '}
            <Link href="/catalog" style={{ textDecoration: 'underline' }}>
              странице товара
            </Link>
            , нажав кнопку &quot;Заказать&quot;
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={4}>
          {orders.map((order: (typeof orders)[number]) => (
            <CustomOrderCard
              key={order.id}
              order={{
                id: order.id,
                orderNumber: order.orderNumber,
                type: order.type,
                status: order.status,
                createdAt: order.createdAt,
                productName: order.product?.name || 'Индивидуальный дизайн',
                variantColor: order.variant?.color,
                sizeName: order.productItem?.size?.ru || order.productItem?.size?.international,
                quantity: order.quantity,
                customBust: order.customBust,
                customWaist: order.customWaist,
                customHips: order.customHips,
                customHeight: order.customHeight,
                companyName: order.companyName,
                designDescription: order.designDescription,
                referenceImageUrls: (order.referenceImageIds ?? [])
                  .map((id: string) => imageMap.get(id))
                  .filter((url: string | undefined): url is string => !!url),
              }}
            />
          ))}
        </VStack>
      )}
    </Container>
  )
}
