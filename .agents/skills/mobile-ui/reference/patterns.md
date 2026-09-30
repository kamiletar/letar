# Patterns

Готовые адаптивные паттерны из проекта.

## Product Card

```tsx
// Файл: apps/premium-rosstil/src/app/[locale]/catalog/_components/product-card.tsx
import { AspectRatio, Card, IconButton, LinkBox, LinkOverlay, Text } from '@chakra-ui/react'
import Image from 'next/image'
import Link from 'next/link'
import { LuHeart } from 'react-icons/lu'

export function ProductCard({ product }) {
  return (
    <Card.Root overflow="hidden">
      <LinkBox position="relative">
        {/* Изображение с соотношением сторон */}
        <AspectRatio ratio={3 / 4}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw" // Responsive sizes
            style={{ objectFit: 'cover' }}
          />
        </AspectRatio>

        {/* Wishlist button — достаточный touch target */}
        <IconButton
          position="absolute"
          top={2}
          right={2}
          variant="solid"
          bg="white"
          size="md"
          borderRadius="full"
          aria-label="Добавить в избранное"
          _hover={{ bg: 'gray.100' }}
        >
          <LuHeart />
        </IconButton>
      </LinkBox>

      <Card.Body p={{ base: 2, md: 4 }}>
        <LinkOverlay asChild>
          <Link href={`/catalog/${product.id}`}>
            <Text
              fontWeight="medium"
              lineClamp={2} // Ограничение строк
              fontSize={{ base: 'sm', md: 'md' }}
            >
              {product.name}
            </Text>
          </Link>
        </LinkOverlay>

        <Text fontWeight="bold" mt={1}>
          {formatPrice(product.price)}
        </Text>
      </Card.Body>
    </Card.Root>
  )
}
```

### Использование в grid

```tsx
<SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={{ base: 2, md: 4 }}>
  {products.map((product) => <ProductCard key={product.id} product={product} />)}
</SimpleGrid>
```

---

## Cart Item

```tsx
// Файл: apps/premium-rosstil/src/app/[locale]/cart/_components/cart-item-card.tsx
import { Box, Grid, IconButton, NumberInput, Stack, Text } from '@chakra-ui/react'
import Image from 'next/image'
import { LuTrash } from 'react-icons/lu'

export function CartItemCard({ item, onQuantityChange, onRemove }) {
  return (
    <Grid
      templateColumns={{ base: '100px 1fr', md: '150px 1fr' }}
      gap={{ base: 3, md: 4 }}
      p={{ base: 3, md: 4 }}
      borderWidth="1px"
      borderRadius="md"
    >
      {/* Изображение — адаптивный размер */}
      <Box position="relative" w={{ base: '100px', md: '150px' }} h={{ base: '100px', md: '150px' }}>
        <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover', borderRadius: '4px' }} />
      </Box>

      {/* Информация */}
      <Stack justify="space-between">
        <Box>
          <Text fontWeight="medium" lineClamp={2}>
            {item.name}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Размер: {item.size}
          </Text>
        </Box>

        <Stack direction={{ base: 'column', sm: 'row' }} justify="space-between" align="flex-end">
          {/* Количество */}
          <NumberInput.Root
            value={String(item.quantity)}
            onValueChange={(e) => onQuantityChange(Number(e.value))}
            min={1}
            max={99}
            size={{ base: 'sm', md: 'md' }}
            w="100px"
          >
            <NumberInput.Control>
              <NumberInput.DecrementTrigger />
              <NumberInput.Input />
              <NumberInput.IncrementTrigger />
            </NumberInput.Control>
          </NumberInput.Root>

          {/* Цена и удаление */}
          <HStack gap={4}>
            <Text fontWeight="bold">{formatPrice(item.price * item.quantity)}</Text>
            <IconButton variant="ghost" colorPalette="red" aria-label="Удалить" onClick={onRemove}>
              <LuTrash />
            </IconButton>
          </HStack>
        </Stack>
      </Stack>
    </Grid>
  )
}
```

---

## Stats Cards

```tsx
// Файл: apps/driving-school/src/app/(instructor)/stats/_components/stats-cards.tsx
import { Card, Icon, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { LuCalendar, LuClock, LuTrendingUp, LuUsers } from 'react-icons/lu'

export function StatsCards({ stats }) {
  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
      <StatCard icon={LuUsers} label="Студенты" value={stats.students} colorPalette="blue" />
      <StatCard icon={LuCalendar} label="Уроки" value={stats.lessons} colorPalette="green" />
      <StatCard icon={LuClock} label="Часы" value={stats.hours} colorPalette="purple" />
      <StatCard icon={LuTrendingUp} label="Рейтинг" value={stats.rating} colorPalette="orange" />
    </SimpleGrid>
  )
}

function StatCard({ icon, label, value, colorPalette }) {
  return (
    <Card.Root p={{ base: 3, md: 4 }}>
      <Stack gap={2}>
        <Icon asChild boxSize={5} color={`${colorPalette}.500`}>
          {React.createElement(icon)}
        </Icon>
        <Text fontSize="2xl" fontWeight="bold">
          {value}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {label}
        </Text>
      </Stack>
    </Card.Root>
  )
}
```

