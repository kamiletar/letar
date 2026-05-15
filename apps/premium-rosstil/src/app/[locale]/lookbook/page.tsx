'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { Look, LookbookSeason, LookOccasion } from '@/hooks/use-lookbook'
import { OCCASION_CONFIG, SEASON_CONFIG, useLookbook } from '@/hooks/use-lookbook'
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Image,
  Portal,
  SegmentGroup,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaBookOpen, FaHeart, FaRegHeart, FaShoppingCart } from 'react-icons/fa'

export default function LookbookPage() {
  const {
    lookbooks,
    isLoading,
    getLooksByOccasion: _getLooksByOccasion,
    toggleFavorite,
    isFavorite,
    getFavoriteLooks,
    calculateLookTotal,
    availableSeasons,
    availableOccasions,
    favoritesCount,
  } = useLookbook()

  const [selectedSeason, setSelectedSeason] = useState<LookbookSeason | 'all'>('all')
  const [selectedOccasion, setSelectedOccasion] = useState<LookOccasion | 'all'>('all')
  const [selectedLook, setSelectedLook] = useState<Look | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)

  const handleToggleFavorite = async (lookId: string) => {
    const wasFavorite = isFavorite(lookId)
    await toggleFavorite(lookId)
    toaster.success({
      title: wasFavorite ? 'Удалено из избранного' : 'Добавлено в избранное',
    })
  }

  const handleAddAllToCart = (look: Look) => {
    // TODO: Интеграция с корзиной
    toaster.success({
      title: `${look.products.length} товаров добавлено в корзину`,
      description: `Общая сумма: ${calculateLookTotal(look).toLocaleString('ru-RU')} ₽`,
    })
  }

  if (isLoading) {
    return (
      <Container maxW="6xl" py={8}>
        <Text>Загрузка...</Text>
      </Container>
    )
  }

  // Фильтрация образов
  let filteredLooks: (Look & { lookbookId: string; lookbookTitle: string })[] = []

  if (showFavorites) {
    filteredLooks = getFavoriteLooks()
  } else {
    for (const lookbook of lookbooks) {
      if (selectedSeason !== 'all' && lookbook.season !== selectedSeason) {
        continue
      }
      for (const look of lookbook.looks) {
        if (selectedOccasion !== 'all' && look.occasion !== selectedOccasion) {
          continue
        }
        filteredLooks.push({
          ...look,
          lookbookId: lookbook.id,
          lookbookTitle: lookbook.title,
        })
      }
    }
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" gap={1}>
            <Heading size="xl">
              <Icon as={FaBookOpen} mr={3} />
              Лукбук
            </Heading>
            <Text color="fg.muted">Готовые образы от стилиста бренда</Text>
          </VStack>
          <Button
            variant={showFavorites ? 'solid' : 'outline'}
            colorPalette={showFavorites ? 'red' : 'gray'}
            onClick={() => setShowFavorites(!showFavorites)}
          >
            <Icon as={showFavorites ? FaHeart : FaRegHeart} mr={2} />
            Избранное {favoritesCount > 0 && `(${favoritesCount})`}
          </Button>
        </HStack>

        {/* Фильтры */}
        {!showFavorites && (
          <Card.Root>
            <Card.Body>
              <VStack gap={4} align="stretch">
                {/* Фильтр по сезону */}
                <VStack align="start" gap={2}>
                  <Text fontWeight="medium" fontSize="sm">
                    Сезон
                  </Text>
                  <SegmentGroup.Root
                    value={selectedSeason}
                    onValueChange={(e) => setSelectedSeason(e.value as LookbookSeason | 'all')}
                    size="sm"
                  >
                    <SegmentGroup.Indicator />
                    <SegmentGroup.Item value="all">
                      <SegmentGroup.ItemText>Все</SegmentGroup.ItemText>
                      <SegmentGroup.ItemHiddenInput />
                    </SegmentGroup.Item>
                    {availableSeasons.map((season) => (
                      <SegmentGroup.Item key={season} value={season}>
                        <SegmentGroup.ItemText>{SEASON_CONFIG[season].label}</SegmentGroup.ItemText>
                        <SegmentGroup.ItemHiddenInput />
                      </SegmentGroup.Item>
                    ))}
                  </SegmentGroup.Root>
                </VStack>

                {/* Фильтр по случаю */}
                <VStack align="start" gap={2}>
                  <Text fontWeight="medium" fontSize="sm">
                    Случай
                  </Text>
                  <HStack gap={2} flexWrap="wrap">
                    <Button
                      size="sm"
                      variant={selectedOccasion === 'all' ? 'solid' : 'outline'}
                      colorPalette={selectedOccasion === 'all' ? 'fg' : 'gray'}
                      onClick={() => setSelectedOccasion('all')}
                    >
                      Все
                    </Button>
                    {availableOccasions.map((occasion) => (
                      <Button
                        key={occasion}
                        size="sm"
                        variant={selectedOccasion === occasion ? 'solid' : 'outline'}
                        colorPalette={selectedOccasion === occasion ? 'fg' : 'gray'}
                        onClick={() => setSelectedOccasion(occasion)}
                      >
                        {OCCASION_CONFIG[occasion].emoji} {OCCASION_CONFIG[occasion].label}
                      </Button>
                    ))}
                  </HStack>
                </VStack>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Количество результатов */}
        <Text color="fg.muted" fontSize="sm">
          {showFavorites ? 'Избранные образы' : 'Найдено образов'}: {filteredLooks.length}
        </Text>

        {/* Сетка образов */}
        {filteredLooks.length === 0 ? (
          <Card.Root>
            <Card.Body py={12} textAlign="center">
              <VStack gap={4}>
                <Icon as={showFavorites ? FaHeart : FaBookOpen} boxSize={12} color="fg.muted" />
                <Text color="fg.muted">
                  {showFavorites
                    ? 'Вы ещё не добавили образы в избранное'
                    : 'Образы не найдены. Попробуйте изменить фильтры'}
                </Text>
                {showFavorites && (
                  <Button variant="outline" onClick={() => setShowFavorites(false)}>
                    Смотреть все образы
                  </Button>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        ) : (
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
            {filteredLooks.map((look) => (
              <LookCard
                key={look.id}
                look={look}
                lookbookTitle={look.lookbookTitle}
                isFavorite={isFavorite(look.id)}
                total={calculateLookTotal(look)}
                onToggleFavorite={() => handleToggleFavorite(look.id)}
                onOpenDetails={() => setSelectedLook(look)}
                onAddAllToCart={() => handleAddAllToCart(look)}
              />
            ))}
          </Grid>
        )}

        {/* Модальное окно с деталями образа */}
        <Dialog.Root open={!!selectedLook} onOpenChange={(e) => !e.open && setSelectedLook(null)}>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content maxW="4xl" maxH="90vh" overflow="auto">
                {selectedLook && (
                  <>
                    <Dialog.Header>
                      <HStack justify="space-between" w="full" pr={8}>
                        <Dialog.Title>{selectedLook.title}</Dialog.Title>
                        <IconButton
                          aria-label={isFavorite(selectedLook.id) ? 'Удалить из избранного' : 'В избранное'}
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleToggleFavorite(selectedLook.id)}
                        >
                          <Icon as={isFavorite(selectedLook.id) ? FaHeart : FaRegHeart} />
                        </IconButton>
                      </HStack>
                    </Dialog.Header>
                    <Dialog.Body>
                      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                        {/* Изображение образа */}
                        <Box>
                          <Box borderRadius="lg" overflow="hidden" bg="bg.subtle" aspectRatio={3 / 4}>
                            {selectedLook.imageUrl ? (
                              <Image
                                src={selectedLook.imageUrl}
                                alt={selectedLook.title}
                                w="full"
                                h="full"
                                objectFit="cover"
                              />
                            ) : (
                              <Box
                                w="full"
                                h="full"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                bg="bg.muted"
                              >
                                <Icon as={FaBookOpen} boxSize={16} color="fg.muted" />
                              </Box>
                            )}
                          </Box>
                        </Box>

                        {/* Информация и товары */}
                        <VStack align="stretch" gap={4}>
                          {selectedLook.description && <Text color="fg.muted">{selectedLook.description}</Text>}

                          <HStack>
                            <Badge colorPalette="purple">
                              {OCCASION_CONFIG[selectedLook.occasion].emoji}{' '}
                              {OCCASION_CONFIG[selectedLook.occasion].label}
                            </Badge>
                          </HStack>

                          {selectedLook.stylistTip && (
                            <Box bg="yellow.subtle" p={4} borderRadius="md">
                              <Text fontSize="sm" fontWeight="medium" mb={1}>
                                💡 Совет стилиста
                              </Text>
                              <Text fontSize="sm">{selectedLook.stylistTip}</Text>
                            </Box>
                          )}

                          <VStack align="stretch" gap={2}>
                            <Text fontWeight="medium">Товары в образе:</Text>
                            {selectedLook.products.map((product) => (
                              <HStack key={product.id} p={2} bg="bg.muted" borderRadius="md" gap={3}>
                                <Box w={12} h={12} borderRadius="md" overflow="hidden" bg="bg.subtle" flexShrink={0}>
                                  {product.imageUrl && (
                                    <Image
                                      src={product.imageUrl}
                                      alt={product.name}
                                      w="full"
                                      h="full"
                                      objectFit="cover"
                                    />
                                  )}
                                </Box>
                                <VStack align="start" gap={0} flex={1}>
                                  <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                                    {product.name}
                                  </Text>
                                  <Text fontSize="xs" color="fg.muted">
                                    {product.category}
                                  </Text>
                                </VStack>
                                <Text fontWeight="bold" fontSize="sm">
                                  {product.price.toLocaleString('ru-RU')} ₽
                                </Text>
                              </HStack>
                            ))}
                          </VStack>

                          <Box p={4} bg="bg.muted" borderRadius="md" borderWidth="1px" borderColor="border.muted">
                            <HStack justify="space-between">
                              <Text fontWeight="medium">Итого за образ:</Text>
                              <Text fontSize="xl" fontWeight="bold">
                                {calculateLookTotal(selectedLook).toLocaleString('ru-RU')} ₽
                              </Text>
                            </HStack>
                          </Box>

                          <Button colorPalette="fg" size="lg" onClick={() => handleAddAllToCart(selectedLook)}>
                            <Icon as={FaShoppingCart} mr={2} />
                            Купить весь образ
                          </Button>
                        </VStack>
                      </Grid>
                    </Dialog.Body>
                    <Dialog.CloseTrigger />
                  </>
                )}
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </VStack>
    </Container>
  )
}

/**
 * Карточка образа
 */
function LookCard({
  look,
  lookbookTitle,
  isFavorite,
  total,
  onToggleFavorite,
  onOpenDetails,
  onAddAllToCart,
}: {
  look: Look
  lookbookTitle: string
  isFavorite: boolean
  total: number
  onToggleFavorite: () => void
  onOpenDetails: () => void
  onAddAllToCart: () => void
}) {
  return (
    <Card.Root overflow="hidden" _hover={{ shadow: 'lg' }} transition="all 0.2s">
      {/* Изображение */}
      <Box position="relative" cursor="pointer" onClick={onOpenDetails}>
        <Box aspectRatio={3 / 4} bg="bg.subtle">
          {look.imageUrl ? (
            <Image src={look.imageUrl} alt={look.title} w="full" h="full" objectFit="cover" />
          ) : (
            <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center">
              <Icon as={FaBookOpen} boxSize={12} color="fg.muted" />
            </Box>
          )}
        </Box>

        {/* Кнопка избранного */}
        <IconButton
          aria-label={isFavorite ? 'Удалить из избранного' : 'В избранное'}
          position="absolute"
          top={2}
          right={2}
          size="sm"
          variant="solid"
          bg={isFavorite ? 'red.500' : 'blackAlpha.600'}
          color="white"
          _hover={{ bg: isFavorite ? 'red.600' : 'blackAlpha.700' }}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
        >
          <Icon as={isFavorite ? FaHeart : FaRegHeart} />
        </IconButton>

        {/* Бейдж случая */}
        <Badge position="absolute" bottom={2} left={2} colorPalette="blackAlpha" bg="blackAlpha.700" color="white">
          {OCCASION_CONFIG[look.occasion].emoji} {OCCASION_CONFIG[look.occasion].label}
        </Badge>
      </Box>

      <Card.Body p={4}>
        <VStack align="stretch" gap={2}>
          <Text fontSize="xs" color="fg.muted">
            {lookbookTitle}
          </Text>
          <Text fontWeight="medium" lineClamp={1}>
            {look.title}
          </Text>
          {look.description && (
            <Text fontSize="sm" color="fg.muted" lineClamp={2}>
              {look.description}
            </Text>
          )}

          <HStack justify="space-between" pt={2}>
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="fg.muted">
                {look.products.length} товаров
              </Text>
              <Text fontWeight="bold">{total.toLocaleString('ru-RU')} ₽</Text>
            </VStack>
            <Button size="sm" colorPalette="fg" onClick={onAddAllToCart}>
              <Icon as={FaShoppingCart} mr={1} />В корзину
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
