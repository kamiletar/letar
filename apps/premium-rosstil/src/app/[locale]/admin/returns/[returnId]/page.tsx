import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { ReturnStatusBadge } from '../_components/return-status-badge'
import { ReturnActions } from './_components/return-actions'

/** Тип возврата с полными relations */
type ReturnDetail = {
  id: string
  status: string
  reason: string
  description: string | null
  images: string[]
  reviewedBy: string | null
  reviewNote: string | null
  reviewedAt: Date | null
  refundAmount: unknown
  refundedAt: Date | null
  createdAt: Date
  updatedAt: Date
  subOrder: {
    id: string
    totalAmount: unknown
    seller: { shopName: string; contactEmail: string }
    order: {
      orderNumber: string
      customerName: string
      customerPhone: string
      customerEmail: string | null
    }
    items: Array<{
      quantity: number
      price: unknown
      productItem: {
        product: { name: string }
        variant: { color: string } | null
        size: { name: string } | null
      }
    }>
  }
}

interface PageProps {
  params: Promise<{ returnId: string }>
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminReturnDetailPage({ params }: PageProps) {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)
  const { returnId } = await params

  const returnRecord = (await (db.return as any).findUnique({
    where: { id: returnId },
    include: {
      subOrder: {
        include: {
          seller: { select: { shopName: true, contactEmail: true } },
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              customerPhone: true,
              customerEmail: true,
            },
          },
          items: {
            include: {
              productItem: {
                include: {
                  product: { select: { name: true } },
                  variant: { select: { color: true } },
                  size: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  })) as ReturnDetail | null

  if (!returnRecord) {
    notFound()
  }

  const subOrderTotal = Number(returnRecord.subOrder.totalAmount)

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/returns">&larr; Все возвраты</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none" mt={2}>
            Возврат #{returnRecord.id.slice(-6)}
          </Heading>
          <ReturnStatusBadge status={returnRecord.status} />
        </Box>

        {/* Информация о заказе */}
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Text fontWeight="bold" mb={3}>
            Информация о заказе
          </Text>
          <VStack align="stretch" gap={2}>
            <Text fontSize="sm">
              <Text as="span" color="fg.muted">
                Номер заказа:
              </Text>{' '}
              <Link asChild fontWeight="medium">
                <NextLink href={`/admin/orders/${returnRecord.subOrder.order.orderNumber}`}>
                  {returnRecord.subOrder.order.orderNumber}
                </NextLink>
              </Link>
            </Text>
            <Text fontSize="sm">
              <Text as="span" color="fg.muted">
                Покупатель:
              </Text>{' '}
              {returnRecord.subOrder.order.customerName}
            </Text>
            <Text fontSize="sm">
              <Text as="span" color="fg.muted">
                Телефон:
              </Text>{' '}
              {returnRecord.subOrder.order.customerPhone}
            </Text>
            {returnRecord.subOrder.order.customerEmail && (
              <Text fontSize="sm">
                <Text as="span" color="fg.muted">
                  Email:
                </Text>{' '}
                {returnRecord.subOrder.order.customerEmail}
              </Text>
            )}
            <Text fontSize="sm">
              <Text as="span" color="fg.muted">
                Продавец:
              </Text>{' '}
              {returnRecord.subOrder.seller.shopName}
            </Text>
          </VStack>
        </Box>

        {/* Товары */}
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Text fontWeight="bold" mb={3}>
            Товары для возврата
          </Text>
          <VStack align="stretch" gap={2}>
            {returnRecord.subOrder.items.map((item, i) => (
              <Box key={i} p={3} bg="bg.subtle" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium">
                  {item.productItem.product.name}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {item.productItem.variant?.color ? `Цвет: ${item.productItem.variant.color}` : ''}
                  {item.productItem.size?.name ? ` | Размер: ${item.productItem.size.name}` : ''}
                  {` | Кол-во: ${item.quantity}`}
                  {` | ${formatPrice(Number(item.price) * item.quantity)}`}
                </Text>
              </Box>
            ))}
            <Text fontSize="sm" fontWeight="bold" mt={1}>
              Итого подзаказ: {formatPrice(subOrderTotal)}
            </Text>
          </VStack>
        </Box>

        {/* Причина и описание */}
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Text fontWeight="bold" mb={3}>
            Причина возврата
          </Text>
          <Text fontSize="sm" mb={2}>
            {returnRecord.reason}
          </Text>
          {returnRecord.description && (
            <>
              <Text fontWeight="medium" fontSize="sm" mt={3} mb={1}>
                Описание:
              </Text>
              <Text fontSize="sm" color="fg.muted" whiteSpace="pre-wrap">
                {returnRecord.description}
              </Text>
            </>
          )}
        </Box>

        {/* Рассмотрение (если есть) */}
        {returnRecord.reviewedAt && (
          <Box borderWidth="1px" borderRadius="lg" p={5}>
            <Text fontWeight="bold" mb={3}>
              Рассмотрение
            </Text>
            <VStack align="stretch" gap={2}>
              <Text fontSize="sm">
                <Text as="span" color="fg.muted">
                  Дата рассмотрения:
                </Text>{' '}
                {formatDate(returnRecord.reviewedAt)}
              </Text>
              {returnRecord.reviewNote && (
                <Text fontSize="sm">
                  <Text as="span" color="fg.muted">
                    Комментарий:
                  </Text>{' '}
                  {returnRecord.reviewNote}
                </Text>
              )}
              {returnRecord.refundAmount !== null && returnRecord.refundAmount !== undefined && (
                <Text fontSize="sm">
                  <Text as="span" color="fg.muted">
                    Сумма возврата:
                  </Text>{' '}
                  {formatPrice(Number(returnRecord.refundAmount))}
                </Text>
              )}
              {returnRecord.refundedAt && (
                <Text fontSize="sm">
                  <Text as="span" color="fg.muted">
                    Дата возврата средств:
                  </Text>{' '}
                  {formatDate(returnRecord.refundedAt)}
                </Text>
              )}
            </VStack>
          </Box>
        )}

        {/* Даты */}
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Text fontWeight="bold" mb={3}>
            Хронология
          </Text>
          <VStack align="stretch" gap={1}>
            <Text fontSize="sm">
              <Text as="span" color="fg.muted">
                Создан:
              </Text>{' '}
              {formatDate(returnRecord.createdAt)}
            </Text>
            <Text fontSize="sm">
              <Text as="span" color="fg.muted">
                Обновлён:
              </Text>{' '}
              {formatDate(returnRecord.updatedAt)}
            </Text>
          </VStack>
        </Box>

        {/* Кнопки действий */}
        <ReturnActions returnId={returnRecord.id} status={returnRecord.status} subOrderTotal={subOrderTotal} />
      </VStack>
    </Container>
  )
}
