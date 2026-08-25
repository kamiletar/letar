# UI компоненты и Chakra UI v3

## Тема Chakra UI v3

Приложение использует кастомную систему Chakra UI v3, определённую в `apps/kami/src/app/_components/theme-provider.tsx`:

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

⚠️ **Проверено 2026-08-12 — шаг 2 и обе ссылки ниже больше не соответствуют коду.**
`apps/mandala/src/app/global.css` физически не существует (весь `apps/mandala/src` — ни
одного файла с `prefers-color-scheme`, только `_components/transition.css`, к теме не
относящийся). `apps/driving-school/src/app/global.css` существует, но не про это: только
`font-family` и мобильный паддинг под `BottomNav`, никаких `.dark`/`.light`-правил. Комментарий в
`apps/mandala/src/app/theme.ts` («globalCss удалён... стили body заданы в global.css через
.dark/.light классы») утверждает то же самое и тоже не соответствует файлам на диске — расхождение
не только в доке.

**Проверено живым прогоном (2026-08-12, `nx dev mandala`, dark color scheme):** CSS-слой из
шага 2 действительно не нужен — не регресс. Серверный HTML отдаёт `<html>` без класса; первый
`<script>` внутри `<body>` — буквально скрипт `next-themes` (сигнатура
`document.documentElement`, массив `["light","dark"]`), то есть выполняется синхронно при парсинге
HTML, **до** первой отрисовки остального `<body>`. `document.documentElement.className` после
загрузки — `"dark"`, тема отрисована верно. Значит актуальный механизм — только блокирующий
скрипт `next-themes` (шаг 3) + `suppressHydrationWarning` на `<html>` в `layout.tsx`; отдельный
CSS-файл был мёртвым кодом ко времени его удаления, и шаги 1-2 выше можно считать историческими,
а не текущим описанием. Комментарий в `theme.ts` и обе ссылки на `global.css` стоит поправить при
следующей правке этого раздела — не сделала здесь, чтобы не путать «уже проверено» с
«переписано».

### ⚠️ Консольное предупреждение «Encountered a script tag» — безвредно, не баг

Именно этот блокирующий скрипт из п.3 выше — `next-themes` рендерит его как литеральный
`<script>`-элемент через `React.createElement`, а не через `next/script`. React 19 ругается на
это в dev-консоли: «Encountered a script tag while rendering React component. Scripts inside
React components are never executed when rendering on the client.»

Предупреждение **сайт-wide** — воспроизводится на любой странице любого приложения с
`ColorModeProvider` (проверено на auth-hub: `/` и `/sign-in`, 2026-07-30), не специфично для
конкретной страницы или компонента. Функциональность не страдает: скрипт всё равно выполняется
при первичном SSR-рендере до гидрации (в этом и весь смысл — успеть проставить `.dark`/`.light`
до первой отрисовки), а сама React-гидрация проходит штатно.

**Не переводить на `next/script`** — его стратегии (`lazyOnload`, `afterInteractive` и т.п.)
не гарантируют выполнение до первой отрисовки, а это ломает саму защиту от FOUC, ради которой
скрипт существует. Это ограничение самой `next-themes` при React 19 (issue есть в апстриме),
чинить на стороне letar нечего — можно только подавить предупреждение переопределением
`console.error` в дев-тулинге, если оно мешает автоматизации/e2e.

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
<Dialog.Root>
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

- `apps/driving-school/src/app/_components/vehicle-form-dialog.tsx` - Dialog с `Portal` +
  `Dialog.Positioner`, `Dialog.CloseTrigger asChild`
- `apps/dsperevod/src/app/(admin)/admin/users/_components/user-role-selector.tsx` - управляемый
  Select (`NativeSelect.Root`/`NativeSelect.Field`, значение из пропа, `onChange` triggers Server
  Action через `useTransition`)

⚠️ Пример именно с хуком `useControllableState` (внутреннее состояние Select с fallback на
внешний controlled-проп) в кодовой базе на 2026-08-12 не найден — `gender-select.tsx` из
удалённого `premium-rosstil` использовал именно этот хук, живой замены с идентичным паттерном
нет. Приведённый выше `user-role-selector.tsx` — просто controlled-компонент через `value`/
`onChange`, не эталон именно `useControllableState`.

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

Компонент `OnlyFor` находится в `apps/kami/src/app/_components/only-for.tsx` (аналог —
`apps/dashboard/src/app/_components/only-for.tsx`) и обеспечивает типобезопасный ролевой контроль доступа.

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
<Button asChild colorPalette="fg" size="lg">
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

- `apps/kami/src/app/[locale]/admin/error.tsx`
- `apps/kami/src/app/[locale]/error.tsx`

