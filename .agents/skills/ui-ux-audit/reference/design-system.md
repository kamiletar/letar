# Design System Audit Reference

## ⚠️ CRITICAL: Semantic Tokens First

В проекте **ОБЯЗАТЕЛЬНО** используются тёмная/светлая темы. Приоритет токенов:

```
1. Semantic tokens (bg.surface, fg.default) — ПРИОРИТЕТ
2. colorPalette для компонентов
3. Обычные токены (gray.100) — только если нет семантического
```

### Semantic Tokens (MUST USE)

```tsx
// ✅ ПРИОРИТЕТ — semantic tokens (работают в обоих режимах)
<Box bg="bg.surface" color="fg.default" />
<Box bg="bg.subtle" borderColor="border.default" />
<Text color="fg.muted" />
<Box bg="bg.emphasized" />

// ⚠️ Допустимо для компонентов — colorPalette
<Button colorPalette="blue" />
<Badge colorPalette="green" />

// ⚠️ Осторожно — обычные токены (проверь dark mode!)
<Box bg="gray.100" />  // В dark mode может быть слишком светлым

// ❌ ЗАПРЕЩЕНО — хардкод
<Box bg="#f0f0f0" color="#1a1a1a" />
<Text color="rgb(59, 130, 246)" />
```

### Основные Semantic Tokens

| Token            | Light    | Dark     | Использование         |
| ---------------- | -------- | -------- | --------------------- |
| `bg.surface`     | white    | gray.800 | Основной фон карточек |
| `bg.subtle`      | gray.50  | gray.900 | Вторичный фон         |
| `bg.muted`       | gray.100 | gray.700 | Акцентный фон         |
| `bg.emphasized`  | gray.200 | gray.600 | Выделенный фон        |
| `fg.default`     | gray.900 | white    | Основной текст        |
| `fg.muted`       | gray.600 | gray.400 | Вторичный текст       |
| `fg.subtle`      | gray.500 | gray.500 | Подписи               |
| `border.default` | gray.200 | gray.700 | Границы               |

### Проверка Dark Mode

```tsx
// Используй Chrome DevTools → Elements → Toggle dark mode
// Или: document.documentElement.classList.toggle('dark')

// Убедись что ВСЕ элементы читаемы в обоих режимах
```

---

## Tokens vs Hardcode

### Цвета

```tsx
// ✅ ПРИОРИТЕТ — semantic tokens
<Box bg="bg.surface" color="fg.default" />
<Text color="fg.muted" />
<Card bg="bg.subtle" borderColor="border.default" />

// ✅ Хорошо — colorPalette для компонентов
<Button colorPalette="blue" />
<Alert colorPalette="red" />

// ⚠️ Осторожно — обычные токены (проверь dark mode)
<Box bg="gray.100" color="gray.900" />

// ❌ Запрещено — хардкод
<Box bg="#f0f0f0" color="#1a1a1a" />
<Text color="rgb(59, 130, 246)" />
```

### Spacing

```tsx
// ✅ Правильно — токены spacing
<Box p={4} m={2} gap={3} />  // 16px, 8px, 12px

// ❌ Неправильно — произвольные значения
<Box p="17px" m="9px" gap="13px" />
```

### Typography

```tsx
// ✅ Правильно — токены
<Text fontSize="md" fontWeight="semibold" lineHeight="tall" />
<Heading size="lg" />

// ❌ Неправильно — хардкод
<Text fontSize="15px" fontWeight="550" lineHeight="1.7" />
```

### Radii

```tsx
// ✅ Правильно — токены
<Box borderRadius="md" />      // 8px
<Card borderRadius="lg" />     // 12px
<Avatar borderRadius="full" /> // 9999px

// ❌ Неправильно — хардкод
<Box borderRadius="7px" />
```

---

## Dark/Light Mode

### colorPalette (для компонентов)

```tsx
// ✅ Автоматическая адаптация через colorPalette
<Button colorPalette="blue">Кнопка</Button>
<Badge colorPalette="green">Активен</Badge>
<Alert colorPalette="red">Ошибка</Alert>

// Работает в обоих режимах автоматически
```

### Условные стили \_light/\_dark

```tsx
// ✅ Когда нет подходящего semantic token
<Box bg={{ _light: 'blue.50', _dark: 'blue.900' }} />

// ✅ Для специфичных случаев
<Box
  borderColor={{ _light: 'gray.200', _dark: 'gray.600' }}
  bg={{ _light: 'white', _dark: 'gray.800' }}
/>
```