---

## Image Gallery

```tsx
// Файл: apps/premium-rosstil/src/app/[locale]/catalog/[id]/_components/image-gallery.tsx
import { AspectRatio, Box, Grid, IconButton } from '@chakra-ui/react'
import Image from 'next/image'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

export function ImageGallery({ images }) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <Stack gap={4}>
      {/* Главное изображение */}
      <Box position="relative">
        <AspectRatio ratio={1}>
          <Image
            src={images[activeIndex].url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            style={{ objectFit: 'cover' }}
          />
        </AspectRatio>

        {/* Навигационные стрелки — большие touch targets */}
        {images.length > 1 && (
          <>
            <IconButton
              position="absolute"
              left={2}
              top="50%"
              transform="translateY(-50%)"
              variant="solid"
              bg="white/80"
              size="lg"
              borderRadius="full"
              aria-label="Предыдущее"
              onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
            >
              <LuChevronLeft />
            </IconButton>

            <IconButton
              position="absolute"
              right={2}
              top="50%"
              transform="translateY(-50%)"
              variant="solid"
              bg="white/80"
              size="lg"
              borderRadius="full"
              aria-label="Следующее"
              onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
            >
              <LuChevronRight />
            </IconButton>
          </>
        )}
      </Box>

      {/* Thumbnails */}
      <Grid templateColumns="repeat(auto-fill, minmax(60px, 1fr))" gap={2}>
        {images.map((image, index) => (
          <AspectRatio
            key={image.id}
            ratio={1}
            cursor="pointer"
            borderWidth={2}
            borderColor={index === activeIndex ? 'fg.500' : 'transparent'}
            borderRadius="md"
            overflow="hidden"
            onClick={() => setActiveIndex(index)}
          >
            <Image src={image.url} alt="" fill style={{ objectFit: 'cover' }} />
          </AspectRatio>
        ))}
      </Grid>
    </Stack>
  )
}
```

---

## Search with filters (mobile)

```tsx
import { Box, Button, Drawer, HStack, IconButton, Input, Portal, VStack } from '@chakra-ui/react'
import { LuFilter, LuSearch } from 'react-icons/lu'

export function SearchWithFilters() {
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <Stack gap={4}>
      {/* Search bar */}
      <HStack>
        <Input placeholder="Поиск..." size={{ base: 'lg', md: 'md' }} flex={1} />

        {/* Фильтры — кнопка на mobile, inline на desktop */}
        <IconButton
          display={{ base: 'flex', md: 'none' }}
          aria-label="Фильтры"
          size="lg"
          onClick={() => setFiltersOpen(true)}
        >
          <LuFilter />
        </IconButton>
      </HStack>

      {/* Desktop filters inline */}
      <HStack display={{ base: 'none', md: 'flex' }} gap={4}>
        <Select placeholder="Категория" />
        <Select placeholder="Цена" />
        <Select placeholder="Сортировка" />
      </HStack>

      {/* Mobile filters в Drawer */}
      <Drawer.Root open={filtersOpen} onOpenChange={(e) => setFiltersOpen(e.open)} placement="bottom">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content borderTopRadius="xl">
              <Drawer.Header>Фильтры</Drawer.Header>
              <Drawer.Body>
                <VStack align="stretch" gap={4}>
                  <Select placeholder="Категория" size="lg" />
                  <Select placeholder="Цена" size="lg" />
                  <Select placeholder="Сортировка" size="lg" />
                </VStack>
              </Drawer.Body>
              <Drawer.Footer>
                <Button w="full" size="lg" colorPalette="fg" onClick={() => setFiltersOpen(false)}>
                  Применить
                </Button>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Stack>
  )
}
```

---

## Form с адаптивной раскладкой

```tsx
export function ContactForm() {
  return (
    <Stack gap={4}>
      {/* Всегда полная ширина */}
      <Field.Root>
        <Field.Label>Email</Field.Label>
        <Input type="email" size={{ base: 'lg', md: 'md' }} />
      </Field.Root>

      {/* 2 колонки на desktop */}
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
        <Field.Root>
          <Field.Label>Имя</Field.Label>
          <Input size={{ base: 'lg', md: 'md' }} />
        </Field.Root>
        <Field.Root>
          <Field.Label>Телефон</Field.Label>
          <Input type="tel" size={{ base: 'lg', md: 'md' }} />
        </Field.Root>
      </Grid>

      {/* Textarea */}
      <Field.Root>
        <Field.Label>Сообщение</Field.Label>
        <Textarea rows={4} />
      </Field.Root>

      {/* Кнопки — stack на mobile, row на desktop */}
      <Stack direction={{ base: 'column', sm: 'row' }} gap={2}>
        <Button variant="outline" flex={{ sm: 1 }}>
          Отмена
        </Button>
        <Button colorPalette="fg" flex={{ sm: 1 }} size={{ base: 'lg', md: 'md' }}>
          Отправить
        </Button>
      </Stack>
    </Stack>
  )
}
```

---

## См. также

- [layouts.md](layouts.md) — Grid и Stack паттерны
- [touch-friendly.md](touch-friendly.md) — Touch targets
