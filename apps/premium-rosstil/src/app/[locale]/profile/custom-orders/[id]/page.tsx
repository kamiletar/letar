import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { Badge, Box, Card, Container, Grid, Heading, HStack, Link, Separator, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { CancelOrderButton } from '../_components/cancel-order-button'
import { CustomOrderStatusBadge, CustomOrderTypeBadge } from '../_components/custom-order-status-badge'
import { OrderStatusProgress } from '../_components/order-status-progress'
import { ReorderButton } from '../_components/reorder-button'

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Детали заказа — Премиум РосСтиль',
  description: 'Подробная информация о вашем специальном заказе',
}

export default async function CustomOrderDetailPage({ params }: PageProps) {
  const authUser = await requireAuth()

  const { id } = await params
  const db = getEnhancedPrisma(authUser)

  // Fetch order - ZenStack policies will ensure user can only see their own orders
  const order = await db.customOrder.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      variant: {
        select: {
          id: true,
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
      wholesaleItems: {
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
  })

  if (!order) {
    notFound()
  }

  // Fetch reference images if there are any referenceImageIds
  let referenceImageUrls: string[] = []
  if (order.referenceImageIds && order.referenceImageIds.length > 0) {
    const images = await db.image.findMany({
      where: { id: { in: order.referenceImageIds } },
      select: { id: true, path: true },
    })
    // Preserve order from referenceImageIds
    const imageMap = new Map(images.map((img: (typeof images)[number]) => [img.id, img.path]))
    referenceImageUrls = order.referenceImageIds
      .map((id: string) => imageMap.get(id))
      .filter((path: string | undefined): path is string => !!path)
      .map((path: string) => getImageUrl(path))
  }

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/profile/custom-orders">← Назад к списку заказов</NextLink>
          </Link>
          <HStack justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
            <Heading size="2xl" textTransform="none">
              Заказ #{order.orderNumber}
            </Heading>
            <HStack gap={2}>
              <CustomOrderTypeBadge type={order.type} />
              <CustomOrderStatusBadge status={order.status} />
              {order.status === 'NEW' && <CancelOrderButton orderId={order.id} orderNumber={order.orderNumber} />}
            </HStack>
          </HStack>
          <Text color="fg.muted">
            Создан:{' '}
            {new Date(order.createdAt).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Box>

        {/* Status progress bar */}
        <Card.Root>
          <Card.Header pb={2}>
            <Card.Title fontSize="md">Статус заказа</Card.Title>
          </Card.Header>
          <Card.Body pt={0}>
            <OrderStatusProgress status={order.status} />
          </Card.Body>
        </Card.Root>

        {/* Product info */}
        {order.product && (
          <Card.Root>
            <Card.Header>
              <Card.Title>Информация о товаре</Card.Title>
            </Card.Header>
            <Card.Body>
              <VStack align="stretch" gap={3}>
                <HStack justifyContent="space-between">
                  <Text color="fg.muted">Товар:</Text>
                  <Link asChild color="fg.info">
                    <NextLink href={`/catalog/${order.product.id}`}>{order.product.name}</NextLink>
                  </Link>
                </HStack>
                {order.variant && (
                  <HStack justifyContent="space-between">
                    <Text color="fg.muted">Цвет:</Text>
                    <Text>{order.variant.color}</Text>
                  </HStack>
                )}
                {order.productItem?.size && (
                  <HStack justifyContent="space-between">
                    <Text color="fg.muted">Размер:</Text>
                    <Text>{order.productItem.size.ru || order.productItem.size.international}</Text>
                  </HStack>
                )}
                {order.quantity && (
                  <HStack justifyContent="space-between">
                    <Text color="fg.muted">Количество:</Text>
                    <Badge colorPalette="blue">{order.quantity} шт.</Badge>
                  </HStack>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Type-specific info: MADE_TO_ORDER */}
        {order.type === 'MADE_TO_ORDER' && (
          <Card.Root>
            <Card.Header>
              <Card.Title>Ваши мерки</Card.Title>
            </Card.Header>
            <Card.Body>
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                {order.customBust && (
                  <Box>
                    <Text color="fg.muted" fontSize="sm">
                      Обхват груди
                    </Text>
                    <Text fontWeight="medium" fontSize="lg">
                      {order.customBust} см
                    </Text>
                  </Box>
                )}
                {order.customWaist && (
                  <Box>
                    <Text color="fg.muted" fontSize="sm">
                      Обхват талии
                    </Text>
                    <Text fontWeight="medium" fontSize="lg">
                      {order.customWaist} см
                    </Text>
                  </Box>
                )}
                {order.customHips && (
                  <Box>
                    <Text color="fg.muted" fontSize="sm">
                      Обхват бёдер
                    </Text>
                    <Text fontWeight="medium" fontSize="lg">
                      {order.customHips} см
                    </Text>
                  </Box>
                )}
                {order.customHeight && (
                  <Box>
                    <Text color="fg.muted" fontSize="sm">
                      Рост
                    </Text>
                    <Text fontWeight="medium" fontSize="lg">
                      {order.customHeight} см
                    </Text>
                  </Box>
                )}
              </Grid>
              {order.customDetails && (
                <>
                  <Separator my={4} />
                  <Box>
                    <Text color="fg.muted" fontSize="sm" mb={1}>
                      Детали кастомизации
                    </Text>
                    <Text whiteSpace="pre-wrap">{order.customDetails}</Text>
                  </Box>
                </>
              )}
            </Card.Body>
          </Card.Root>
        )}

        {/* Type-specific info: CUSTOM_DESIGN */}
        {order.type === 'CUSTOM_DESIGN' && (
          <Card.Root>
            <Card.Header>
              <Card.Title>Ваш дизайн</Card.Title>
            </Card.Header>
            <Card.Body>
              <VStack align="stretch" gap={4}>
                {order.designDescription && (
                  <Box>
                    <Text color="fg.muted" fontSize="sm" mb={1}>
                      Описание дизайна
                    </Text>
                    <Text whiteSpace="pre-wrap">{order.designDescription}</Text>
                  </Box>
                )}
                {referenceImageUrls.length > 0 && (
                  <Box>
                    <Text color="fg.muted" fontSize="sm" mb={2}>
                      Фото-ориентиры ({referenceImageUrls.length})
                    </Text>
                    <HStack gap={3} flexWrap="wrap">
                      {referenceImageUrls.map((url) => (
                        <Link key={url} href={url} target="_blank" display="block">
                          <Box
                            position="relative"
                            boxSize="120px"
                            borderRadius="md"
                            overflow="hidden"
                            borderWidth={1}
                            borderColor="border.muted"
                            _hover={{ borderColor: 'fg.muted', transform: 'scale(1.02)' }}
                            transition="all 0.2s"
                          >
                            <Image src={url} alt="Фото-ориентир" fill style={{ objectFit: 'cover' }} sizes="120px" />
                          </Box>
                        </Link>
                      ))}
                    </HStack>
                  </Box>
                )}
                {(order.customBust || order.customWaist || order.customHips || order.customHeight) && (
                  <>
                    <Separator />
                    <Box>
                      <Text color="fg.muted" fontSize="sm" mb={2}>
                        Ваши мерки
                      </Text>
                      <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                        {order.customBust && (
                          <Box>
                            <Text color="fg.muted" fontSize="xs">
                              Грудь
                            </Text>
                            <Text fontWeight="medium">{order.customBust} см</Text>
                          </Box>
                        )}
                        {order.customWaist && (
                          <Box>
                            <Text color="fg.muted" fontSize="xs">
                              Талия
                            </Text>
                            <Text fontWeight="medium">{order.customWaist} см</Text>
                          </Box>
                        )}
                        {order.customHips && (
                          <Box>
                            <Text color="fg.muted" fontSize="xs">
                              Бёдра
                            </Text>
                            <Text fontWeight="medium">{order.customHips} см</Text>
                          </Box>
                        )}
                        {order.customHeight && (
                          <Box>
                            <Text color="fg.muted" fontSize="xs">
                              Рост
                            </Text>
                            <Text fontWeight="medium">{order.customHeight} см</Text>
                          </Box>
                        )}
                      </Grid>
                    </Box>
                  </>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Type-specific info: B2B_PARTNERSHIP */}
        {order.type === 'B2B_PARTNERSHIP' && (
          <Card.Root>
            <Card.Header>
              <Card.Title>Реквизиты компании</Card.Title>
            </Card.Header>
            <Card.Body>
              <VStack align="stretch" gap={3}>
                {order.companyName && (
                  <HStack justifyContent="space-between">
                    <Text color="fg.muted">Название:</Text>
                    <Text fontWeight="medium">{order.companyName}</Text>
                  </HStack>
                )}
                {order.companyINN && (
                  <HStack justifyContent="space-between">
                    <Text color="fg.muted">ИНН:</Text>
                    <Text fontFamily="mono">{order.companyINN}</Text>
                  </HStack>
                )}
                {order.companyAddress && (
                  <Box>
                    <Text color="fg.muted" mb={1}>
                      Адрес:
                    </Text>
                    <Text>{order.companyAddress}</Text>
                  </Box>
                )}
                {order.preferredColor && (
                  <HStack justifyContent="space-between">
                    <Text color="fg.muted">Предпочитаемый цвет:</Text>
                    <Text>{order.preferredColor}</Text>
                  </HStack>
                )}
                {order.wholesaleItems.length > 0 && (
                  <>
                    <Separator />
                    <Box>
                      <Text color="fg.muted" mb={2}>
                        Заказ по размерам:
                      </Text>
                      <HStack gap={2} flexWrap="wrap">
                        {order.wholesaleItems.map((item: (typeof order.wholesaleItems)[number]) => (
                          <Badge key={item.id} colorPalette="purple" size="lg">
                            {item.size.ru || item.size.international}: {item.quantity} шт.
                          </Badge>
                        ))}
                      </HStack>
                    </Box>
                    <HStack justifyContent="space-between" pt={2}>
                      <Text color="fg.muted">Общее количество:</Text>
                      <Badge colorPalette="blue" size="lg">
                        {order.quantity} шт.
                      </Badge>
                    </HStack>
                  </>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Customer notes */}
        {order.notes && (
          <Card.Root>
            <Card.Header>
              <Card.Title>Ваш комментарий</Card.Title>
            </Card.Header>
            <Card.Body>
              <Text whiteSpace="pre-wrap">{order.notes}</Text>
            </Card.Body>
          </Card.Root>
        )}

        {/* Contact info */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Контактные данные</Card.Title>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={3}>
              <HStack justifyContent="space-between">
                <Text color="fg.muted">Имя:</Text>
                <Text fontWeight="medium">{order.customerName}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="fg.muted">Телефон:</Text>
                <Text>{order.customerPhone}</Text>
              </HStack>
              {order.customerEmail && (
                <HStack justifyContent="space-between">
                  <Text color="fg.muted">Email:</Text>
                  <Text>{order.customerEmail}</Text>
                </HStack>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Reorder button for completed orders */}
        {order.status === 'COMPLETED' && <ReorderButton orderType={order.type} productId={order.product?.id ?? null} />}

        {/* Help section */}
        <Card.Root bg="bg.subtle">
          <Card.Body>
            <VStack gap={2}>
              <Text fontWeight="medium">Есть вопросы по заказу?</Text>
              <Text fontSize="sm" color="fg.muted" textAlign="center">
                Свяжитесь с нами по телефону или email, указанным на странице{' '}
                <Link asChild color="fg.info">
                  <NextLink href="/contacts">контактов</NextLink>
                </Link>
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
