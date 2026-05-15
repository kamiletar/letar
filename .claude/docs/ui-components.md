# UI компоненты и Chakra UI v3

## Тема Chakra UI v3

Приложение использует кастомную систему Chakra UI v3, определённую в `apps/premium-rosstil/src/app/_components/theme-provider.tsx`:

- **Паттерн Theme Provider:** Создаёт кастомную систему через `createSystem(defaultConfig, config)` с шрифтами, переданными как пропсы
- **Токены шрифтов:** Шрифты heading, text и body динамически устанавливаются из объектов Next.js font
- **Кастомные рецепты:** Определяет рецепт `heading` (uppercase, bold) и рецепт `link` (plain вариант с fg цветом)
- **Кастомная цветовая палитра `fg`:** Полная палитра с оттенками 50-950, базовый цвет `fg.500` = `#CA9E67` (золотой/бронзовый)
- **Семантические токены:** Кастомный цвет `fg` (`#CA9E67` - золотой/бронзовый) для светлой и тёмной тем
- **Клиентский компонент:** ThemeProvider помечен `'use client'` и использует `useMemo` для создания системы

Библиотека `@letar/chakra-provider` экспортирует `RootChakraProvider`, который оборачивает провайдер Chakra с value prop для кастомной системы.

## ⚠️ КРИТИЧНО - Предотвращение FOUC (мигание темы)

При использовании тёмной темы с `next-themes` может возникать **Flash of Unstyled Content (FOUC)** — мигание светлого фона при загрузке страницы с тёмной системной темой.

### Причина проблемы

`globalCss` в Chakra theme применяется через JS **после hydration** — слишком поздно. Пользователь видит белый фон до загрузки React.

### Решение

**1. НЕ используй `globalCss` для background в theme.ts:**

```typescript
// ❌ НЕПРАВИЛЬНО — применяется через JS слишком поздно
const config = defineConfig({
  globalCss: {
    body: {
      bg: 'bg.canvas',
      color: 'fg',
    },
  },
})
```

**2. Используй чистый CSS в `global.css`:**

```css
/* Светлая тема по умолчанию */
html {
  background-color: #f7fafc;
  color: #171923;
}

body {
  background-color: inherit;
  color: inherit;
}

/* Системная тёмная тема */
@media (prefers-color-scheme: dark) {
  html:not(.light) {
    background-color: #111111;
    color: #f7fafc;
  }
}

/* Явно установленная тёмная тема через next-themes */
html.dark {
  color-scheme: dark;
  background-color: #111111;
  color: #f7fafc;
}

/* Явно установленная светлая тема */
html.light {
  color-scheme: light;
  background-color: #f7fafc;
  color: #171923;
}
```

**3. Импортируй `global.css` в `layout.tsx`:**

```typescript
import './global.css'
```

### Как это работает

1. HTML загружается
2. CSS из `global.css` сразу применяет фон через `prefers-color-scheme`
3. `next-themes` инжектирует блокирующий скрипт и добавляет класс `.dark`/`.light`
4. CSS обновляется на основе класса — никакого мигания!

### Эталонная реализация

- `apps/mandala/src/app/global.css` — CSS стили для темы
- `apps/mandala/src/app/theme.ts` — тема БЕЗ globalCss для body
- `apps/driving-school/` — аналогичный подход

## ⚠️ ВАЖНО - Использование фирменного цвета

**Цвет по умолчанию для ВСЕХ кнопок:** ВСЕГДА используй `colorPalette="fg"` вместо `colorPalette="blue"`

- **Кнопки основного действия:** `colorPalette="fg"` (solid вариант)
- **Вторичные кнопки:** `colorPalette="fg"` + `variant="outline"` или `variant="ghost"`
- Примеры: кнопки отправки в формах, кнопки основного действия, кнопки редактирования, навигационные кнопки
- ❌ НЕ используй `colorPalette="blue"` - это устарело
- ✅ Используй `colorPalette="fg"` - фирменный золотой цвет `#CA9E67`
- Все оттенки доступны: `bg="fg.100"`, `color="fg.700"`, `borderColor="fg.500"` и т.д.