### Типичные ошибки Dark Mode

```tsx
// ❌ Только light цвет
<Box bg="white" />  // Слишком яркий в dark mode

// ❌ Только dark цвет
<Box bg="gray.800" />  // Не видно в dark mode

// ❌ Хардкод цвета
<Text color="#333" />  // Не адаптируется

// ✅ Правильно
<Box bg="bg.surface" />  // white в light, gray.800 в dark
```

---

## Consistency Checks

### Component Variants

```tsx
// ✅ Консистентное использование variants
<Button variant="solid">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>

// ❌ Инконсистентное — разные стили для одинаковых действий
<Button variant="solid">Primary</Button>
<Box as="button" border="1px solid" p={2}>Secondary</Box>
```

### Icon Sizes

```tsx
// ✅ Консистентные размеры иконок
<Icon as={FiPlus} boxSize={5} />   // 20px — стандарт для кнопок
<Icon as={FiPlus} boxSize={4} />   // 16px — для текста

// ❌ Разные размеры в одном контексте
<HStack>
  <Icon as={FiPlus} boxSize={5} />
  <Icon as={FiMinus} boxSize="18px" />
</HStack>
```

### Shadow System

```tsx
// ✅ Токены теней
<Card shadow="sm" />   // Subtle elevation
<Card shadow="md" />   // Standard card
<Card shadow="lg" />   // Modal/Dropdown
<Card shadow="xl" />   // High elevation

// ❌ Кастомные тени
<Card boxShadow="0 2px 8px rgba(0,0,0,0.15)" />
```

---

## Typography Scale

### Heading Sizes

| Size  | Font Size | Line Height | Usage                   |
| ----- | --------- | ----------- | ----------------------- |
| `2xl` | 48px      | 1.2         | Hero, главный заголовок |
| `xl`  | 36px      | 1.2         | Страницы                |
| `lg`  | 30px      | 1.2         | Секции                  |
| `md`  | 24px      | 1.33        | Карточки                |
| `sm`  | 20px      | 1.4         | Подзаголовки            |
| `xs`  | 18px      | 1.5         | Мелкие заголовки        |

```tsx
<Heading size="2xl">Hero Title</Heading>
<Heading size="lg">Section Title</Heading>
<Heading size="md">Card Title</Heading>
```

### Text Sizes

| Size | Font Size | Usage           |
| ---- | --------- | --------------- |
| `xs` | 12px      | Подписи, метки  |
| `sm` | 14px      | Вторичный текст |
| `md` | 16px      | Основной текст  |
| `lg` | 18px      | Акцентный текст |
| `xl` | 20px      | Крупный текст   |

```tsx
<Text fontSize="md">Основной контент</Text>
<Text fontSize="sm" color="fg.muted">Подпись</Text>
```

---

## Spacing System

### Scale

| Token | Value | Usage               |
| ----- | ----- | ------------------- |
| 1     | 4px   | Минимальный отступ  |
| 2     | 8px   | Внутри элементов    |
| 3     | 12px  | Между связанными    |
| 4     | 16px  | Стандартный padding |
| 5     | 20px  | Между группами      |
| 6     | 24px  | Секции              |
| 8     | 32px  | Большие секции      |
| 10    | 40px  | Страницы            |
| 12    | 48px  | Hero блоки          |

### Паттерны

```tsx
// Карточка
<Card p={4} gap={3}>       // padding: 16px, gap: 12px
  <Heading size="md" />
  <Text />
</Card>

// Форма
<VStack gap={4} align="stretch">  // gap: 16px между полями
  <Field.Root>...</Field.Root>
  <Field.Root>...</Field.Root>
</VStack>

// Секция
<Box py={8} px={4}>        // vertical: 32px, horizontal: 16px
  <Container>...</Container>
</Box>
```

---

## Чеклист Design System Аудита

### Критичные (MUST) ⚠️

- [ ] **Semantic tokens для фонов и текста** (bg.surface, fg.default, etc.)
- [ ] Dark mode работает корректно на ВСЕХ компонентах
- [ ] Нет хардкода цветов (hex, rgb)
- [ ] colorPalette для интерактивных компонентов

### Важные (SHOULD)

- [ ] Spacing кратен базовому шагу (4px)
- [ ] Typography соответствует scale
- [ ] Консистентные variants компонентов
- [ ] Единообразные размеры иконок

### Рекомендуемые (COULD)

- [ ] Тени из token system
- [ ] Документированные кастомные токены
- [ ] Slot recipes для compound components
