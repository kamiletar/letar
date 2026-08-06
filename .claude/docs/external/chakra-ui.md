# Chakra UI v3 — Документация

> Версия: v3.34+ (актуально на 2026)\
> Пакет: `@chakra-ui/react`\
> Docs: https://chakra-ui.com/docs/components/concepts/overview

## Ключевые концепции

### Provider

```tsx
// app/providers.tsx
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'

export function Providers({ children }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
}
```

В letar используется `@letar/chakra-provider` — обёртка с кастомной темой.

### Composition API

```tsx
// Все компоненты поддерживают as prop
<Box as="section" p={4} />

// recipe / variant через cva
const button = cva({ base: '...', variants: { ... } })
```

### Color Mode

```tsx
import { useColorMode, useColorModeValue } from '@chakra-ui/react'

const { colorMode, toggleColorMode } = useColorMode()
const bg = useColorModeValue('white', 'gray.800')
```

---

## Все компоненты v3

### Layout

| Компонент             | Описание                    | Import             |
| --------------------- | --------------------------- | ------------------ |
| `Box`                 | Базовый div                 | `@chakra-ui/react` |
| `Stack`               | VStack / HStack / Stack     | `@chakra-ui/react` |
| `Flex`                | Flexbox контейнер           | `@chakra-ui/react` |
| `Grid` / `SimpleGrid` | CSS Grid                    | `@chakra-ui/react` |
| `Container`           | Контейнер с max-width       | `@chakra-ui/react` |
| `Center`              | Центрирование               | `@chakra-ui/react` |
| `Wrap`                | Flex wrap                   | `@chakra-ui/react` |
| `Group`               | Группировка компонентов     | `@chakra-ui/react` |
| `Separator`           | Разделитель (Divider)       | `@chakra-ui/react` |
| `Splitter`            | Resizable панели            | `@chakra-ui/react` |
| `Scroll Area`         | Кастомный скроллбар         | `@chakra-ui/react` |
| `Float`               | Floating элемент            | `@chakra-ui/react` |
| `Bleed`               | Выход за пределы контейнера | `@chakra-ui/react` |

### Типографика

| Компонент    | Описание             |
| ------------ | -------------------- |
| `Text`       | Текст                |
| `Heading`    | Заголовки h1-h6      |
| `Link`       | Ссылка               |
| `Code`       | Inline код           |
| `Kbd`        | Клавиша клавиатуры   |
| `Blockquote` | Цитата               |
| `Highlight`  | Выделение текста     |
| `Mark`       | Маркер текста        |
| `Em`         | Курсив               |
| `Prose`      | Блок длинного текста |

### Кнопки

| Компонент     | Описание         |
| ------------- | ---------------- |
| `Button`      | Кнопка           |
| `IconButton`  | Кнопка с иконкой |
| `CloseButton` | Кнопка закрытия  |

### Формы

| Компонент                   | Описание                   |
| --------------------------- | -------------------------- |
| `Input`                     | Текстовый ввод             |
| `Textarea`                  | Многострочный текст        |
| `Select` (Native)           | Нативный select            |
| `Checkbox` / `CheckboxCard` | Чекбокс / Карточка-чекбокс |
| `Radio` / `RadioCard`       | Радиокнопка / Карточка     |
| `Switch`                    | Переключатель              |
| `Slider`                    | Ползунок                   |
| `NumberInput`               | Числовой ввод со стрелками |
| `PasswordInput`             | Пароль с toggle            |
| `PinInput`                  | PIN/OTP код                |
| `TagsInput`                 | Ввод тегов                 |
| `Editable`                  | Inline редактирование      |
| `Rating`                    | Рейтинг (звёзды)           |
| `ColorPicker`               | Выбор цвета                |
| `FileUpload`                | Загрузка файлов            |
| `Field`                     | Обёртка поля с label/error |
| `Fieldset`                  | Группа полей               |
| `SegmentedControl`          | Segmented control          |
| `ColorSwatch`               | Образец цвета              |

### Выбор из списка (Collections)

| Компонент  | Описание                |
| ---------- | ----------------------- |
| `Select`   | Styled select с popover |
| `Combobox` | Searchable select       |
| `Listbox`  | Список с выбором        |
| `TreeView` | Дерево                  |

### Дата и время

| Компонент    | Описание   |
| ------------ | ---------- |
| `DatePicker` | Выбор даты |
| `Calendar`   | Календарь  |

### Оверлеи

| Компонент         | Описание                        |
| ----------------- | ------------------------------- |
| `Dialog`          | Модальное окно (заменяет Modal) |
| `Drawer`          | Боковая панель                  |
| `Popover`         | Всплывающая панель              |
| `Tooltip`         | Тултип                          |
| `Menu`            | Выпадающее меню                 |
| `HoverCard`       | Карточка при наведении          |
| `ActionBar`       | Плавающая панель действий       |
| `Overlay Manager` | Управление оверлеями            |

### Индикаторы

