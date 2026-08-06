# Touch-Friendly UI

Touch targets, accessibility и UX паттерны для мобильных устройств.

## Минимальные размеры touch targets

| Платформа       | Минимум  | Рекомендуется |
| --------------- | -------- | ------------- |
| Apple HIG       | 44×44 pt | 44×44 pt      |
| Material Design | 48×48 dp | 48×48 dp      |
| WCAG 2.2 (AAA)  | 44×44 px | 44×44 px      |
| WCAG 2.2 (AA)   | 24×24 px | 44×44 px      |

> **Правило:** Минимум **44×44 пикселей** для всех интерактивных элементов на мобильных.

---

## Chakra UI размеры кнопок

| Size | Высота | Touch-friendly              |
| ---- | ------ | --------------------------- |
| `xs` | 24px   | ❌ Слишком мало             |
| `sm` | 32px   | ⚠️ Только desktop            |
| `md` | 40px   | ✅ Почти OK                 |
| `lg` | 48px   | ✅ Рекомендуется для mobile |

### Адаптивный размер кнопок

```tsx
// Большие кнопки на mobile, меньше на desktop
<Button size={{ base: 'lg', md: 'md' }}>Кнопка</Button>

// IconButton с гарантированным минимумом
<IconButton
  minH="44px"
  minW="44px"
  aria-label="Действие"
>
  <LuPlus />
</IconButton>

// Или через size
<IconButton size="lg" aria-label="Действие">
  <LuPlus />
</IconButton>
```

---

## Spacing между touch targets

```tsx
// Достаточный gap между кнопками
<HStack gap={3}>  {/* 12px gap */}
  <Button>Отмена</Button>
  <Button colorPalette="fg">Подтвердить</Button>
</HStack>

// В вертикальном стеке
<VStack gap={2}>  {/* 8px gap */}
  <Button w="full">Вариант 1</Button>
  <Button w="full">Вариант 2</Button>
</VStack>
```

> **Правило:** Минимум 8px между интерактивными элементами для предотвращения mis-taps.

---

## Thumb Zone

Зоны досягаемости при одноручном использовании:

```
┌─────────────────────────┐
│      Hard to reach      │  ← Логотип, статус, info
│     (верх экрана)       │
├─────────────────────────┤
│                         │
│     OK reach zone       │  ← Основной контент
│      (середина)         │
│                         │
├─────────────────────────┤
│     Easy reach zone     │  ← Навигация, CTA кнопки
│    (Thumb friendly)     │  ← Важные действия здесь!
└─────────────────────────┘
```

### Рекомендации

1. **CTA кнопки** — размещай внизу экрана
2. **Навигация** — Bottom Navigation для часто используемых
3. **Формы** — кнопка Submit внизу формы
4. **Модалки** — кнопки действий внизу

```tsx
// Sticky footer с CTA
<Box position="sticky" bottom={0} bg="bg" p={4} borderTopWidth="1px">
  <Button w="full" size="lg" colorPalette="fg">
    Оформить заказ
  </Button>
</Box>
```

---

## Accessibility

### aria-label для icon-only кнопок

```tsx
// ✅ Правильно — есть aria-label
<IconButton aria-label="Удалить товар">
  <LuTrash />
</IconButton>

// ❌ Неправильно — screen reader не поймёт
<IconButton>
  <LuTrash />
</IconButton>
```

### Видимый focus

```tsx
// Chakra автоматически добавляет focus ring
<Button>Кнопка</Button>

// Кастомный focus для высокого контраста
<Button
  _focus={{
    outline: '2px solid',
    outlineColor: 'fg.500',
    outlineOffset: '2px',
  }}
>
  Кнопка
</Button>
```

### Минимальный контраст текста

- **Обычный текст:** контраст 4.5:1
- **Крупный текст (18px+):** контраст 3:1
- **UI компоненты:** контраст 3:1

```tsx
// Избегай слишком светлого текста
<Text color="gray.400">Плохо</Text>  // ❌ Может быть низкий контраст
<Text color="fg.muted">Лучше</Text>  // ✅ Семантический токен
```

### Reduce Motion

```tsx
// Уважай prefers-reduced-motion
<Box
  transition="transform 0.2s"
  _hover={{ transform: 'scale(1.05)' }}
  _motionReduce={{ transition: 'none' }} // Отключить для reduce motion
>
  Карточка
</Box>
```

---

## Form элементы на mobile

### Input с достаточным размером

```tsx
// Минимальная высота для комфортного ввода
<Input
  size={{ base: 'lg', md: 'md' }}
  fontSize={{ base: '16px', md: '14px' }} // 16px предотвращает zoom на iOS
/>
```

> **iOS Safari:** Если font-size меньше 16px, браузер автоматически зумит при focus на input.

### Keyboard types

```tsx
// Оптимизированные клавиатуры
<Input type="email" inputMode="email" />      // @ и .com на клавиатуре
<Input type="tel" inputMode="tel" />          // Цифры
<Input type="number" inputMode="numeric" />    // Цифры
<Input inputMode="search" />                   // Кнопка Search
<Input inputMode="url" />                      // / и .com
```

### Autocomplete

```tsx
// Помоги автозаполнению
<Input name="email" autoComplete="email" />
<Input name="tel" autoComplete="tel" />
<Input name="given-name" autoComplete="given-name" />
<Input name="family-name" autoComplete="family-name" />
<Input name="street-address" autoComplete="street-address" />
```

---

## Gestures

### Swipe to delete / action

```tsx
// Swipe actions обычно реализуются через библиотеки
// Chakra не имеет встроенной поддержки

// Альтернатива — видимые кнопки действий
<HStack justify="space-between">
  <Text>{item.name}</Text>
  <IconButton aria-label="Удалить" colorPalette="red" size="sm">
    <LuTrash />
  </IconButton>
</HStack>
```

### Pull to refresh

```tsx
// Используй native browser behavior или библиотеки
// Next.js App Router автоматически обновляет при pull-to-refresh
```

---

## Пример: Touch-friendly карточка

```tsx
// Файл: apps/driving-school/src/app/(instructor)/students/_components/student-card.tsx
<Card.Root p={4}>
  <HStack justify="space-between">
    <HStack gap={3}>
      <Avatar size="md" name={student.name} /> {/* Достаточный размер */}
      <Stack gap={0}>
        <Text fontWeight="medium">{student.name}</Text>
        <Text fontSize="sm" color="fg.muted">
          {student.phone}
        </Text>
      </Stack>
    </HStack>

    {/* Menu с достаточным touch target */}
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconButton
          variant="ghost"
          aria-label="Действия"
          minH="44px" // Гарантированный touch target
          minW="44px"
        >
          <LuMoreVertical />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="edit">Редактировать</Menu.Item>
            <Menu.Item value="delete" color="red.500">
              Удалить
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  </HStack>

  {/* Кнопки действий с достаточным размером */}
  <HStack mt={4} gap={2}>
    <Button flex={1} variant="outline" size="lg">
      Позвонить
    </Button>
    <Button flex={1} colorPalette="fg" size="lg">
      Записать
    </Button>
  </HStack>
</Card.Root>
```

---

## См. также

- [navigation.md](navigation.md) — Bottom Navigation
- [testing.md](testing.md) — Тестирование touch targets