## ⚠️ КРИТИЧНО - Путь импорта Toaster

**Toaster** для уведомлений:

- ✅ **ПРАВИЛЬНО:** `import { toaster } from '@/app/_components/ui/toaster'`
- ❌ **НЕПРАВИЛЬНО:** `import { toaster } from '@/components/ui/toaster'` - путь не существует!

**Использование:**

```typescript
import { toaster } from '@/app/_components/ui/toaster'

toaster.success({ title: 'Успех', description: 'Операция выполнена' })
toaster.error({ title: 'Ошибка', description: 'Что-то пошло не так' })
```

## Паттерны компонентов Chakra UI v3

### ⚠️ КРИТИЧНО - Структура overlay компонентов

Chakra UI v3 использует составные компоненты с **синтаксисом через точку** и **обязательной обёрткой Portal + Positioner**.

#### 1. Синтаксис через точку

**❌ НЕПРАВИЛЬНО - отдельные импорты:**

```typescript
import { DialogContent, DialogRoot, DialogTrigger } from '@chakra-ui/react'

<DialogRoot>
  <DialogTrigger>...</DialogTrigger>
</DialogRoot>
```

**✅ ПРАВИЛЬНО - базовый компонент + синтаксис через точку:**

```tsx
import { Dialog, Portal } from '@chakra-ui/react'
;<Dialog.Root>
  <Dialog.Trigger>...</Dialog.Trigger>
</Dialog.Root>
```

#### 2. Обязательная структура: Portal + Positioner

Для **всех overlay компонентов** (Dialog, Popover, Menu, Drawer, Select) обёртка обязательна:

```tsx
<Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
  <Dialog.Trigger asChild>
    <Button>Открыть</Button>
  </Dialog.Trigger>

  {/* ⚠️ ОБЯЗАТЕЛЬНО! Portal для рендеринга поверх всего контента */}
  <Portal>
    {/* ⚠️ ОБЯЗАТЕЛЬНО! Positioner для правильного позиционирования */}
    <Dialog.Positioner>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Заголовок</Dialog.Title>
        </Dialog.Header>

        <Dialog.Body>{/* Контент */}</Dialog.Body>

        <Dialog.Footer>
          <Dialog.ActionTrigger asChild>
            <Button>Закрыть</Button>
          </Dialog.ActionTrigger>
          <Button colorPalette="fg">Действие</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>
```

#### 3. Компоненты, требующие Portal + Positioner

Применяй эту структуру к:

- **Dialog** - модальные окна
- **Popover** - всплывающие подсказки
- **Menu** - выпадающие меню
- **Drawer** - боковые панели
- **Select** - выпадающие списки (см. `gender-select.tsx` как пример)
- **Tooltip** - подсказки

#### 4. Эталонные примеры в кодовой базе

**Правильная реализация:**

- `apps/premium-rosstil/src/app/admin/test-models/_components/gender-select.tsx` - Select с useControl
- `apps/premium-rosstil/src/app/admin/sizes/[id]/edit/_components/delete-size-button.tsx` - Dialog (коммит f90c7d5f)

**Ключевые правила:**

1. **Всегда** импортируй базовый компонент (`Dialog`, `Select`, `Menu`), не части
2. **Всегда** используй синтаксис через точку (`Dialog.Root`, `Dialog.Trigger`)
3. **Всегда** оборачивай контент в `<Portal><Component.Positioner>`
4. **Никогда** не забывай Portal и Positioner - компонент не будет работать правильно без них

## Соглашения по компонентам

Компоненты следуют соглашениям Next.js App Router:

- Приватные компоненты в директориях `_components/` (не роуты)
- Компоненты для конкретных роутов в поддиректориях роутов (напр., `app/about/_components/`)
- Иконки организованы в поддиректориях `_icons/`
- Изображения организованы в директориях `_images/`
- Состояния загрузки через файлы `loading.tsx`
- Обёртки layout через файлы `layout.tsx`

