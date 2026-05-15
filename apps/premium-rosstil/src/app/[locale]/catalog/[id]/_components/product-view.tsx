'use client'

import { addToWishlist } from '@/app/[locale]/profile/wishlist/_actions/add-to-wishlist'
import { removeFromWishlist } from '@/app/[locale]/profile/wishlist/_actions/remove-from-wishlist'
import { OnlyFor } from '@/app/_components/only-for'
import { toaster } from '@/app/_components/ui/toaster'
import { useRecentlyViewed } from '@/app/_hooks/use-recently-viewed'
import type { Gender } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import { generateProductSlug } from '@/lib/slugify'
import { Badge, Box, Button, Heading, HStack, Link, Stack, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import { FaHeart, FaPencilAlt, FaRegHeart } from 'react-icons/fa'
import { CartControl } from './cart-control'
import { CustomOrderButton } from './custom-order-button'
import { ImageGallery } from './image-gallery'
import { SizeChartDialog } from './size-chart-dialog'
import { SizeSelector } from './size-selector'
import { StockNotifyButton } from './stock-notify-button'
import { VariantSelector } from './variant-selector'

const ProductButtons = ({
  isPending,
  productId,
  handleWishlistToggle,
  selectedItemId,
  selectedVariantId,
  optimisticInWishlist,
  animationKey,
  isAuthenticated,
  availableCount,
  isPreOrder,
}: {
  isPending: boolean
  productId: string | null
  handleWishlistToggle: () => void
  selectedItemId: string | null
  selectedVariantId: string | null
  optimisticInWishlist: boolean
  animationKey: number
  isAuthenticated: boolean
  availableCount: number
  isPreOrder: boolean
}) => {
  return (
    <HStack
      gap={2}
      flexWrap={'wrap'}
      justifyContent={{
        base: 'center',
        md: 'flex-start',
      }}
      alignItems={'flex-start'}
    >
      <OnlyFor userRole="ADMIN">
        <Button
          asChild
          width={{
            mdDown: '100%',
          }}
          aria-label="Редактировать продукт"
          size="md"
          colorPalette="fg"
          variant="outline"
        >
          <NextLink href={`/admin/products/${productId}/edit`}>
            <FaPencilAlt /> Редактировать
          </NextLink>
        </Button>
      </OnlyFor>
      <CartControl
        productItemId={selectedItemId}
        disabled={!selectedItemId}
        isAuthenticated={isAuthenticated}
        availableCount={availableCount}
        isPreOrder={isPreOrder}
      />
      {selectedVariantId && (
        <Button
          data-testid="wishlist-button"
          aria-label={optimisticInWishlist ? 'Удалить из избранного' : 'Добавить в избранное'}
          size="md"
          colorPalette={'fg'}
          variant={optimisticInWishlist ? 'solid' : 'outline'}
          onClick={handleWishlistToggle}
          loading={isPending}
        >
          <Box
            key={animationKey}
            style={optimisticInWishlist ? { animation: 'heartPulse 0.4s ease' } : undefined}
            display="inline-flex"
          >
            {optimisticInWishlist ? <FaHeart /> : <FaRegHeart />}
          </Box>
          {optimisticInWishlist ? 'Избранное' : 'В избранное'}
        </Button>
      )}
    </HStack>
  )
}

interface CompanyProfile {
  companyName: string
  companyINN: string | null
  companyAddress: string | null
  contactPerson: string | null
  companyPhone: string | null
  companyEmail: string | null
}

interface AllSizeItem {
  id: string
  gender: Gender
  international: string
  sortOrder: number
}

interface UserContactInfo {
  name: string | null
  email: string
  phone: string | null
}

interface ProductViewProps {
  product: {
    id: string
    name: string
    gender: Gender
    description?: string | null
    variants: Array<{
      id: string
      color: string
      composition: string
      images: Array<{
        id: string
        url: string
        alt: string
        width: number
        height: number
        order: number
      }>
      items: Array<{
        id: string
        price: number
        availableCount: number
        isPreOrder: boolean
        availableFrom: Date | null
        size: {
          id: string
          gender: Gender
          international: string
          ru: string
          de: string
          it: string
          fr: string
          uk: string
          us: string
          jeansFrom: string
          jeansTo: string
          bustMin: number | null
          bustMax: number | null
          waistMin: number | null
          waistMax: number | null
          hipsMin: number | null
          hipsMax: number | null
        }
      }>
    }>
  }
  isAuthenticated: boolean
  wishlistVariantIds: string[]
  /** ID ProductItem'ов, на которые пользователь подписан на уведомления */
  stockNotificationItemIds?: string[]
  userMeasurements: {
    bust: number | null
    waist: number | null
    hips: number | null
    height: number | null
    gender: string
  } | null
  companyProfile: CompanyProfile | null
  /** Контактные данные пользователя для предзаполнения форм */
  userContactInfo: UserContactInfo | null
  /** Все размеры для данного пола */
  allSizes: AllSizeItem[]
}

// Helper function to find the best matching size based on user measurements
function findMatchingSize(
  items: ProductViewProps['product']['variants'][0]['items'],
  measurements: ProductViewProps['userMeasurements']
): string | null {
  if (!measurements || !measurements.bust || !measurements.waist || !measurements.hips) {
    return null
  }

  // Find items that match all measurements
  const matchingItems = items.filter((item) => {
    const { size } = item

    // Check if all measurements are within the size range
    const bustMatch =
      size.bustMin !== null &&
      size.bustMax !== null &&
      measurements.bust! >= size.bustMin &&
      measurements.bust! <= size.bustMax

    const waistMatch =
      size.waistMin !== null &&
      size.waistMax !== null &&
      measurements.waist! >= size.waistMin &&
      measurements.waist! <= size.waistMax

    const hipsMatch =
      size.hipsMin !== null &&
      size.hipsMax !== null &&
      measurements.hips! >= size.hipsMin &&
      measurements.hips! <= size.hipsMax

    return bustMatch && waistMatch && hipsMatch
  })

  // Return the first matching size, or null if none match
  return matchingItems.length > 0 ? matchingItems[0].id : null
}

export function ProductView({
  product,
  isAuthenticated,
  wishlistVariantIds,
  stockNotificationItemIds = [],
  userMeasurements,
  userContactInfo,
  companyProfile,
  allSizes,
}: ProductViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const { addView } = useRecentlyViewed()

  // Трекинг просмотра товара
  useEffect(() => {
    addView(product.id)
  }, [product.id])

  // Initialize state from URL params or defaults
  const [selectedVariantId, setSelectedVariantId] = useState(() => {
    const variantFromUrl = searchParams.get('variant')
    // Validate that the variant exists in the product
    if (variantFromUrl && product.variants.some((v) => v.id === variantFromUrl)) {
      return variantFromUrl
    }
    return product.variants[0]?.id || ''
  })

  const [selectedItemId, setSelectedItemId] = useState<string | null>(() => {
    const sizeFromUrl = searchParams.get('size')
    const currentVariant = product.variants.find((v) => v.id === selectedVariantId)

    if (!currentVariant || currentVariant.items.length === 0) {
      return null
    }

    // 1. If size is in URL and valid, use it
    if (sizeFromUrl && currentVariant.items.some((item) => item.id === sizeFromUrl)) {
      return sizeFromUrl
    }

    // 2. Try to find matching size based on user measurements
    const matchingSize = findMatchingSize(currentVariant.items, userMeasurements)
    if (matchingSize) {
      return matchingSize
    }

    // 3. Fall back to first available size
    return currentVariant.items[0]?.id || null
  })

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)
  const selectedItem = selectedVariant?.items.find((item) => item.id === selectedItemId)

  // Начальное состояние wishlist для текущего варианта
  const initialInWishlist = selectedVariant ? wishlistVariantIds.includes(selectedVariant.id) : false

  // Оптимистичное обновление wishlist — кнопка меняется мгновенно
  const [optimisticInWishlist, setOptimisticInWishlist] = useOptimistic(
    initialInWishlist,
    (_, newValue: boolean) => newValue
  )

  // Счётчик для перезапуска анимации сердечка
  const animationKeyRef = useRef(0)

  const handleWishlistToggle = () => {
    // Redirect to signin if not authenticated
    if (!isAuthenticated) {
      const currentUrl = window.location.pathname + window.location.search
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`)
      return
    }

    if (!selectedVariant) {
      return
    }

    const newValue = !optimisticInWishlist
    animationKeyRef.current += 1

    startTransition(async () => {
      // Мгновенно обновляем UI
      setOptimisticInWishlist(newValue)

      try {
        if (newValue) {
          await addToWishlist(selectedVariant.id)
          toaster.success({ title: 'Добавлено в избранное' })
        } else {
          await removeFromWishlist(selectedVariant.id)
          toaster.success({ title: 'Удалено из избранного' })
        }
      } catch {
        // При ошибке React автоматически откатит к initialInWishlist
        toaster.error({
          title: 'Ошибка',
          description: 'Не удалось обновить избранное',
        })
      }
    })
  }

  // Update URL when selection changes
  useEffect(() => {
    const currentVariant = searchParams.get('variant')
    const currentSize = searchParams.get('size')

    // Only update URL if values actually changed
    if (currentVariant === selectedVariantId && currentSize === selectedItemId) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())

    if (selectedVariantId) {
      params.set('variant', selectedVariantId)
    } else {
      params.delete('variant')
    }

    if (selectedItemId) {
      params.set('size', selectedItemId)
    } else {
      params.delete('size')
    }

    // Generate SEO-friendly slug
    const slug = generateProductSlug(product.name, selectedVariant?.color, selectedItem?.size.international)

    // Build new URL with slug in path
    const basePath = `/catalog/${product.id}`
    const newUrl = `${basePath}/${slug}?${params.toString()}`

    // Use window.history.replaceState to update URL without triggering page transition
    // This prevents loading skeleton from appearing when changing variant/size
    window.history.replaceState(null, '', newUrl)
  }, [
    selectedVariantId,
    selectedItemId,
    searchParams,
    product.id,
    product.name,
    selectedVariant?.color,
    selectedItem?.size.international,
  ])

  return (
    <Box>
      <Stack
        direction={{
          mdDown: 'column',
        }}
        justify="space-between"
      >
        {/* Breadcrumb navigation */}
        <Link asChild color="fg.muted" fontSize="sm" mb={4}>
          <NextLink href="/catalog">← Вернуться к каталогу</NextLink>
        </Link>
      </Stack>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8} mt={6}>
        {/* Left column - Image Gallery */}
        <Box data-testid="product-images" maxWidth={'calc(100vw - 32px)'}>
          {selectedVariant && selectedVariant.images.length > 0 ? (
            <ImageGallery images={selectedVariant.images} />
          ) : (
            <Box
              bg="gray.100"
              borderRadius="lg"
              height="500px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="fg.muted">Нет изображений</Text>
            </Box>
          )}
        </Box>
        {/* Right column - Product details */}
        <VStack align="stretch" gap={6}>
          {/* Product name with action buttons */}
          <Stack direction={{ base: 'column', md: 'row' }} justify="space-between" align="start">
            <Heading data-testid="product-title" size="2xl" textTransform="none" flex="1">
              {product.name}
            </Heading>
          </Stack>
          <Text>{product.description}</Text>
          {/* Variant selector (color) */}
          {product.variants.length > 0 && (
            <Box>
              <Text fontWeight="semibold" mb={3}>
                Цвет
              </Text>
              <VariantSelector
                variants={product.variants}
                selectedVariantId={selectedVariantId}
                onSelectVariant={(variantId) => {
                  setSelectedVariantId(variantId)

                  // Auto-select size for new variant
                  const newVariant = product.variants.find((v) => v.id === variantId)
                  if (newVariant && newVariant.items.length > 0) {
                    // Try to find matching size based on user measurements
                    const matchingSize = findMatchingSize(newVariant.items, userMeasurements)
                    if (matchingSize) {
                      setSelectedItemId(matchingSize)
                    } else {
                      // Fall back to first available size
                      setSelectedItemId(newVariant.items[0].id)
                    }
                  } else {
                    setSelectedItemId(null)
                  }
                }}
              />
            </Box>
          )}

          {/* Size selector */}
          {selectedVariant && selectedVariant.items.length > 0 && (
            <Box>
              <Text fontWeight="semibold" mb={3}>
                Размер
              </Text>
              <SizeSelector
                items={selectedVariant.items}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
              />
            </Box>
          )}
          {/* Price display */}
          {selectedItem ? (
            <Box data-testid="product-price">
              <Text fontSize="3xl" fontWeight="bold" color="fg">
                {Number(selectedItem.price).toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                })}
              </Text>
              {selectedItem.isPreOrder && (
                <HStack gap={2} mt={1}>
                  <Badge colorPalette="purple">Предзаказ</Badge>
                  {selectedItem.availableFrom && (
                    <Text fontSize="sm" color="fg.muted">
                      Поступление:{' '}
                      {new Date(selectedItem.availableFrom).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </Text>
                  )}
                </HStack>
              )}
            </Box>
          ) : (
            <Box>
              {selectedVariant && selectedVariant.items.length > 0 && (
                <>
                  <Text fontSize="2xl" fontWeight="semibold" color="fg.muted">
                    {Math.min(...selectedVariant.items.map((item) => Number(item.price))).toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                    })}{' '}
                    -{' '}
                    {Math.max(...selectedVariant.items.map((item) => Number(item.price))).toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                    })}
                  </Text>
                  <Text fontSize="sm" color="fg.muted" mt={1}>
                    Выберите размер
                  </Text>
                </>
              )}
            </Box>
          )}
          <ProductButtons
            {...{
              isAuthenticated,
              isPending,
              productId: product.id,
              handleWishlistToggle,
              selectedItemId,
              selectedVariantId,
              optimisticInWishlist,
              animationKey: animationKeyRef.current,
              availableCount: selectedItem?.availableCount ?? 0,
              isPreOrder: selectedItem?.isPreOrder ?? false,
            }}
          />

          {/* Composition */}
          {selectedVariant && (
            <Box data-testid="product-description">
              <Text fontWeight="semibold" mb={2}>
                Состав
              </Text>
              <Text color="fg.muted">{selectedVariant.composition}</Text>
            </Box>
          )}

          {/* Action buttons */}
          <HStack gap={4} mt={4}>
            <SizeChartDialog gender={product.gender} />
            <CustomOrderButton
              productId={product.id}
              variantId={selectedVariantId}
              productItemId={selectedItemId || undefined}
              availableSizes={selectedVariant?.items || []}
              allSizes={allSizes}
              isAuthenticated={isAuthenticated}
              userMeasurements={userMeasurements}
              userContactInfo={userContactInfo}
              companyProfile={companyProfile}
            />
          </HStack>
          {/* Уведомление о поступлении — когда вариант без размеров */}
          {selectedVariant && selectedVariant.items.length === 0 && (
            <VStack align="start" gap={2}>
              <Badge colorPalette="orange" alignSelf="start">
                Нет в наличии
              </Badge>
            </VStack>
          )}
          {/* Уведомление о поступлении — когда выбранный размер закончился */}
          {selectedItem && selectedItem.availableCount === 0 && isAuthenticated && (
            <StockNotifyButton
              productItemId={selectedItem.id}
              isSubscribed={stockNotificationItemIds.includes(selectedItem.id)}
            />
          )}
        </VStack>
      </Box>
    </Box>
  )
}