### ⚠️ `asChild` + условный рендер веток: не оборачивай альтернативы в `<>...</>`

Компонент с `asChild` (например `Card.Root asChild`) внутри себя вызывает `React.Children.only`
на единственном ожидаемом потомке-слоте. Если этот потомок (скажем, `NextLink`) в свою очередь
получает **разные наборы дочерних элементов** в зависимости от условия, соблазн — обернуть каждую
ветку тернарника в JSX-фрагмент:

```tsx
// ❌ Fragment как единственный children — ломает React.Children.only где-то выше по дереву
<NextLink href={href}>
  {condition
    ? (
      <>
        <AspectRatio>...</AspectRatio>
        <Card.Body>...</Card.Body>
      </>
    )
    : <Card.Body>...</Card.Body>}
</NextLink>
```

Такой код проходит `typecheck`/`lint`/`build` без единой ошибки — падает только в рантайме браузера
(`React.Children.only expected to receive a single React element child`), потому что Fragment
превращается в один React-элемент вместо плоского списка детей, который слот `asChild` ожидает
раскрыть до исходного количества.

**Фикс** — не оборачивать альтернативы в Fragment, а расставлять условный рендер как независимые
прямые дети родителя (`{cond && (...)}` рядом с обязательным элементом, а не единый тернарник с
Fragment по обеим веткам):

```tsx
// ✅ независимые прямые children, без общей обёртки
<NextLink href={href}>
  {condition && <AspectRatio>...</AspectRatio>}
  <Card.Body>...</Card.Body>
</NextLink>
```

Найдено в `apps/domwellbes/src/app/_components/catalog-card.tsx` (2026-08-09,
`PLAN_COMPLETED.md` соответствующая запись).

- `apps/kami/src/app/[locale]/not-found.tsx`

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

## Chakra UI v3 — Best Practices для новых приложений

> Добавлено по итогам Спринта 2 aprel8008 (2026-06). **Эталон:** `apps/driving-school/src/theme/` (16 файлов) и `apps/aprel8008/src/theme/`.

### Обязательная структура темы

Каждое новое приложение **ОБЯЗАНО** иметь:

```
src/theme/
├── index.ts                  — createSystem(defaultConfig, config)
├── tokens/
│   ├── colors.ts             — defineTokens.colors(...)
│   ├── typography.ts         — defineTokens.fonts({ heading, body })
│   └── index.ts              — реэкспорт
├── semanticTokens/
│   └── index.ts              — defineSemanticTokens.colors(...)
├── styles/
│   └── textStyles.ts         — именованные типографические стили
└── recipes/
    ├── button.ts             — defineRecipe для кнопок
    └── index.ts              — реэкспорт
```

### Шрифты: next/font → токены → globalCss

```ts
// 1. layout.tsx — подключение шрифтов
import { Cormorant_Garamond, Golos_Text } from 'next/font/google'

const heading = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-heading',
})
// Добавить className={`${heading.variable} ${body.variable}`} на <html>

// 2. theme/tokens/typography.ts
export const fonts = defineTokens.fonts({
  heading: { value: 'var(--font-heading), Georgia, serif' },
  body: { value: 'var(--font-body), system-ui, sans-serif' },
})

// 3. theme/index.ts — НЕ прописывать fontFamily вручную в globalCss.body
// Chakra использует токен fonts.body автоматически
```

### TextStyles — никаких инлайн fontSize

```ts
// ❌ ЗАПРЕЩЕНО — хардкодить размеры инлайн
<Heading fontSize={{ base: '2xl', md: '3xl' }} fontWeight="600">

// ✅ ПРАВИЛЬНО — именованные textStyles
<Heading textStyle="heading.section">

// Определяются в theme/styles/textStyles.ts:
export const textStyles = {
  'heading.hero':    { value: { fontSize: { base: '4xl', md: '6xl' }, fontWeight: '700', lineHeight: '1.1' } },
  'heading.section': { value: { fontSize: { base: '2xl', md: '3xl' }, fontWeight: '600', lineHeight: '1.3' } },
  'heading.card':    { value: { fontSize: 'xl', fontWeight: '600' } },
  'tagline':         { value: { fontSize: { base: 'xl', md: '2xl' }, fontStyle: 'italic' } },
  'body.lg':         { value: { fontSize: { base: 'lg', md: 'xl' }, lineHeight: '1.9' } },
  'body.md':         { value: { fontSize: 'md', lineHeight: '1.7' } },
}
```

### CTA-кнопки: recipe, не инлайн