## Ролевой условный рендеринг

**ВАЖНО:** Всегда используй компонент `<OnlyFor>` для ролевого условного рендеринга в клиентских компонентах.

Компонент `OnlyFor` находится в `apps/premium-rosstil/src/app/_components/only-for.tsx` и обеспечивает типобезопасный ролевой контроль доступа.

**Когда использовать:**

- ЛЮБОЙ раз, когда нужно условно отображать UI на основе статуса аутентификации или роли пользователя
- Скрытие/показ функций только для админов
- Отображение контента только для авторизованных пользователей
- Показ подсказок входа для неавторизованных пользователей

**НЕ ДЕЛАЙ:**

- Ручные проверки `session?.user` или `session?.user.role` в компонентах
- Использование `useSession()` только для проверки ролей или статуса аутентификации
- Дублирование логики проверки ролей по компонентам

**Поддерживаемые роли:**

- `UserRole.USER` или `'USER'` - Авторизованный пользователь с ролью USER
- `UserRole.ADMIN` или `'ADMIN'` - Авторизованный пользователь с ролью ADMIN
- `'UNAUTHORIZED'` - Неавторизованный пользователь (специальный ключ, не в Prisma enum)
- Массив ролей: `['USER', 'ADMIN']` - Несколько ролей разрешены

**Примеры:**

```tsx
import { OnlyFor } from './_components/only-for';

// Показать только админам
<OnlyFor role="ADMIN">
  <AdminPanel />
</OnlyFor>

// Показать всем авторизованным пользователям
<OnlyFor role={['USER', 'ADMIN']}>
  <UserContent />
</OnlyFor>

// Показать только неавторизованным пользователям
<OnlyFor role="UNAUTHORIZED">
  <SignInButton />
</OnlyFor>
```

**Уже интегрировано в:**

- `auth-button.tsx` - Кнопка входа для неавторизованных пользователей
- `user-menu.tsx` - Пункт меню админа
- `mobile-menu.tsx` - Секция профиля и ссылка на админку

**Примечание:** Серверная защита роутов обрабатывается отдельно через `src/proxy.ts` и должна оставаться неизменной. Компонент `OnlyFor` предназначен только для рендеринга UI.

## ⚠️ КРИТИЧНО - Паттерн Button + Link (asChild)

**При создании Button, который ведёт по ссылке, ВСЕГДА используй паттерн `asChild`:**

**✅ ПРАВИЛЬНО - Button с asChild:**

```tsx
import { Button } from '@chakra-ui/react'
import Link from 'next/link'
;<Button asChild colorPalette="fg" size="lg">
  <Link href="/auth/signin">Войти</Link>
</Button>
```

**❌ НЕПРАВИЛЬНО - Link оборачивает Button:**

```tsx
<Link href="/auth/signin">
  <Button colorPalette="fg" size="lg">
    Войти
  </Button>
</Link>
```

**❌ НЕПРАВИЛЬНО - Button оборачивает Link (без asChild):**

```tsx
<Button colorPalette="fg" size="lg">
  <Link href="/auth/signin">Войти</Link>
</Button>
```

**Зачем `asChild`?**

- Проп `asChild` указывает Chakra объединить стили и поведение Button с дочерним элементом
- Это создаёт правильную семантическую HTML разметку (тег `<a>` со стилями кнопки)
- Без `asChild` получаются вложенные элементы, что некорректно для HTML структуры

**Эталонные примеры в кодовой базе:**

- `apps/premium-rosstil/src/app/admin/error.tsx`
- `apps/premium-rosstil/src/app/admin/admin-dashboard-client.tsx`
- `apps/premium-rosstil/src/app/not-found.tsx`

## ⚠️ КРИТИЧНО - Изменения API Chakra UI v3

### colorScheme → colorPalette

**❌ НЕПРАВИЛЬНО (Chakra v2):**

```tsx
<Button colorScheme="blue">Отправить</Button>
```

