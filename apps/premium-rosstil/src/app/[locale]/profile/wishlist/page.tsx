import type { Prisma, WishlistPriority } from '@/generated/prisma'
import { Link } from '@/i18n/navigation'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { Box, Container, Grid, Heading, Text } from '@chakra-ui/react'
import { WishlistFilters } from './_components/wishlist-filters'
import { WishlistItemCard } from './_components/wishlist-item-card'

// Тип для wishlist с include
type WishlistWithItems = Prisma.WishlistGetPayload<{
  include: {
    items: {
      include: {
        productVariant: {
          include: {
            product: true
            items: true
            images: {
              include: {
                image: true
              }
            }
          }
        }
      }
    }
  }
}>

// Тип для элемента wishlist из запроса
type WishlistItemWithRelations = WishlistWithItems['items'][number]

// Тип для элемента productVariant.items
type ProductItemFromVariant = WishlistItemWithRelations['productVariant']['items'][number]

// Тип для элемента productVariant.images
type VariantImageWithImage = WishlistItemWithRelations['productVariant']['images'][number]

// Тип для сериализованного элемента wishlist
type SerializedWishlistItem = Omit<WishlistItemWithRelations, 'productVariant'> & {
  productVariant: Omit<WishlistItemWithRelations['productVariant'], 'items' | 'images'> & {
    items: Array<Omit<ProductItemFromVariant, 'price'> & { price: number }>
    images: Array<{ url: string; alt: string | null }>
  }
}

export const metadata = {
  title: 'Избранное — Премиум РосСтиль',
  description: 'Ваши избранные товары',
}

interface WishlistPageProps {
  searchParams: Promise<{
    priority?: string
    tag?: string
    sort?: string
  }>
}

export default async function WishlistPage({ searchParams }: WishlistPageProps) {
  // Проверка авторизации
  const authUser = await requireAuth()

  // Получение параметров фильтрации
  const params = await searchParams
  const priorityFilter = params.priority
  const tagFilter = params.tag
  const sortOption = params.sort || 'newest'

  // Получение wishlist пользователя
  const db = getEnhancedPrisma(authUser)
  const wishlist = await db.wishlist.findUnique({
    where: {
      userId: authUser.id,
    },
    include: {
      items: {
        include: {
          productVariant: {
            include: {
              product: true,
              items: {
                orderBy: {
                  price: 'asc',
                },
              },
              images: {
                include: {
                  image: true,
                },
                orderBy: {
                  order: 'asc',
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  // Сериализация и фильтрация
  let serializedItems = wishlist?.items.map((item: WishlistItemWithRelations) => ({
    ...item,
    note: item.note,
    priority: item.priority,
    tags: item.tags,
    productVariant: {
      ...item.productVariant,
      items: item.productVariant.items.map((pItem: ProductItemFromVariant) => ({
        ...pItem,
        price: Number(pItem.price),
      })),
      images: item.productVariant.images.map((vi: VariantImageWithImage) => ({
        url: getImageUrl(vi.image.path),
        alt: vi.alt,
      })),
    },
  }))

  // Фильтрация по приоритету
  if (priorityFilter && serializedItems) {
    serializedItems = serializedItems.filter((item: SerializedWishlistItem) => item.priority === priorityFilter)
  }

  // Фильтрация по тегу
  if (tagFilter && serializedItems) {
    serializedItems = serializedItems.filter((item: SerializedWishlistItem) => item.tags.includes(tagFilter))
  }

  // Сортировка
  const priorityOrder: Record<WishlistPriority, number> = { DREAM: 0, WANT: 1, MAYBE: 2 }
  if (serializedItems) {
    switch (sortOption) {
      case 'oldest':
        serializedItems = [...serializedItems].reverse()
        break
      case 'priority':
        // Порядок: DREAM > WANT > MAYBE
        serializedItems = [...serializedItems].sort(
          (a: SerializedWishlistItem, b: SerializedWishlistItem) =>
            priorityOrder[a.priority] - priorityOrder[b.priority]
        )
        break
      // 'newest' - уже отсортировано по умолчанию
    }
  }

  // Сбор всех тегов для фильтра
  const allTags: string[] = Array.from(
    new Set<string>(wishlist?.items.flatMap((item: WishlistItemWithRelations) => item.tags) || [])
  ).sort()

  // Проверка - пустой ли wishlist вообще (без учёта фильтров)
  const isWishlistEmpty = !wishlist || wishlist.items.length === 0
  // Проверка - пустой ли результат после фильтрации
  const isFilteredEmpty = !serializedItems || serializedItems.length === 0

  return (
    <Container maxW="7xl" py={8}>
      <Heading size="3xl" mb={8} textTransform="none">
        Избранное
      </Heading>

      {isWishlistEmpty ? (
        <Box textAlign="center" py={12}>
          <Text fontSize="xl" color="fg.muted" mb={4}>
            У вас пока нет избранных товаров
          </Text>
          <Text color="fg.muted">
            Перейдите в{' '}
            <Link href="/catalog" style={{ textDecoration: 'underline' }}>
              каталог
            </Link>
            , чтобы добавить товары в избранное
          </Text>
        </Box>
      ) : (
        <>
          {/* Фильтры и сортировка */}
          <WishlistFilters
            allTags={allTags}
            currentPriority={priorityFilter}
            currentTag={tagFilter}
            currentSort={sortOption}
            totalItems={wishlist.items.length}
            filteredItems={serializedItems?.length || 0}
          />

          {isFilteredEmpty ? (
            <Box textAlign="center" py={12}>
              <Text fontSize="xl" color="fg.muted" mb={4}>
                Нет товаров по выбранным фильтрам
              </Text>
              <Text color="fg.muted">
                <Link href="/profile/wishlist" style={{ textDecoration: 'underline' }}>
                  Сбросить фильтры
                </Link>
              </Text>
            </Box>
          ) : (
            <Grid
              templateColumns={{
                base: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              }}
              gap={6}
            >
              {serializedItems?.map((item: SerializedWishlistItem) => (
                <WishlistItemCard key={item.id} item={item} />
              ))}
            </Grid>
          )}
        </>
      )}
    </Container>
  )
}
