import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import {
  Badge,
  Box,
  Card,
  Container,
  Grid,
  GridItem,
  Heading,
  HStack,
  Link,
  Separator,
  Text,
  VStack,
} from '@chakra-ui/react'
import Image from 'next/image'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { updateCustomOrder } from '../_actions/update-custom-order'
import { CustomOrderEditForm } from '../_components/custom-order-edit-form'
import { CustomOrderStatusBadge, CustomOrderTypeBadge } from '../_components/custom-order-status-badge'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminCustomOrderDetailPage({ params }: PageProps) {
  const user = await requireAdmin()
  const { id } = await params
  const db = getEnhancedPrisma(user)

  const order = await db.customOrder.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: {
            select: { phoneNumber: true },
          },
        },
      },
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
    type ImageResult = (typeof images)[number]
    const imageMap = new Map(images.map((img: ImageResult) => [img.id, img.path]))
    referenceImageUrls = order.referenceImageIds
      .map((id: string) => imageMap.get(id))
      .filter((path: string | undefined): path is string => !!path)
      .map((path: string) => getImageUrl(path))
  }

  const updateAction = updateCustomOrder.bind(null, id)

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/custom-orders">← Вернуться к списку заказов</NextLink>
          </Link>
          <HStack justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Заказ #{order.orderNumber}
            </Heading>
            <HStack gap={2}>
              <CustomOrderTypeBadge type={order.type} />
              <CustomOrderStatusBadge status={order.status} />
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

        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
          {/* Main info */}
          <GridItem>
            <VStack gap={6} align="stretch">
              {/* Customer info */}
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
                      <Link href={`tel:${order.customerPhone}`} color="fg.info">
                        {order.customerPhone}
                      </Link>
                    </HStack>
                    {order.customerEmail && (
                      <HStack justifyContent="space-between">
                        <Text color="fg.muted">Email:</Text>
                        <Link href={`mailto:${order.customerEmail}`} color="fg.info">
                          {order.customerEmail}
                        </Link>
                      </HStack>
                    )}
                    <Separator />
                    <HStack justifyContent="space-between">
                      <Text color="fg.muted">Пользователь:</Text>
                      <VStack align="end" gap={0}>
                        <Text fontSize="sm">{order.user.name || 'Без имени'}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {order.user.email}
                        </Text>
                      </VStack>
                    </HStack>
                  </VStack>
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
                          <NextLink href={`/admin/products/${order.product.id}/edit`}>{order.product.name}</NextLink>
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

              {/* Type-specific info */}
              {order.type === 'MADE_TO_ORDER' && (
                <Card.Root>
                  <Card.Header>
                    <Card.Title>Индивидуальные мерки</Card.Title>
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
                  </Card.Body>
                </Card.Root>
              )}

              {order.type === 'CUSTOM_DESIGN' && (
                <Card.Root>
                  <Card.Header>
                    <Card.Title>Индивидуальный дизайн</Card.Title>
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
                            {referenceImageUrls.map((url, index) => (
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
                                  <Image
                                    src={url}
                                    alt={`Фото-ориентир ${index + 1}`}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    sizes="120px"
                                  />
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
                              Мерки
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
                    <Card.Title>Комментарий клиента</Card.Title>
                  </Card.Header>
                  <Card.Body>
                    <Text whiteSpace="pre-wrap">{order.notes}</Text>
                  </Card.Body>
                </Card.Root>
              )}
            </VStack>
          </GridItem>

          {/* Sidebar - Edit form */}
          <GridItem>
            <Card.Root position="sticky" top={4}>
              <Card.Header>
                <Card.Title>Управление заказом</Card.Title>
              </Card.Header>
              <Card.Body>
                <CustomOrderEditForm
                  action={updateAction}
                  defaultValue={{
                    status: order.status,
                    adminNotes: order.adminNotes || undefined,
                  }}
                />
              </Card.Body>
            </Card.Root>
          </GridItem>
        </Grid>
      </VStack>
    </Container>
  )
}
