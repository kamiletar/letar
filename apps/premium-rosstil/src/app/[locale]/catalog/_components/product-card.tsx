'use client'

import { addToWishlist } from '@/app/[locale]/profile/wishlist/_actions/add-to-wishlist'
import { removeFromWishlist } from '@/app/[locale]/profile/wishlist/_actions/remove-from-wishlist'
import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { Box, Card, Heading, HStack, Icon, IconButton, LinkBox, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import NextLink from 'next/link'
import { useOptimistic, useRef, useTransition } from 'react'
import { FaHeart, FaRegHeart, FaStar } from 'react-icons/fa'

interface ProductCardProps {
  product: {
    id: string
    name: string
    averageRating?: number | null
    reviewCount?: number
    seller?: {
      shopName: string
      slug: string
    } | null
    variants: Array<{
      id: string
      color: string
      colorRef?: { id: string; name: string; slug: string; hex: string } | null
      items: Array<{
        price: number
      }>
      images: Array<{
        url: string
        alt: string | null
      }>
    }>
  }
  isAuthenticated: boolean
  wishlistVariantIds: string[]
  /** Slug цвета для выбора варианта (из фильтра) */
  selectedColorSlug?: string
}

export function ProductCard({ product, isAuthenticated, wishlistVariantIds, selectedColorSlug }: ProductCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Выбираем вариант по цвету из фильтра, или первый доступный
  const selectedVariant = selectedColorSlug
    ? (product.variants.find((v) => v.colorRef?.slug === selectedColorSlug) ?? product.variants[0])
    : product.variants[0]
  const displayImage = selectedVariant?.images[0]

  // Начальное состояние wishlist
  const initialInWishlist = selectedVariant ? wishlistVariantIds.includes(selectedVariant.id) : false

  // Оптимистичное обновление wishlist — сердечко меняется мгновенно
  const [optimisticInWishlist, setOptimisticInWishlist] = useOptimistic(
    initialInWishlist,
    (_, newValue: boolean) => newValue
  )

  // Счётчик для перезапуска анимации сердечка при каждом клике
  const animationKey = useRef(0)

  // Calculate price range
  const allPrices = product.variants.flatMap((v) => v.items.map((item) => item.price))
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Если не авторизован, редирект на страницу входа
    if (!isAuthenticated) {
      router.push('/auth/signin?callbackUrl=/catalog')
      return
    }

    if (!selectedVariant) {
      return
    }

    const newValue = !optimisticInWishlist

    animationKey.current += 1

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

  return (
    <LinkBox>
      <Card.Root
        data-testid="product-card"
        asChild
        overflow="hidden"
        cursor="pointer"
        transition="all 0.3s"
        _hover={{
          transform: 'translateY(-4px)',
          boxShadow: 'lg',
        }}
      >
        <NextLink href={`/catalog/${product.id}`}>
          <Box position="relative" aspectRatio="3/4" overflow="hidden" bg="gray.100">
            {displayImage ? (
              <Image
                src={displayImage.url}
                alt={displayImage.alt || product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
                <Text color="fg.muted">Нет изображения</Text>
              </Box>
            )}

            {/* Кнопка добавления в избранное — мгновенный отклик через useOptimistic */}
            {selectedVariant && (
              <IconButton
                position="absolute"
                top={2}
                right={2}
                aria-label={optimisticInWishlist ? 'Удалить из избранного' : 'Добавить в избранное'}
                size="sm"
                colorPalette={'fg'}
                variant={optimisticInWishlist ? 'solid' : 'outline'}
                onClick={handleWishlistToggle}
                loading={isPending}
                zIndex={10}
              >
                <Box
                  key={animationKey.current}
                  style={optimisticInWishlist ? { animation: 'heartPulse 0.4s ease' } : undefined}
                  display="flex"
                >
                  {optimisticInWishlist ? <FaHeart /> : <FaRegHeart />}
                </Box>
              </IconButton>
            )}
          </Box>

          <Card.Body>
            <VStack align="start" gap={2}>
              <Heading size="md" textTransform="none" lineClamp={2}>
                {product.name}
              </Heading>

              {product.seller && (
                <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                  {product.seller.shopName}
                </Text>
              )}

              {product.variants.length > 0 && (
                <Text fontSize="sm" color="fg.muted">
                  {product.variants.length} {product.variants.length === 1 ? 'цвет' : 'цвета'}
                </Text>
              )}

              {allPrices.length > 0 && (
                <Text fontWeight="semibold" fontSize="lg" color="fg">
                  {minPrice === maxPrice
                    ? minPrice.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      })
                    : `${minPrice.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      })} - ${maxPrice.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      })}`}
                </Text>
              )}

              {product.reviewCount && product.reviewCount > 0 && product.averageRating && (
                <HStack gap={1}>
                  <Icon as={FaStar} boxSize={3} color="yellow.400" />
                  <Text fontSize="sm" color="fg.muted">
                    {product.averageRating.toFixed(1)} ({product.reviewCount})
                  </Text>
                </HStack>
              )}
            </VStack>
          </Card.Body>
        </NextLink>
      </Card.Root>
    </LinkBox>
  )
}