```ts
// ❌ ЗАПРЕЩЕНО — инлайн стили для CTA
<Link bg="brand.500" color="white" px={8} py={4} ...>Написать</Link>

// ✅ ПРАВИЛЬНО — recipe variant
<Button variant="brand" size="lg" asChild>
  <a href="#contacts">Написать →</a>
</Button>

// Recipe определяется в theme/recipes/button.ts:
export const buttonRecipe = defineRecipe({
  base: { transition: 'all 0.15s ease-out', _active: { transform: 'scale(0.97)' } },
  variants: {
    variant: {
      brand: {
        bg: 'brand.500', color: 'white',
        _hover: { bg: 'brand.600', transform: 'translateY(-2px)', boxShadow: 'md' },
      },
    },
  },
})
```

### Мобильное меню: Drawer, не display:none

```tsx
// ❌ ЗАПРЕЩЕНО — прятать навигацию через display
<Flex display={{ base: 'none', md: 'flex' }}> {/* Единственная навигация */}

// ✅ ПРАВИЛЬНО — Drawer.Root для мобиля
// Десктопная навигация display={{ base: 'none', md: 'flex' }}
// Бургер display={{ base: 'flex', md: 'none' }} → открывает Drawer

// Структура Drawer (Chakra v3):
<Drawer.Root placement="end">
  <Drawer.Trigger asChild><IconButton .../></Drawer.Trigger>
  <Portal>
    <Drawer.Backdrop />
    <Drawer.Positioner>
      <Drawer.Content>
        {/* ссылки + CTA */}
        <Drawer.ActionTrigger asChild><Link href="#about">О нас</Link></Drawer.ActionTrigger>
        <Drawer.CloseTrigger asChild><IconButton .../></Drawer.CloseTrigger>
      </Drawer.Content>
    </Drawer.Positioner>
  </Portal>
</Drawer.Root>
```

### Breadcrumb — нативный компонент

```tsx
// ❌ ЗАПРЕЩЕНО — ручная реализация крошек
<Flex gap={2}><Link>Главная</Link><Text>→</Text><Text>Страница</Text></Flex>

// ✅ ПРАВИЛЬНО — Breadcrumb.Root
<Breadcrumb.Root size="sm">
  <Breadcrumb.List flexWrap="wrap">
    <Breadcrumb.Item>
      <Breadcrumb.Link asChild><NextLink href="/">Главная</NextLink></Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Separator />
    <Breadcrumb.Item>
      <Breadcrumb.CurrentLink>Текущая страница</Breadcrumb.CurrentLink>
    </Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb.Root>
```

### Разделители: Separator, не Box с borderTop

```tsx
// ❌ ЗАПРЕЩЕНО
<Box borderTop="1px solid" borderColor="border.DEFAULT" pt={4}>

// ✅ ПРАВИЛЬНО
<Separator mb={4} />
<Box pt={0}>
```

### ⛔ Запрет as= — распространяется на ВСЕ элементы

`as="span"`, `as="button"`, `as="a"`, `as="div"` — всё запрещено, не только `as="button"`:

```tsx
// ❌ ЗАПРЕЩЕНО — Box as="span" тоже нарушение
<Box as="span" display="inline-flex" bg="brand.500">← Все базы</Box>

// ✅ ПРАВИЛЬНО — Button с asChild
<Button variant="brand" asChild>
  <NextLink href="/#bazy">← Все базы</NextLink>
</Button>
```

## Компоненты галереи из `@letar/ui`

### `PhotoGallery` — сетка фото + лайтбокс

> Стандартный компонент для любой фото-галереи в монорепо. Реализован в `libs/ui/src/lib/photo-gallery.tsx`.

```tsx
import { PhotoGallery } from '@letar/ui'
<PhotoGallery
  photos={photos.map((p, i) => ({
    src: `/api/files/${slug}/${p.filename}`,
    alt: `${name} — фото ${i + 1}`,
  }))}
  columns={{ base: 2, sm: 3, md: 4 }} // default
  gap={3} // default
  aspectRatio={4 / 3} // default
  loading={isLoadingMore} // скелетоны при пагинации
  lightboxMaxWidth={1920} // default
  lightboxQuality={85} // default
/>
```

**Что делает внутри:**

- `next/image fill` в сетке — srcSet и ресайз на лету, кешируется Next.js
- При клике/Enter открывает `LightboxViewer` (yet-another-react-lightbox + Zoom + Fullscreen)
- Слайды лайтбокса через `nextImageUrl(src, 1920, 85)` — `/_next/image` API, кеш навсегда
- `role="button"` + `tabIndex={0}` + `_focusVisible` + `aria-label` на каждом фото
- Скелетоны при `loading=true` (пагинация) и `photos.length === 0`

**Эталонная реализация:** `apps/aprel8008` — `GalleryInfiniteScroll` поверх `PhotoGallery`.

