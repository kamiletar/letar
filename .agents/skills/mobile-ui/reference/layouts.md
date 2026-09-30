# Layouts

Адаптивные layout паттерны с Chakra UI v3.

## Grid

### SimpleGrid — равные колонки

```tsx
// Карточки товаров: 2 колонки на mobile, 4 на desktop
<SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
  <ProductCard />
  <ProductCard />
</SimpleGrid>

// Статистика: 1 → 2 → 3 колонки
<SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
  <StatCard />
</SimpleGrid>

// С минимальной шириной колонки
<SimpleGrid minChildWidth="200px" gap={4}>
  <Card />
</SimpleGrid>
```

### Grid — кастомные колонки

```tsx
// Sidebar + Content
<Grid templateColumns={{ base: '1fr', lg: '240px 1fr' }} gap={4}>
  <Sidebar />
  <MainContent />
</Grid>

// Master-Detail (Chat layout)
<Grid templateColumns={{ base: '1fr', md: '320px 1fr' }}>
  <ChatList />
  <ChatView />
</Grid>

// 2 колонки для формы
<Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
  <Input placeholder="Имя" />
  <Input placeholder="Фамилия" />
</Grid>
```

### Auto-fill grid

```tsx
// Автоматическое количество колонок
<Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
  <Card />
</Grid>

// Thumbnails
<Grid templateColumns="repeat(auto-fill, minmax(80px, 1fr))" gap={2}>
  <Image />
</Grid>
```

---

## Stack

### Адаптивное направление

```tsx
// Вертикальный на mobile, горизонтальный на desktop
<Stack direction={{ base: 'column', md: 'row' }} gap={4}>
  <Box>Item 1</Box>
  <Box>Item 2</Box>
</Stack>

// Кнопки формы
<Stack direction={{ base: 'column', sm: 'row' }} gap={2}>
  <Button variant="outline">Отмена</Button>
  <Button colorPalette="fg">Сохранить</Button>
</Stack>
```

### HStack / VStack

```tsx
// HStack — всегда горизонтальный
<HStack gap={4} wrap="wrap">
  <Tag>Tag 1</Tag>
  <Tag>Tag 2</Tag>
</HStack>

// VStack — всегда вертикальный
<VStack align="stretch" gap={4}>
  <Input />
  <Button>Submit</Button>
</VStack>
```

---

## Container

```tsx
// Центрированный контент с адаптивными отступами
<Container maxW="container.xl" px={{ base: 4, md: 6, lg: 8 }}>
  {children}
</Container>

// Sizes: sm (640px), md (768px), lg (1024px), xl (1280px)
<Container maxW="container.md">
  <Article />
</Container>
```

---

## Flex

```tsx
// Header с пространством между элементами
<Flex justify="space-between" align="center" p={4}>
  <Logo />
  <Navigation />
  <UserMenu />
</Flex>

// Адаптивный wrap
<Flex wrap="wrap" gap={4}>
  <Box flex={{ base: '1 1 100%', md: '1 1 calc(50% - 8px)' }}>
    Card 1
  </Box>
  <Box flex={{ base: '1 1 100%', md: '1 1 calc(50% - 8px)' }}>
    Card 2
  </Box>
</Flex>
```

---

## Готовые паттерны

### Chat / Master-Detail layout

```tsx
// Файл: apps/driving-school/src/app/(chats)/chats/_layout-client.tsx
function ChatLayout() {
  const [showList, setShowList] = useState(true)

  return (
    <Grid
      templateColumns={{ base: '1fr', md: '320px 1fr' }}
      h="100dvh" // Dynamic viewport height
    >
      {/* Список скрывается на mobile при открытом чате */}
      <Box display={{ base: showList ? 'block' : 'none', md: 'block' }}>
        <ChatList onSelect={() => setShowList(false)} />
      </Box>

      {/* Чат скрывается на mobile при показе списка */}
      <Box display={{ base: showList ? 'none' : 'block', md: 'block' }}>
        <ChatView onBack={() => setShowList(true)} />
      </Box>
    </Grid>
  )
}
```

### Sidebar layout

```tsx
// Файл: apps/imot/src/app/(dashboard)/layout.tsx
<Grid templateColumns={{ base: '1fr', lg: '240px 1fr' }}>
  {/* Sidebar скрыт на mobile — используется Drawer */}
  <Box display={{ base: 'none', lg: 'block' }}>
    <AppSidebar />
  </Box>

  <Box p={{ base: 4, md: 6 }}>
    {/* Mobile header с hamburger menu */}
    <Box display={{ base: 'block', lg: 'none' }}>
      <MobileHeader />
    </Box>
    {children}
  </Box>
</Grid>
```

### Form layout

```tsx
// Файл: apps/premium-rosstil/src/app/[locale]/checkout/_components/checkout-form.tsx
<Stack gap={4}>
  {/* Полная ширина */}
  <Field.Root>
    <Field.Label>Email</Field.Label>
    <Input name="email" type="email" />
  </Field.Root>

  {/* 2 колонки на desktop */}
  <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
    <Field.Root>
      <Field.Label>Имя</Field.Label>
      <Input name="firstName" />
    </Field.Root>
    <Field.Root>
      <Field.Label>Фамилия</Field.Label>
      <Input name="lastName" />
    </Field.Root>
  </Grid>
</Stack>
```

### Card Grid (каталог)

```tsx
// Файл: apps/premium-rosstil/src/app/[locale]/catalog/page.tsx
<SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={{ base: 2, md: 4 }}>
  {products.map((product) => <ProductCard key={product.id} product={product} />)}
</SimpleGrid>
```

---

## Viewport Units

```tsx
// dvh — dynamic viewport height (учитывает мобильную клавиатуру)
<Box h="100dvh" />

// svh — small viewport height (минимальная)
<Box minH="100svh" />

// lvh — large viewport height (максимальная)
<Box maxH="100lvh" />

// vh — классический (может обрезаться на mobile)
<Box h="100vh" />  // ⚠️ Избегай на mobile
```

---

## См. также

- [navigation.md](navigation.md) — Мобильная навигация
- [patterns.md](patterns.md) — Готовые компоненты