**✅ ПРАВИЛЬНО (Chakra v3):**

```tsx
<Button colorPalette="fg">Отправить</Button>
```

### leftIcon/rightIcon удалены

**❌ НЕПРАВИЛЬНО (Chakra v2):**

```tsx
<Button leftIcon={<FaPlus />}>Добавить</Button>
<Button rightIcon={<FaArrowRight />}>Далее</Button>
```

**✅ ПРАВИЛЬНО (Chakra v3) - иконки как children:**

```tsx
<Button><FaPlus /> Добавить</Button>
<Button>Далее <FaArrowRight /></Button>
```

## Полные правила Chakra UI v3

### Источники импортов

**Из `@chakra-ui/react`:**

- Layout: Box, Flex, Grid, Stack, HStack, VStack, Container, Center, SimpleGrid
- Typography: Text, Heading, Link, Code
- Forms: Input, Textarea, Field, Fieldset, NativeSelect
- Feedback: Alert, Spinner, Skeleton
- Data Display: Badge, Card, Table, Avatar, Separator
- Navigation: Breadcrumb, Tabs
- Overlay: Dialog, Drawer, Menu, Popover, Tooltip

**Из `@/app/_components/ui/`:**

- `toaster` - Toast уведомления
- `provider` - Theme provider

### Изменения имён пропсов (v2 → v3)

| Старое (v2)              | Новое (v3)                              |
| ------------------------ | --------------------------------------- |
| `isOpen`                 | `open`                                  |
| `onClose`                | `onOpenChange={(e) => setOpen(e.open)}` |
| `isDisabled`             | `disabled`                              |
| `isInvalid`              | `invalid`                               |
| `isLoading`              | `loading`                               |
| `isReadOnly`             | `readOnly`                              |
| `colorScheme`            | `colorPalette`                          |
| `spacing`                | `gap`                                   |
| `noOfLines`              | `lineClamp`                             |
| `leftIcon` / `rightIcon` | Размещай иконки как children            |

### Изменения структуры компонентов

**Toast (v3):**

```tsx
import { toaster } from '@/app/_components/ui/toaster'

toaster.create({
  title: 'Успех',
  description: 'Операция выполнена',
  type: 'success', // не 'status'
})
```

**Dialog/Modal (v3):**

```tsx
<Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
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
        <Dialog.Body>Контент</Dialog.Body>
        <Dialog.Footer>Действия</Dialog.Footer>
        <Dialog.CloseTrigger asChild>
          <CloseButton />
        </Dialog.CloseTrigger>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>
```

**Table (v3):**

```tsx
<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.ColumnHeader>Название</Table.ColumnHeader>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>Значение</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table.Root>
```

**Tabs (v3):**

```tsx
<Tabs.Root defaultValue="tab1">
  <Tabs.List>
    <Tabs.Trigger value="tab1">Вкладка 1</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Вкладка 2</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1">Контент 1</Tabs.Content>
  <Tabs.Content value="tab2">Контент 2</Tabs.Content>
</Tabs.Root>
```

**Button с иконкой (v3):**

```tsx
// ❌ Неправильно
<Button leftIcon={<FaPlus />}>Добавить</Button>

// ✅ Правильно
<Button><FaPlus /> Добавить</Button>
```

### Удалённые/изменённые функции

- **@chakra-ui/icons** - используй `react-icons` или `lucide-react`
- **@emotion/styled** - не нужен в v3
- **framer-motion** - опционально, Chakra имеет встроенные анимации
- **@chakra-ui/next-js** - используй проп `asChild` вместо этого

## Интеграция шрифтов Next.js

Используем Next.js Google Fonts с переменными шрифтами:

```tsx
import { Cormorant_Garamond, Tenor_Sans } from 'next/font/google'

const headingFont = Cormorant_Garamond({
  weight: ['300', '400', '600', '700'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-heading',
})

const bodyFont = Tenor_Sans({
  weight: '400',
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body',
})
```

Эти шрифты интегрированы в нашу тему Chakra UI через ThemeProvider.