**Подробнее о паттерне nextImageUrl:** [images.md](/.claude/docs/images.md#галереи-фотографий--паттерн-nextimageurl--photogallery)

### `LightboxViewer` — только лайтбокс

Когда нужен лайтбокс без сетки (например, кастомная сетка своя):

```tsx
import { LightboxViewer, type LightboxSlide } from '@letar/ui'

const slides: LightboxSlide[] = photos.map(p => ({
  src: nextImageUrl(p.src, 1920, 85),
  alt: p.alt,
}))

<LightboxViewer open={open} index={index} close={() => setOpen(false)} slides={slides} />
```

---

## Pressable-компоненты — тач-фидбек и ripple (`@letar/ui`)

**Версия:** `@letar/ui` ≥ 0.5.0

### Что экспортируется

```ts
import {
  ExternalLink, // IconButton asChild <a target="_blank"> — для соцсетей и внешних ссылок
  Pressable, // Box-обёртка: overflow hidden + data-pressable + ripple на мыши
  PressableButton, // Chakra Button + встроенный ripple (без asChild)
  pressableConfig, // { keyframes, globalCss } — мержится в defineConfig() каждого приложения
  RippleEl, // рендер одного ripple-круга
  useRipple, // хук: { onPointerDown, ripples } — для кастомных композиций
} from '@letar/ui'
```

### Принцип работы

- **Touch:** CSS spring-анимация через `[data-pressable]` — `scale(0.93)` при нажатии → spring overshoot при отпускании. Ноль JS.
- **Desktop:** position-aware ripple от точки клика через `useRipple` + GPU `transform`. Только при `pointerType === 'mouse'`.

### Подключение в приложении (два обязательных шага)

#### 1. Смержить `pressableConfig` в тему

```ts
// apps/<app>/src/theme/index.ts или theme-provider.tsx
import { pressableConfig } from '@letar/ui'

const config = defineConfig({
  globalCss: {
    ...pressableConfig.globalCss, // [data-pressable] spring + touch-action
    // ... ваши стили
  },
  theme: {
    keyframes: {
      ...pressableConfig.keyframes, // ripple-expand keyframe
      // ... ваши keyframes
    },
  },
})
```

#### 2. iOS-фикс в провайдере/layout (один раз)

```tsx
// Без этого :active не срабатывает на iOS Safari
useEffect(() => {
  document.addEventListener('touchstart', () => undefined, { passive: true })
}, [])
```

### Использование компонентов

#### `PressableButton` — кнопки с onClick

```tsx
<PressableButton variant="solid" colorPalette="blue" onClick={handleClick}>
  Сохранить
</PressableButton>
```

⚠️ **Не поддерживает `asChild`** — ripple конфликтует с Radix рендером. Для Link-кнопок → `AppLink`.

#### `AppLink` — остаётся per-app (~12 строк)

Зависит от app-специфичного `Link` из next-intl, не может жить в `@letar/ui`:

```tsx
// apps/<app>/src/app/_components/ui/app-link.tsx
'use client'
import { Link } from '@/i18n/navigation'
import { Button, type ButtonProps } from '@chakra-ui/react'
import { Pressable } from '@letar/ui'
import type { ComponentProps } from 'react'

type AppLinkProps = Omit<ButtonProps, 'asChild'> & {
  href: ComponentProps<typeof Link>['href']
  locale?: ComponentProps<typeof Link>['locale']
}

export function AppLink({ href, locale, children, borderRadius = 'md', ...props }: AppLinkProps) {
  return (
    <Pressable borderRadius={borderRadius} display="inline-flex">
      <Button asChild {...props}>
        <Link href={href} locale={locale}>
          {children}
        </Link>
      </Button>
    </Pressable>
  )
}
```

#### `ExternalLink` — иконки соцсетей и внешних ссылок

```tsx
<ExternalLink href="https://github.com/user" aria-label="GitHub" size="lg">
  <FaGithub />
</ExternalLink>
```

#### `Pressable` — произвольная обёртка

Для Server Components или нестандартных случаев (кнопка в дровере, произвольная иконка):

```tsx
<Pressable borderRadius="md" display="inline-flex">
  <IconButton asChild variant="ghost">
    <DrawerTrigger />
  </IconButton>
</Pressable>
```

### TypeScript project references

Если приложение использует `rootDir: 'src'` в tsconfig — нужно добавить references, иначе TS6059:

```json
// apps/<app>/tsconfig.json
{
  "references": [{ "path": "../../libs/ui" }]
}
```

После добавления references запусти `nx typecheck ui` чтобы сгенерировать `.d.ts` в `libs/ui/dist/`.

### Приложения, где уже подключено

| Приложение | Статус                                  |
| ---------- | --------------------------------------- |
| kami       | ✅ полностью (v0.5.0, коммит `d88d362`) |
| aprel8008  | ✅ полностью (v0.5.0, коммит `67be325`) |

## ⚠️ КРИТИЧНО — Оверрайд токенов темы через `@layer` и `!important`

**Проблема:** попытка переопределить CSS-переменную токена (`--chakra-colors-fg-muted` и т.п.)
через селектор в `globalCss` **без `!important` не срабатывает** — даже при более высокой
специфичности селектора.

**Причина:** Chakra v3 объявляет каскадные слои в порядке `reset, base, tokens, recipes`.
`globalCss` попадает в слой `base`, а определения токенов — в слой `tokens`, который идёт
**позже**. По правилам CSS Cascade Layers более поздний слой выигрывает у более раннего
**независимо от специфичности**. Поэтому `tokens` перебивает `base`.

**Решение:** `!important` на значении custom property — important-объявления бьют нормальные
в любом слое:

```typescript
// theme/index.ts → defineConfig({ globalCss: { ... } })
globalCss: {
  // Пример: высококонтрастный режим (archetest 5.4) — атрибут на <html>
  'html[data-contrast="high"]': {
    '--chakra-colors-fg-muted': 'var(--chakra-colors-fg) !important',
    '--chakra-colors-border': 'var(--chakra-colors-border-emphasized) !important',
  },
}
```

Переключается хуком: `document.documentElement.setAttribute('data-contrast', 'high')` +
сохранение в localStorage (образец — `apps/archetest/src/app/_hooks/use-high-contrast.ts`).
Тот же приём — для любого рантайм-режима темы, задаваемого атрибутом на `<html>`.

> Префикс переменных — `--chakra-*` (дефолтный `cssVarsPrefix`). Проверять реальный порядок
> слоёв и применение можно через `preview_inspect` / чтение `<style>` в превью.

## `UserMenu` (`@letar/ui`) — общее меню аккаунта, и когда оно не подходит

`libs/ui/src/lib/user-menu.tsx` — универсальное меню пользователя (кнопка «Войти» для анонимных,
dropdown с профилем/доп. пунктами/выходом для авторизованных). Принимает `session`, `onSignIn`,
`onSignOut`, `profileHref`, `extraItems`, `triggerSlot`, `authHubUrl`, `showAuthHub`, `size`,
`labels`. `showAuthHub={false}` убирает пункт «Аккаунт в Ключнице» для standalone-приложений
(свои ключи Better Auth, не делегируют вход Ключнице — см. `driving-school`, `domwellbes`,
`mandala`).

**Сведены на компонент (2026-08-14):** `domwellbes` (`auth-nav.tsx`), `driving-school`
(`landing/header.tsx`), `grandslamcup` (`public-header.tsx` — уже использовал `UserMenu` до этой
сессии; локальный дубль `header/user-menu.tsx` был мёртвым кодом, удалён), `mandala`
(`auth-button.tsx` — см. ниже).

### `mandala` — двуязычное приложение, потребовало прописать `labels`

`mandala` — двуязычное приложение (`src/i18n/routing.ts`: `locales: ['ru', 'en']`, обе локали
активны). До 2026-08-14 не было переведено на `UserMenu`, потому что весь текст компонента был
захардкожен на русском («Войти», «Профиль», «Выйти», «Аккаунт в Ключнице») — подключение означало
бы регресс локализации на `/en/*`.

`UserMenuProps` получил опциональный проп `labels: UserMenuLabels` (`signIn`, `fallbackName`,
`anonymousName`, `profile`, `authHub`, `signOut`) с русским дефолтом (`DEFAULT_LABELS`) —
обратно совместимо, три прежних потребителя не потребовали изменений. `mandala/auth-button.tsx`
прокидывает `labels` из `useTranslations('auth')`/`useTranslations('nav')`; для `fallbackName`/
`anonymousName` (редкий edge-case — сессия есть, а `name`/`email` нет) заведён новый ключ
`auth.account` в `messages/ru.json`/`messages/en.json`, отдельного перевода под эти два случая
не было и не нужно. `showAuthHub={false}` — `mandala` на standalone Better Auth, не на Ключнице.

### ⚠️ `driving-school` — `owner-nav.tsx` (`OwnerHeader`) НЕ сведён на `UserMenu`

`apps/driving-school/src/app/(owner)/_components/owner-nav.tsx` экспортирует `OwnerHeader` —
шапку панели владельца с фиксированным набором ссылок навигации (`Пользователи`, `Автошколы`,
`Тарифы` и т.д.) и одиночной кнопкой «Выход» рядом с заголовком раздела, без аватара и dropdown.
Это не меню аккаунта, а панель владельца — семантически другая задача, чем `UserMenu` (dropdown
профиля обычного пользователя). Сведён на `UserMenu` только `apps/driving-school/src/app/_components/user-menu.tsx`,
использовавшийся в публичном лендинге (`landing/header.tsx`).

## Мобильные тач-цели и Web Share (фестивальный/kiosk UI)

- **Тач-цели:** для часто нажимаемых элементов (варианты квиза, основные CTA) ставь
  `minH="56px"` (не полагайся на `size="lg"` — Chakra `lg` даёт ~44px, это WCAG-минимум,
  но мало для стресса выставки). Проверяй отсутствие горизонтального скролла:
  `document.documentElement.scrollWidth - clientWidth === 0` на 375px.
- **Оптимистичное выделение (0ms lag):** держи выбор в **локальном** state компонента и
  подсвечивай с приоритетом над prop из родителя — не жди round-trip через состояние родителя.
  Сбрасывай локальный выбор эффектом при смене элемента.
- **Web Share API:** `navigator.share({ title, text, url })` на мобильных → нативный лист;
  фолбэк — `navigator.clipboard.writeText(...)` + тост. `AbortError` (отмена диалога) глотать
  молча. Образец — `apps/archetest/.../_components/share-result-button.tsx`.

## ⭐ Основная CTA не должна уходить под фолд — `StickyActionBar` + `useScrollGate`

**Системная проблема (воспроизводится во всех приложениях):** на длинных интро/формах
основная кнопка действия («Начать тест», «Отправить», «Продолжить») оказывается ниже
фолда, и её не видно без скролла — пользователь думает, что действия нет.

**Решение — shared-примитивы из `@letar/ui`:**

```tsx
import { StickyActionBar, useScrollGate } from '@letar/ui'

// 1) Всегда видимая CTA (минимум — просто оберни кнопку)
<StickyActionBar>
  <Button colorPalette="brand" size="lg" onClick={onSubmit}>Отправить</Button>
</StickyActionBar>

// 2) + гейт «прочитай до конца» (согласия, условия, дисклеймеры)
const { sentinelRef, reachedEnd } = useScrollGate({ enabled: !consentGiven })
<Container pt={16} pb={0}>
  <VStack pb={8}>
    …контент…
    <Box ref={sentinelRef} aria-hidden h="1px" w="100%" />
  </VStack>
  <StickyActionBar>
    <Button disabled={!reachedEnd} onClick={onSubmit}>Далее</Button>
  </StickyActionBar>
</Container>
```

**Правила применения:**

- `StickyActionBar` — **последний ребёнок** прокручиваемого контейнера (не внутри `VStack`
  с контентом, а рядом). Sticky ломается, если у любого предка `overflow` ≠ `visible`.
- Контейнер: `pt={16} pb={0}`, у контентного `VStack` — `pb={8}` (панель добавит свой отступ
  снизу + `safe-area-inset-bottom`).
- Полноширинная панель в узком `Container`: `mx={{ base: -4, md: 0 }}` для bleed к краям.
- **Когда гейтить скроллом:** если экран требует прочтения (согласие/условия). Если есть
  чекбокс согласия внизу контента — он уже вынуждает доскроллить, гейт с ним совпадает
  (`enabled: !consentGiven` отключает гейт после согласия). Для чисто информационных
  экранов с одной CTA `useScrollGate` — единственный гейт.
- Кнопка внутри: `w={{ base: '100%', sm: 'auto' }} minW={{ sm: '14rem' }}` — на мобильном
  во всю ширину, на десктопе — компактная по центру.

Образец: `apps/archetest/.../_components/express-container.tsx` и `quiz-intro.tsx`.
Другие приложения с длинными интро/формами (aboi, dsperevod, studio, driving-school …)
следует перевести на этот паттерн вместо инлайновой кнопки в конце контента.

## ImageMagnifier — лупа с натуральным разрешением 1:1 (`@letar/ui`)

Показывает под курсором участок изображения **без масштабирования**, вокруг — то же
изображение, ужатое до размеров контейнера. Нужен там, где мелкая деталь физически теряется
при уменьшении и показать её надо, не обманывая зрителя монтажом: пиксели берутся из того же
файла, просто без ресайза.

Первый потребитель — доказательство механики НейроАбоИ (`apps/aboi`, §M2.1): микротекст 1.2 мм
не виден издалека и читается вблизи, и покупателю нужно дать проверить это самому.

```tsx
import { ImageMagnifier } from '@letar/ui'
<ImageMagnifier
  src="/demo/poster-fragment.webp" // полный файл 1:1 — его показывает лупа
  placeholderSrc="/demo/poster-fragment-far.webp" // лёгкая копия для первого кадра
  naturalWidth={3200}
  naturalHeight={2200}
  alt="Фрагмент постера: вблизи проступают слова"
  badge="Фрагмент реального постера"
  hint="Наведите — как будто подошли ближе"
/>
```

**Что важно при подготовке ассетов:**

- **Кроп берётся 1:1, без ресайза.** Любое уменьшение убивает мелкую деталь, и лупа
  перестаёт быть честной — показывать будет нечего.
- **Область показа подбирается под размер детали.** Чтобы деталь пропадала при уменьшении,
  контейнер должен ужимать картинку примерно вчетверо: кроп 3200 px на экране в ~800 px даёт
  букву 10.7 px → 2.7 px, то есть неразличимую текстуру. Возьмёшь кроп мельче — деталь
  начнёт читаться и без лупы, эффект пропадёт.
- **Лёгкая копия (`placeholderSrc`) уходит в `background-image`** и рисуется мгновенно, пока
  грузится полная. Без неё первый экран пустой.

**Технические ограничения:**

- `unoptimized` у `next/image` **обязателен** (стоит внутри компонента). Через `/_next/image`
  пришла бы масштабированная копия, и координаты лупы, посчитанные от натуральных размеров,
  разъехались бы.
- **Автопоказ включён по умолчанию** (`autoDemo`): при появлении в зоне видимости лупа сама
  проезжает по траектории. Без него половина посетителей не догадается навести мышь —
  проверено на постановке задачи, а не на пользователях, так что при первом живом прогоне
  стоит перепроверить. `prefers-reduced-motion` показывает лупу статично, без движения.
- **На мобильном лупа ставится тапом, а не вождением пальца.** Вождение потребовало бы
  `preventDefault` на `touchmove`, то есть блокировки скролла страницы под картинкой.
- Клавиатура: `Tab` → стрелки двигают, `Enter`/`Space` закрепляет.
- **`lensSize` — верхняя граница, а не точный размер.** Реальный диаметр ужимается до долей
  контейнера (`min(lensSize, width*0.5, height*0.6)`). Иначе на узком экране лупа закрывает
  почти весь кадр — при контейнере 343 px лупа в 260 px занимала 76% ширины, и сравнивать
  «мелко вокруг / крупно внутри» становилось не с чем, хотя весь смысл компонента в этом.
- **Полный файл грузится лениво, и до его загрузки лупа не работает.** `priority` ставить
  не надо: файл тяжёлый (сотни КБ, `unoptimized`), а секция с доказательством обычно не
  первый экран — eager-загрузка ударит по LCP. Плата за это — очень быстрый скролл до секции
  застанет её нерабочей на долю секунды.

⚠️ **Грабли `next/image` + состояние загрузки.** Компонент включает лупу по событию `load`,
но `next/image` **не шлёт его, если картинка пришла из кэша раньше гидратации** — при
повторном заходе на страницу компонент навсегда оставался в состоянии «не загружено»
и не реагировал ни на мышь, ни на тап. Лечится проверкой `img.complete` в `useEffect` на
монтировании (уже внутри `ImageMagnifier`). **Это общий паттерн:** любой компонент, который
включает интерактив по `onLoad` изображения, обязан дополнительно свериться с `complete` —
иначе баг проявится только у вернувшегося пользователя и не воспроизведётся при разработке
с отключённым кэшем.

## Координация bottom-anchored компонентов (`CookieBanner` + `StickyActionBar`)

⚠️ **Любые два компонента, которые оба анкерятся в низ экрана (`position: fixed`/`sticky`,
`bottom: 0`) — например будущий mobile bottom-nav рядом с `StickyActionBar` — физически
накладываются друг на друга без явной координации.** Тот, у кого выше `zIndex`, перехватывает
pointer-events поверх второго, даже если второй визуально "виден" под ним.

**Прецедент (archetest, 2026-07-28):** `CookieBanner` (`libs/ui`, `position: fixed; bottom:
0; zIndex: 1000`) и `StickyActionBar` (`libs/ui`, `position: sticky; bottom: 0; zIndex:
"docked"`) — на первом визите (баннер согласия виден) невидимая ссылка `<a href="/privacy">`
из баннера перехватывала клики по CTA-кнопке под ним. Баг для любого первого посетителя,
не только в e2e.

**Решение — `CookieBanner` публикует свою высоту в CSS-переменную**
`--letar-cookie-banner-height` на `document.documentElement` (0px, если баннер скрыт),
`StickyActionBar` читает её через `bottom="var(--letar-cookie-banner-height, 0px)"` и
приподнимается над баннером, когда он показан. Если баннер не подключён в приложении —
переменная не определена, `var(..., 0px)` откатывается на дефолт, поведение не меняется.

⚠️ **История одной ошибочной диагностики (для будущих сессий, не повторять путь).** Первый
проход на `ResizeObserver` в редких ручных проверках казался нерабочим (`observe()` будто
не срабатывал), из-за чего его временно заменили на `getBoundingClientRect()` в
`useLayoutEffect` + слушатель `window.resize` — единственный триггер пересчёта. Это создало
**другой, более коварный баг**: замер идёт один раз при монтировании и не переизмеряется без
явного `window resize`. На статичном вьюпорте (мобильный/планшет — самый частый случай на
практике, там `resize` вообще не происходит) неверное значение с первого замера (гонка с
рендером соседних баннеров/шрифтов) застревает навсегда. Живая проверка: чистая загрузка
`/express` дала `1655px` вместо реальных `142px`, без ручного resize так и не исправилось.

**Верный итоговый код — `ResizeObserver` как основной механизм** (это и есть предназначенный
для «пересчитывать при любом изменении размера элемента» инструмент — шрифты, соседние
баннеры, вьюпорт, а не только явный `window resize`), `getBoundingClientRect()` оставлен
только для немедленного значения при первом монтировании (быстрее первого асинхронного
колбэка `ResizeObserver`). И начальный замер, и колбэк используют `getBoundingClientRect()`
(не `entry.contentRect`, который считает content-box без `border` — иначе высоты разошлись
бы на ширину `borderTopWidth`):

```tsx
const rootRef = useRef<HTMLDivElement>(null)

useLayoutEffect(() => {
  const root = document.documentElement
  if (!shown || !rootRef.current) {
    root.style.setProperty(BANNER_HEIGHT_VAR, '0px')
    return
  }
  const el = rootRef.current
  root.style.setProperty(BANNER_HEIGHT_VAR, `${el.getBoundingClientRect().height}px`)

  const observer = new ResizeObserver(() => {
    root.style.setProperty(BANNER_HEIGHT_VAR, `${el.getBoundingClientRect().height}px`)
  })
  observer.observe(el)
  return () => {
    observer.disconnect()
    root.style.setProperty(BANNER_HEIGHT_VAR, '0px')
  }
}, [shown])
```

**Общий паттерн для будущих bottom-anchored компонентов:** нижний (менее приоритетный по
вниманию пользователя) компонент публикует свою высоту в именованную CSS-переменную на
`document.documentElement`, верхний (CTA) читает её через `var(--name, 0px)` в своём
`bottom`. Не хардкодить высоту — контент баннеров/панелей меняется (перенос строк на узких
экранах, локализация).

⚠️ **Переменную должен явно читать `position: sticky`-компонент (`StickyActionBar` или
аналог) — обычная inline-кнопка в потоке документа её игнорирует, и `padding-bottom` на
родителе НЕ помогает.** `padding-bottom` добавляет пространство ПОСЛЕ контента — двигает
то, что идёт следом, а не поднимает уже отрисованные внутри элементы. На короткой странице
(контент короче вьюпорта, скролла нет) кнопка в потоке остаётся на своей естественной
позиции независимо от того, сколько пустого места добавлено под ней. Прецедент: `MoodCheckIn`
(archetest, 2026-07-29) — кнопка «Пропустить» была обычной `Button` под сеткой, `padding-
bottom` на родительском `Container` не сдвинул её ни на пиксель; фикс — обернуть в
`StickyActionBar`. `position: sticky` вычисляется браузером относительно ТЕКУЩЕЙ позиции
viewport и приподнимает элемент даже без явного скролла пользователем — поэтому работает
и на короткой нескроллящейся странице, где `padding-bottom` не может сработать в принципе.

**Второй, отдельный сценарий использования тех же переменных — резервирование места на
скроллящейся странице.** Не путать с кейсом `MoodCheckIn` выше: там баг был в том, что скролла
нет вообще (контент короче вьюпорта), и `padding-bottom` в принципе не может подействовать.
Здесь контент длиннее вьюпорта, скролл есть, и `padding-bottom` работает штатно — просто
отодвигает нижнюю границу scrollable-контента, чтобы при долистывании до конца последний блок
(например форма) не оказался перекрыт fixed/sticky-баром снизу экрана:

```tsx
<Container
  pb={{
    base: 'calc(var(--letar-sticky-actionbar-height, 0px) + var(--letar-cookie-banner-height, 0px) + 4rem)',
    lg: '24', // sticky-бар скрыт на этом брейкпоинте — обычный отступ
  }}
>
```

Референс — `apps/archetest/src/app/[locale]/_components/quiz-intro.tsx` и
`apps/domwellbes/src/app/houses/[slug]/page.tsx` (добавлено 2026-08-25 при починке P1-бага:
`StickyRequestCta` перекрывал submit-кнопку формы заявки на длинной странице).