| Компонент                   | Описание          |
| --------------------------- | ----------------- |
| `Spinner`                   | Загрузчик         |
| `Skeleton` / `SkeletonText` | Skeleton loading  |
| `Progress`                  | Прогресс-бар      |
| `ProgressCircle`            | Круговой прогресс |
| `Meter`                     | Измеритель        |
| `Steps`                     | Шаги/визард       |
| `Timeline`                  | Таймлайн          |
| `Badge`                     | Бейдж             |
| `Status`                    | Статус-индикатор  |

### Уведомления

| Компонент           | Описание       |
| ------------------- | -------------- |
| `Toast` / `Toaster` | Уведомления    |
| `Alert`             | Предупреждение |

### Медиа

| Компонент | Описание            |
| --------- | ------------------- |
| `Avatar`  | Аватар пользователя |
| `Image`   | Изображение         |
| `Icon`    | Иконка              |

### Навигация

| Компонент     | Описание                 |
| ------------- | ------------------------ |
| `Tabs`        | Вкладки                  |
| `Breadcrumb`  | Хлебные крошки           |
| `Pagination`  | Пагинация                |
| `SkipNavLink` | Пропуск навигации (a11y) |

### Данные

| Компонент    | Описание         |
| ------------ | ---------------- |
| `Table`      | Таблица          |
| `Card`       | Карточка         |
| `Stat`       | Статистика       |
| `DataList`   | Список данных    |
| `EmptyState` | Пустое состояние |

### Прочее

| Компонент      | Описание                 |
| -------------- | ------------------------ |
| `Accordion`    | Аккордеон                |
| `Collapsible`  | Сворачиваемый блок       |
| `Clipboard`    | Копирование в буфер      |
| `QrCode`       | QR-код                   |
| `NativeSelect` | Нативный select          |
| `AspectRatio`  | Контейнер с aspect ratio |

---

## Примеры использования

### Button

```tsx
import { Button } from '@chakra-ui/react'

<Button colorPalette="blue" size="md" variant="solid">
  Сохранить
</Button>

<Button variant="outline" loading={isLoading}>
  Загрузка
</Button>
```

### Dialog (Modal)

```tsx
import { Button, Dialog, Portal } from '@chakra-ui/react'
<Dialog.Root>
  <Dialog.Trigger asChild>
    <Button>Открыть</Button>
  </Dialog.Trigger>
  <Portal>
    <Dialog.Backdrop />
    <Dialog.Positioner>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Заголовок</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>Содержимое</Dialog.Body>
        <Dialog.Footer>
          <Dialog.ActionTrigger asChild>
            <Button variant="outline">Отмена</Button>
          </Dialog.ActionTrigger>
          <Button>Подтвердить</Button>
        </Dialog.Footer>
        <Dialog.CloseTrigger />
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>
```

### Toaster

```tsx
import { Toaster, toaster } from '@/components/ui/toaster' // В layout
<Toaster />

// Везде
toaster.success({ title: 'Сохранено!', description: 'Данные обновлены' })
toaster.error({ title: 'Ошибка', description: err.message })
```

### Select

```tsx
import { createListCollection, Select } from '@chakra-ui/react'

const options = createListCollection({
  items: [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
  ],
})

<Select.Root collection={options} onValueChange={({ value }) => setValue(value[0])}>
  <Select.Trigger>
    <Select.ValueText placeholder="Выберите..." />
  </Select.Trigger>
  <Select.Content>
    {options.items.map((item) => (
      <Select.Item key={item.value} item={item}>
        {item.label}
      </Select.Item>
    ))}
  </Select.Content>
</Select.Root>
```

### Stack / HStack / VStack

```tsx
import { HStack, Stack, VStack } from '@chakra-ui/react'

<VStack gap={4} align="stretch">
  <Box>Элемент 1</Box>
  <Box>Элемент 2</Box>
</VStack>

<HStack gap={2} justify="space-between">
  <Box>Левый</Box>
  <Box>Правый</Box>
</HStack>
```

---

## Theming (v3)

```typescript
import { createSystem, defaultConfig } from '@chakra-ui/react'

const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#f0fdf4' },
          500: { value: '#22c55e' },
          900: { value: '#14532d' },
        },
      },
    },
    semanticTokens: {
      colors: {
        'chakra-body-bg': {
          value: { _light: 'white', _dark: 'gray.900' },
        },
      },
    },
  },
})
```

## Важные изменения v3 vs v2

| v2                 | v3                                   |
| ------------------ | ------------------------------------ |
| `<Modal>`          | `<Dialog>`                           |
| `<ModalOverlay>`   | `<Dialog.Backdrop>`                  |
| `useDisclosure()`  | `useState` или `Dialog.Root open={}` |
| `colorScheme` prop | `colorPalette` prop                  |
| `spacing` tokens   | `gap` / `p` / `m` с числами          |
| `<Stack isInline>` | `<HStack>`                           |

## Ссылки

- Docs: https://chakra-ui.com/docs/components/concepts/overview
- Component list: https://chakra-ui.com/docs/components/button
- llms.txt: https://chakra-ui.com/llms.txt
- llms-full: https://chakra-ui.com/llms-full.txt
- GitHub: https://github.com/chakra-ui/chakra-ui
