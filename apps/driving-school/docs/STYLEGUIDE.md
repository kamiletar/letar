# Style Guide: Driving School

> **Версия:** 1.3.0 | **Обновлено:** 2025-12-21
>
> **Связанные документы:**
>
> - [README.md](../README.md) — обзор проекта

---

## 1. Философия дизайна

### Миссия

Создать интуитивный инструмент для инструкторов автошкол и их учеников, который экономит время и снижает когнитивную нагрузку.

### Целевая аудитория

| Роль            | Характеристики                                | Приоритет UX              |
| --------------- | --------------------------------------------- | ------------------------- |
| **Инструктор**  | 35-55 лет, разный уровень tech-savviness      | Простота, минимум шагов   |
| **Ученик**      | 18-35 лет, привыкли к современным приложениям | Скорость, мобильный UX    |
| **Админ школы** | Менеджеры, работающие с данными               | Обзор информации, фильтры |

### Принципы дизайна

1. **Простота** — Один экран = одна задача. Минимум элементов управления.
2. **Доступность** — Работает для всех: контрастность, keyboard nav, screen readers.
3. **Mobile-first** — 70% пользователей на смартфонах. Дизайним сначала для них.
4. **Мгновенная обратная связь** — Optimistic updates, micro-interactions, skeleton loading.
5. **Консистентность** — Единые паттерны во всём приложении.

---

## 2. Брендинг

### Название и позиционирование

- **Название:** НаПрава.РФ (направа.рф)
- **Позиционирование:** Профессиональный инструмент для автошкол, не игрушка
- **Домен:** направа.рф
- **Тональность:** Надёжный, современный, дружелюбный

### Фирменные цвета

| Цвет                   | HEX       | Использование                   |
| ---------------------- | --------- | ------------------------------- |
| **Brand** (синий)      | `#4F6EF7` | Основные CTA, навигация, ссылки |
| **Accent** (бирюзовый) | `#2CB1BC` | Вторичные акценты, выделения    |

### Логотип

- Использовать SVG формат для чёткости на любых экранах
- Минимальные отступы: 16px со всех сторон
- На тёмном фоне использовать светлую версию

---

## 3. Цветовая система

### Основные палитры

| Палитра   | Цвет 500 | Назначение           |
| --------- | -------- | -------------------- |
| `brand`   | #4F6EF7  | Брендовый синий      |
| `accent`  | #2CB1BC  | Бирюзовый акцент     |
| `gray`    | #8C9199  | Нейтральные элементы |
| `success` | #10B981  | Успешные операции    |
| `warning` | #F59E0B  | Предупреждения       |
| `error`   | #EF4444  | Ошибки               |
| `info`    | #3B82F6  | Информация           |

### Semantic Tokens

Используй semantic tokens вместо прямых цветов для автоматической поддержки Dark Mode:

```tsx
// ✅ Правильно
<Box bg="success.subtle" color="success.fg" borderColor="success.border">

// ❌ Неправильно (не работает в Dark Mode)
<Box bg="green.50" color="green.700" borderColor="green.200">
```

| Token       | Назначение          | Пример                          |
| ----------- | ------------------- | ------------------------------- |
| `.solid`    | Фон кнопок, badges  | `bg="brand.solid"`              |
| `.contrast` | Текст на solid фоне | `color="brand.contrast"`        |
| `.fg`       | Текст, иконки       | `color="error.fg"`              |
| `.subtle`   | Фон панелей         | `bg="info.subtle"`              |
| `.border`   | Границы             | `borderColor="warning.border"`  |
| `.muted`    | Hover состояния     | `_hover={{ bg: "gray.muted" }}` |

### Dark Mode

- Все цвета автоматически адаптируются через semantic tokens
- Тестируй оба режима при разработке
- Иконка переключения в user menu

### Контрастность (WCAG 2.1)

- **Обычный текст:** минимум 4.5:1
- **Крупный текст (18px+ или 14px bold):** минимум 3:1
- **Интерактивные элементы:** минимум 3:1

---

## 4. Типографика

### Шрифт

**Nunito** — дружелюбный, округлый, хорошо читается на экранах.

```tsx
// Подключение в layout.tsx
import { Nunito } from 'next/font/google'

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-nunito',
})
```

### Text Styles

| Стиль         | Размер | Вес | Line Height | Использование       |
| ------------- | ------ | --- | ----------- | ------------------- |
| `heading.2xl` | 36px   | 700 | 1.2         | Заголовки страниц   |
| `heading.xl`  | 30px   | 700 | 1.2         | Заголовки секций    |
| `heading.lg`  | 24px   | 600 | 1.3         | Подзаголовки        |
| `heading.md`  | 20px   | 600 | 1.4         | Заголовки карточек  |
| `body.lg`     | 18px   | 400 | 1.6         | Важный текст        |
| `body.md`     | 16px   | 400 | 1.5         | Основной текст      |
| `body.sm`     | 14px   | 400 | 1.5         | Вторичный текст     |
| `label`       | 14px   | 500 | 1.4         | Метки форм          |
| `caption`     | 12px   | 400 | 1.4         | Подписи, timestamps |

```tsx
<Heading textStyle="heading.lg">Расписание</Heading>
<Text textStyle="body.md">Выберите удобное время</Text>
<Text textStyle="caption" color="fg.muted">Обновлено 5 мин назад</Text>
```

### Правила читаемости

- **Минимальный размер:** 14px (12px только для caption)
- **Длина строки:** 45-75 символов для комфортного чтения
- **Межстрочный интервал:** 1.4-1.6 для body текста

---

## 5. Layout и Spacing

### Breakpoints

| Breakpoint | Ширина  | Устройства                   |
| ---------- | ------- | ---------------------------- |
| `base`     | 0px+    | Мобильные телефоны           |
| `sm`       | 480px+  | Большие телефоны             |
| `md`       | 768px+  | Планшеты                     |
| `lg`       | 1024px+ | Ноутбуки                     |
| `xl`       | 1280px+ | Десктопы                     |
| `2xl`      | 1536px+ | Большие мониторы             |
| `3xl`      | 1920px+ | Full HD мониторы (кастомный) |
| `4xl`      | 2560px+ | 4K мониторы (кастомный)      |

> **Кастомные breakpoints:** `3xl` и `4xl` не входят в Chakra UI по умолчанию. Добавлены в `theme/index.ts` для поддержки больших экранов.

```tsx
// theme/index.ts - добавление кастомных breakpoints
const drivingSchoolConfig = defineConfig({
  theme: {
    breakpoints: {
      '3xl': '1920px',
      '4xl': '2560px',
    },
    // ...остальная конфигурация
  },
})
```

```tsx
// Mobile-first подход с поддержкой больших экранов
<SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4, "2xl": 5, "3xl": 6, "4xl": 8 }} gap={6}>
```

### Container

```tsx
<Container maxW="container.xl" py={8}>
  {/* Контент с максимальной шириной и отступами */}
</Container>
```

### Spacing Scale

| Token | Значение | Использование           |
| ----- | -------- | ----------------------- |
| `1`   | 4px      | Минимальный отступ      |
| `2`   | 8px      | Между элементами группы |
| `4`   | 16px     | Внутри карточек         |
| `6`   | 24px     | Между секциями          |
| `8`   | 32px     | Между блоками           |
| `12`  | 48px     | Большие отступы         |

### Grid

```tsx
// Адаптивная сетка для карточек
<SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={6}>
  <Card>...</Card>
</SimpleGrid>

// Две колонки с соотношением
<Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={6}>
  <GridItem>Основной контент</GridItem>
  <GridItem>Сайдбар</GridItem>
</Grid>
```

---

## 6. Компоненты

### Кнопки

```tsx
// Основная кнопка (CTA)
<Button colorPalette="brand" size="lg">Записаться</Button>

// Вторичная кнопка
<Button variant="outline" colorPalette="brand">Отмена</Button>

// Опасное действие
<Button colorPalette="error">Удалить</Button>

// Кнопка с иконкой
<Button colorPalette="brand">
  <LuPlus /> Добавить
</Button>
```

**Размеры кнопок:**

- `lg` — основные CTA
- `md` — стандартные действия
- `sm` — в таблицах, карточках
- `xs` — компактные интерфейсы

**:active стили** — все кнопки имеют `scale(0.95)` при нажатии для тактильной обратной связи.

### Карточки

```tsx
// Обычная карточка
<Card layerStyle="card.default">
  <Card.Body>Контент</Card.Body>
</Card>

// Карточка с тенью (приподнятая)
<Card layerStyle="card.elevated">...</Card>

// Интерактивная карточка (кликабельная)
<Card layerStyle="card.interactive" cursor="pointer">...</Card>
```

### Панели статусов

```tsx
// Панель ошибки
<Box layerStyle="panel.error" p={4}>
  <Text color="error.fg">Не удалось загрузить данные</Text>
</Box>

// Панель успеха
<Box layerStyle="panel.success" p={4}>
  <Text color="success.fg">Занятие успешно забронировано!</Text>
</Box>

// Панель предупреждения
<Box layerStyle="panel.warning" p={4}>
  <Text color="warning.fg">Настройте расписание для начала работы</Text>
</Box>

// Информационная панель
<Box layerStyle="panel.info" p={4}>
  <Text color="info.fg">Подсказка для пользователя</Text>
</Box>
```

### Формы

Chakra UI v3 использует **compound components** для Field:

```tsx
import { Field, Input } from '@chakra-ui/react'

// Базовое поле
<Field.Root>
  <Field.Label>Email</Field.Label>
  <Input placeholder="me@example.com" />
  <Field.HelperText>Мы не передаём email третьим лицам</Field.HelperText>
</Field.Root>

// Поле с ошибкой
<Field.Root invalid>
  <Field.Label>Email</Field.Label>
  <Input placeholder="me@example.com" />
  <Field.ErrorText>Введите корректный email</Field.ErrorText>
</Field.Root>

// Обязательное поле
<Field.Root required>
  <Field.Label>
    Email
    <Field.RequiredIndicator />
  </Field.Label>
  <Input placeholder="me@example.com" />
</Field.Root>

// Горизонтальное расположение
<Field.Root orientation="horizontal">
  <Field.Label>Имя</Field.Label>
  <Input placeholder="Иван" flex="1" />
</Field.Root>
```

**Кастомный Field wrapper** (используется в проекте):

```tsx
import { Field } from '@/app/_components/ui/field' // Упрощённый API с props
;<Field
  label="Email"
  invalid={!!errors.email}
  errorText={errors.email}
  helperText="Мы не передаём email третьим лицам"
  required
>
  <Input type="email" name={fields.email.name} defaultValue={fields.email.initialValue} />
</Field>
```

**Правила форм:**

- Используй compound components (`Field.Root`, `Field.Label`, `Field.ErrorText`) или кастомный `<Field>` wrapper
- `invalid` prop управляет отображением `Field.ErrorText`
- `required` prop добавляет `Field.RequiredIndicator` (звёздочка)
- `orientation="horizontal"` для inline форм
- Валидация через `parseWithZod` на сервере

### Навигация

- **Desktop:** Sidebar слева с иконками и текстом
- **Mobile:** Bottom Navigation с 4-5 основными пунктами
- **Активный пункт:** `bg="brand.subtle"`, `color="brand.fg"`

### Иконки

**Библиотека:** [Lucide React](https://lucide.dev/) — современные, консистентные, tree-shakeable.

```tsx
import { Calendar, Car, ChevronRight, Plus, Trash2, User } from 'lucide-react'

// Стандартное использование
<Calendar size={20} />

// В кнопке
<Button><Plus size={16} /> Добавить</Button>

// С цветом
<Car size={24} color="var(--chakra-colors-brand-solid)" />
```

**Размеры иконок:**

| Контекст     | Размер  | Пример                       |
| ------------ | ------- | ---------------------------- |
| В тексте     | 16px    | Inline с текстом             |
| В кнопках    | 16-18px | `<Button><Plus size={16} />` |
| В навигации  | 20-24px | Sidebar, Bottom Nav          |
| Декоративные | 32-48px | Empty states, features       |
| Hero/Landing | 48-80px | Большие акценты              |

**Правила:**

- Используй `strokeWidth={1.5}` для тонких иконок, `strokeWidth={2}` по умолчанию
- Всегда добавляй `aria-label` для IconButton
- Цвет иконки наследуется от `color` родителя — используй `color="fg.muted"` для вторичных

```tsx
// ✅ Правильно
<IconButton aria-label="Удалить занятие" variant="ghost" colorPalette="error">
  <Trash2 size={18} />
</IconButton>

// ❌ Неправильно (нет aria-label)
<IconButton><Trash2 /></IconButton>
```

### Аватары

```tsx
import { Avatar } from '@chakra-ui/react'

// С изображением
<Avatar.Root size="md">
  <Avatar.Image src={user.image} alt={user.name} />
  <Avatar.Fallback>{getInitials(user.name)}</Avatar.Fallback>
</Avatar.Root>

// Только fallback (инициалы)
<Avatar.Root size="sm">
  <Avatar.Fallback>МИ</Avatar.Fallback>
</Avatar.Root>

// Группа аватаров
<Avatar.Group max={3}>
  <Avatar.Root><Avatar.Fallback>А</Avatar.Fallback></Avatar.Root>
  <Avatar.Root><Avatar.Fallback>Б</Avatar.Fallback></Avatar.Root>
  <Avatar.Root><Avatar.Fallback>В</Avatar.Fallback></Avatar.Root>
</Avatar.Group>
```

**Размеры:** `xs` (24px), `sm` (32px), `md` (40px), `lg` (48px), `xl` (64px), `2xl` (96px)

**Функция для инициалов:**

```tsx
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
```

### Badges и Tags

```tsx
// Статус badge
<Badge colorPalette="success">Подтверждено</Badge>
<Badge colorPalette="warning">Ожидает</Badge>
<Badge colorPalette="error">Отменено</Badge>

// С иконкой (для accessibility)
<Badge colorPalette="success"><Check size={12} /> Подтверждено</Badge>

// Tag (удаляемый)
<Tag.Root>
  <Tag.Label>Категория B</Tag.Label>
  <Tag.CloseTrigger />
</Tag.Root>

// Tag группа
<HStack gap={2}>
  <Tag.Root colorPalette="brand"><Tag.Label>АКПП</Tag.Label></Tag.Root>
  <Tag.Root colorPalette="accent"><Tag.Label>Категория B</Tag.Label></Tag.Root>
</HStack>
```

**Когда что использовать:**

- **Badge** — статусы, счётчики, метки (не интерактивные)
- **Tag** — фильтры, категории, удаляемые элементы

### Таблицы

```tsx
<Table.Root size="sm" variant="outline">
  <Table.Header>
    <Table.Row>
      <Table.ColumnHeader>Дата</Table.ColumnHeader>
      <Table.ColumnHeader>Ученик</Table.ColumnHeader>
      <Table.ColumnHeader>Статус</Table.ColumnHeader>
      <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>15 дек, 10:00</Table.Cell>
      <Table.Cell>Иван Петров</Table.Cell>
      <Table.Cell>
        <Badge colorPalette="success">Подтверждено</Badge>
      </Table.Cell>
      <Table.Cell textAlign="right">
        <IconButton aria-label="Редактировать" size="xs" variant="ghost">
          <Pencil size={14} />
        </IconButton>
      </Table.Cell>
    </Table.Row>
  </Table.Body>
</Table.Root>
```

**Responsive таблицы:**

```tsx
// Вариант 1: Горизонтальный скролл
<Box overflowX="auto">
  <Table.Root minW="600px">...</Table.Root>
</Box>

// Вариант 2: Карточки на мобильных
<Box display={{ base: 'block', md: 'none' }}>
  {items.map(item => <MobileCard key={item.id} {...item} />)}
</Box>
<Box display={{ base: 'none', md: 'block' }}>
  <Table.Root>...</Table.Root>
</Box>
```

---

## 7. Overlay компоненты

### Dialog (Модальное окно)

```tsx
import { Dialog, Portal } from '@chakra-ui/react'
;<Dialog.Root>
  <Dialog.Trigger asChild>
    <Button>Открыть</Button>
  </Dialog.Trigger>
  <Portal>
    <Dialog.Backdrop />
    <Dialog.Positioner>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Подтверждение</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>Вы уверены, что хотите отменить занятие?</Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseTrigger asChild>
            <Button variant="outline">Отмена</Button>
          </Dialog.CloseTrigger>
          <Button colorPalette="error">Да, отменить</Button>
        </Dialog.Footer>
        <Dialog.CloseTrigger asChild position="absolute" top={2} right={2}>
          <IconButton aria-label="Закрыть" variant="ghost" size="sm">
            <X size={18} />
          </IconButton>
        </Dialog.CloseTrigger>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>
```

**Размеры:** `xs`, `sm`, `md`, `lg`, `xl`, `full`

**Когда использовать:**

- Подтверждение действий (удаление, отмена)
- Формы создания/редактирования
- Важная информация, требующая внимания

### Drawer (Боковая панель)

```tsx
import { Drawer, Portal } from '@chakra-ui/react'
;<Drawer.Root placement="right" size="md">
  <Drawer.Trigger asChild>
    <Button>Фильтры</Button>
  </Drawer.Trigger>
  <Portal>
    <Drawer.Backdrop />
    <Drawer.Positioner>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Фильтры</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body>{/* Контент фильтров */}</Drawer.Body>
        <Drawer.Footer>
          <Button variant="outline">Сбросить</Button>
          <Button colorPalette="brand">Применить</Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Positioner>
  </Portal>
</Drawer.Root>
```

**Placement:** `left`, `right`, `top`, `bottom`

**Когда использовать:**

- Фильтры и настройки
- Детали элемента (preview)
- Мобильная навигация

### Popover

```tsx
import { Popover, Portal } from '@chakra-ui/react'
;<Popover.Root>
  <Popover.Trigger asChild>
    <Button variant="outline" size="sm">
      Подробнее
    </Button>
  </Popover.Trigger>
  <Portal>
    <Popover.Positioner>
      <Popover.Content>
        <Popover.Arrow />
        <Popover.Header>Информация</Popover.Header>
        <Popover.Body>Дополнительные детали...</Popover.Body>
      </Popover.Content>
    </Popover.Positioner>
  </Portal>
</Popover.Root>
```

**Когда использовать:**

- Дополнительная информация по клику
- Мини-формы (quick edit)
- Подтверждение inline-действий

### Tooltip

```tsx
import { Tooltip } from '@chakra-ui/react'
;<Tooltip content="Редактировать занятие">
  <IconButton aria-label="Редактировать" variant="ghost">
    <Pencil size={16} />
  </IconButton>
</Tooltip>
```

**Когда использовать:**

- Подсказки для иконок-кнопок
- Объяснение сокращений
- Дополнительный контекст при hover

**Правила:**

- Tooltip только для дополнительной информации, не критичной
- Не прячь важную информацию только в tooltip (недоступно на touch)

### Menu

```tsx
import { Menu, Portal } from '@chakra-ui/react'
;<Menu.Root>
  <Menu.Trigger asChild>
    <Button variant="outline" size="sm">
      Действия <ChevronDown size={16} />
    </Button>
  </Menu.Trigger>
  <Portal>
    <Menu.Positioner>
      <Menu.Content>
        <Menu.Item value="edit">
          <Pencil size={14} /> Редактировать
        </Menu.Item>
        <Menu.Item value="duplicate">
          <Copy size={14} /> Дублировать
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item value="delete" color="error.fg">
          <Trash2 size={14} /> Удалить
        </Menu.Item>
      </Menu.Content>
    </Menu.Positioner>
  </Portal>
</Menu.Root>
```

---

## 8. Изображения и медиа

### Next.js Image

```tsx
import Image from 'next/image'

// Фиксированный размер
<Image
  src="/images/instructor.jpg"
  alt="Фото инструктора"
  width={200}
  height={200}
  className={styles.avatar}
/>

// Заполнение контейнера
<Box position="relative" w="full" h="200px">
  <Image
    src={vehicle.image}
    alt={vehicle.name}
    fill
    style={{ objectFit: 'cover' }}
    sizes="(max-width: 768px) 100vw, 50vw"
  />
</Box>

// С приоритетом (above the fold)
<Image src="/hero.jpg" alt="Hero" priority fill />
```

**Правила:**

- Всегда указывай `alt` (для accessibility)
- Используй `sizes` для responsive изображений
- `priority` только для изображений above the fold (LCP)
- Храни изображения в `/public/images/` или загружай через API

### Форматы

| Формат   | Использование                            |
| -------- | ---------------------------------------- |
| **WebP** | Фотографии (автоматически через Next.js) |
| **SVG**  | Иконки, логотипы, иллюстрации            |
| **PNG**  | Изображения с прозрачностью              |

### Placeholder и Loading

```tsx
// Blur placeholder
<Image
  src={photo}
  alt="Фото"
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>

// Skeleton при загрузке
const [loaded, setLoaded] = useState(false)

<Box position="relative">
  {!loaded && <Skeleton position="absolute" inset={0} />}
  <Image onLoad={() => setLoaded(true)} ... />
</Box>
```

### Аватары пользователей

```tsx
// Загруженный аватар vs OAuth аватар
const avatarSrc = user.avatarId
  ? `/api/images/${user.avatarId}`
  : user.image // OAuth URL

<Avatar.Root>
  <Avatar.Image src={avatarSrc} alt={user.name} />
  <Avatar.Fallback>{getInitials(user.name)}</Avatar.Fallback>
</Avatar.Root>
```

---

## 9. Визуальные токены

### Z-index система

| Слой       | Z-index | Использование           |
| ---------- | ------- | ----------------------- |
| `base`     | 0       | Обычный контент         |
| `dropdown` | 1000    | Menu, Select, Popover   |
| `sticky`   | 1100    | Sticky headers          |
| `overlay`  | 1300    | Backdrop для модалок    |
| `modal`    | 1400    | Dialog, Drawer          |
| `popover`  | 1500    | Popover поверх модалки  |
| `toast`    | 1700    | Toast уведомления       |
| `tooltip`  | 1800    | Tooltip (самый верхний) |

```tsx
// Chakra UI использует эти значения автоматически
// Для кастомных элементов:
<Box zIndex="dropdown">...</Box>
<Box zIndex="modal">...</Box>
```

### Shadows (Тени)

| Token | Использование             |
| ----- | ------------------------- |
| `xs`  | Subtle elevation (inputs) |
| `sm`  | Карточки, панели          |
| `md`  | Hover состояния карточек  |
| `lg`  | Dropdown, popover         |
| `xl`  | Модальные окна            |
| `2xl` | Максимальная глубина      |

```tsx
<Card shadow="sm">Обычная карточка</Card>
<Card shadow="md" _hover={{ shadow: 'lg' }}>Интерактивная</Card>
```

### Border Radius (Скругления)

| Token  | Значение | Использование              |
| ------ | -------- | -------------------------- |
| `sm`   | 4px      | Inputs, badges             |
| `md`   | 6px      | Кнопки, tags               |
| `lg`   | 8px      | Карточки, panels           |
| `xl`   | 12px     | Большие карточки           |
| `2xl`  | 16px     | Модальные окна             |
| `3xl`  | 24px     | Hero секции                |
| `full` | 9999px   | Круглые элементы (avatars) |

```tsx
<Box borderRadius="lg">Карточка</Box>
<Avatar borderRadius="full">АБ</Avatar>
<Button borderRadius="md">Кнопка</Button>
```

---

## 10. Интерактивность

### Micro-interactions

Все интерактивные элементы имеют :active стили:

| Компонент          | Эффект                 |
| ------------------ | ---------------------- |
| Button             | `scale(0.95)`          |
| Link               | `scale(0.9)` + opacity |
| Card (interactive) | `scale(0.98)`          |
| Tab                | `scale(0.95)`          |
| Checkbox/Radio     | `scale(0.9)`           |

### Loading States

```tsx
// Скелетон для карточек
<Skeleton height="200px" borderRadius="md" />

// Spinner для кнопок
<Button loading loadingText="Сохранение...">Сохранить</Button>

// Skeleton для текста
<SkeletonText noOfLines={3} gap={4} />
```

### Optimistic Updates

```tsx
// Мгновенное обновление UI
const [optimisticStatus, setOptimisticStatus] = useOptimistic(status)

const handleBook = () => {
  startTransition(async () => {
    setOptimisticStatus('booked') // Мгновенно
    const result = await bookLessonAction(...)
    // Автоматический rollback при ошибке
  })
}
```

### Animation Styles

```tsx
<Box animationStyle="fade-in">Плавное появление</Box>
<Box animationStyle="slide-in-bottom">Выезд снизу</Box>
<Box animationStyle="scale-in">Масштабирование</Box>
```

### Toast уведомления

```tsx
import { toaster } from '@/app/_components/ui/toaster'

// Успех
toaster.success({ title: 'Занятие забронировано', description: '15 декабря, 10:00' })

// Ошибка
toaster.error({ title: 'Ошибка', description: 'Не удалось сохранить' })

// Информация
toaster.info({ title: 'Подсказка', description: 'Нажмите для деталей' })
```

---

## 11. Copywriting / Тон коммуникации

### Стиль обращения

- **К ученикам:** на "ты" (молодая аудитория)
- **К инструкторам:** на "вы" (профессиональный контекст)
- **В системных сообщениях:** безличная форма или "мы"

### Кнопки и CTA

| Контекст      | Формулировка                 |
| ------------- | ---------------------------- |
| Создание      | "Создать", "Добавить"        |
| Сохранение    | "Сохранить"                  |
| Отправка      | "Отправить", "Записаться"    |
| Подтверждение | "Подтвердить", "Да, удалить" |
| Отмена        | "Отмена", "Назад"            |
| Продолжение   | "Далее", "Продолжить"        |

**Правила:**

- Глаголы в инфинитиве: "Сохранить", не "Сохранение"
- Конкретика: "Забронировать занятие", не просто "Отправить"
- Без восклицательных знаков в кнопках

### Сообщения об ошибках

```
✅ Правильно:
"Введите корректный email"
"Выберите хотя бы одну категорию"
"Время занятия уже занято. Выберите другое."

❌ Неправильно:
"Ошибка валидации поля email"
"Error: invalid input"
"Произошла ошибка"
```

**Правила:**

- Человеческий язык, не технический
- Объясни что не так и как исправить
- Без обвинений ("Вы ввели неправильно")

### Empty States

```tsx
<EmptyState
  icon={<LuCalendar />}
  title="Нет запланированных занятий"
  description="Когда ученики запишутся, занятия появятся здесь"
>
  <Button colorPalette="brand">Открыть расписание</Button>
</EmptyState>
```

**Правила:**

- Иконка + заголовок + описание
- Описание объясняет что делать
- CTA кнопка если возможно действие

### Success Messages

```
✅ "Занятие успешно забронировано"
✅ "Профиль сохранён"
✅ "Приглашение отправлено"

❌ "Операция выполнена успешно"
❌ "OK"
```

---

## 12. Mobile UX

### Touch Targets

- **Минимальный размер:** 44x44px (рекомендуется 48x48px)
- **Отступы между targets:** минимум 8px

```tsx
// Кнопка в мобильной навигации
<IconButton size="lg" minW="48px" minH="48px">
  <LuHome />
</IconButton>
```

### Bottom Navigation

- Максимум 5 пунктов
- Активный пункт выделен цветом и подписью
- Скрывается при скролле вниз, появляется при скролле вверх
- Отступ от Safe Area на iPhone

### Pull-to-Refresh

```tsx
<PullToRefresh onRefresh={handleRefresh}>
  <LessonsList />
</PullToRefresh>
```

### PWA

- Установка на главный экран
- Offline режим для критичных функций
- Push-уведомления о новых занятиях

---

## 13. Accessibility

### WCAG Compliance

- **Level AA** — наша цель
- Тестируй с VoiceOver (Mac/iOS) и NVDA (Windows)

### Keyboard Navigation

- Все интерактивные элементы доступны через Tab
- Enter/Space для активации
- Escape для закрытия модалок
- Стрелки для навигации в меню/табах

### Focus States

```tsx
// Автоматически через Chakra UI
<Button>Кнопка</Button> // Имеет видимый focus ring

// Кастомный focus ring
<Box _focus={{ ring: "2px", ringColor: "brand.focusRing" }}>
```

### Screen Readers

```tsx
// Описание для иконок-кнопок
<IconButton aria-label="Удалить занятие">
  <LuTrash />
</IconButton>

// Скрытый текст для контекста
<VisuallyHidden>Загрузка...</VisuallyHidden>

// Live regions для динамического контента
<Box aria-live="polite">Найдено 5 инструкторов</Box>
```

### Цветовая слепота

- Не полагайся только на цвет для передачи информации
- Добавляй иконки или текст к цветовым индикаторам

```tsx
// ✅ Правильно: иконка + цвет
<Badge colorPalette="success"><LuCheck /> Подтверждено</Badge>

// ❌ Неправильно: только цвет
<Badge colorPalette="success">Подтверждено</Badge>
```

---

## 14. Антипаттерны (Don'ts)

### Цвета

```tsx
// ❌ Hardcoded цвета — не работают в Dark Mode
<Box bg="#ffffff" color="#333333">
<Box bg="white" color="black">
<Box bg="green.500">Успех</Box>

// ✅ Semantic tokens — автоматически адаптируются
<Box bg="bg.panel" color="fg">
<Box bg="success.subtle" color="success.fg">Успех</Box>
```

### Spacing

```tsx
// ❌ Pixel значения и строки
<Box p="20px" m="15px">
<Stack spacing="large">

// ✅ Числовые токены из scale
<Box p={5} m={4}>
<Stack gap={4}>
```

### Typography

```tsx
// ❌ Inline стили и px
<Text style={{ fontSize: '16px', fontWeight: 'bold' }}>
<Heading size="lg" fontSize="24px">

// ✅ Text styles и tokens
<Text textStyle="body.md" fontWeight="semibold">
<Heading size="lg">
```

### Layout

```tsx
// ❌ Desktop-first
<SimpleGrid columns={4} hideBelow="md">

// ✅ Mobile-first
<SimpleGrid columns={{ base: 1, md: 2, lg: 4 }}>
```

### Кнопки

```tsx
// ❌ blue palette (не фирменный цвет)
<Button colorPalette="blue">Сохранить</Button>

// ✅ brand palette
<Button colorPalette="brand">Сохранить</Button>
```

### Формы

```tsx
// ❌ Старый API (не Chakra v3)
<FormControl isInvalid={!!error}>
  <FormLabel>Email</FormLabel>
  <Input />
  <FormErrorMessage>{error}</FormErrorMessage>
</FormControl>

// ✅ Compound components (Chakra v3)
<Field.Root invalid={!!error}>
  <Field.Label>Email</Field.Label>
  <Input />
  <Field.ErrorText>{error}</Field.ErrorText>
</Field.Root>
```

### Overlay компоненты

```tsx
// ❌ Без Portal (может быть перекрыто)
<Dialog.Root>
  <Dialog.Content>...</Dialog.Content>
</Dialog.Root>

// ✅ С Portal (всегда поверх)
<Dialog.Root>
  <Portal>
    <Dialog.Backdrop />
    <Dialog.Positioner>
      <Dialog.Content>...</Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>
```

### Иконки

```tsx
// ❌ Без aria-label для IconButton
<IconButton><Trash2 /></IconButton>

// ✅ С aria-label (accessibility)
<IconButton aria-label="Удалить"><Trash2 /></IconButton>
```

### Изображения

```tsx
// ❌ HTML img без оптимизации
<img src="/photo.jpg" alt="Фото" />

// ✅ Next.js Image с оптимизацией
<Image src="/photo.jpg" alt="Фото" width={200} height={200} />
```

### Z-index

```tsx
// ❌ Магические числа
<Box zIndex={9999}>

// ✅ Токены из системы
<Box zIndex="modal">
```

### Сообщения

```tsx
// ❌ Технический язык
toast.error({ title: 'Error: validation failed for field email' })

// ✅ Человеческий язык
toaster.error({ title: 'Введите корректный email' })
```

### Responsive props

```tsx
// ❌ Массив значений (deprecated)
<Box p={[4, 6, 8]}>

// ✅ Объект с breakpoints
<Box p={{ base: 4, md: 6, lg: 8 }}>
```

### Carousel

```tsx
// ❌ Responsive объект в slidesPerPage (не поддерживается)
<Carousel.Root slidesPerPage={{ base: 1, md: 3 }}>

// ✅ useBreakpointValue для dynamic значения
const slidesPerPage = useBreakpointValue({ base: 1, md: 2, lg: 3 }) ?? 1
<Carousel.Root slidesPerPage={slidesPerPage}>
```

---

## 15. Чеклист для Claude

При работе над UI компонентами driving-school, следуй этим правилам:

### Цвета

- [ ] Используй semantic tokens (`brand.solid`, `error.fg`), НЕ прямые цвета (`blue.500`)
- [ ] Для кнопок: `colorPalette="brand"` по умолчанию
- [ ] Для статусных панелей: `layerStyle="panel.error|success|warning|info"`
- [ ] Тестируй Dark Mode

### Компоненты

- [ ] Формы: `Field.Root` + `Field.Label` + `Field.ErrorText` (compound components)
- [ ] Кнопки с loading state: `<Button loading loadingText="...">`
- [ ] Карточки с layer styles: `layerStyle="card.default|elevated|interactive"`
- [ ] Аватары: `Avatar.Root` + `Avatar.Image` + `Avatar.Fallback`
- [ ] Таблицы: compound components (`Table.Root`, `Table.Header`, etc.)

### Overlay

- [ ] Dialog, Drawer, Popover — ВСЕГДА оборачивай в `<Portal>`
- [ ] Tooltip только для дополнительной информации (не критичной)
- [ ] Menu с иконками и `Menu.Separator` для групп

### Иконки

- [ ] Lucide React: `import { IconName } from 'lucide-react'`
- [ ] Размеры: 16px в кнопках, 20-24px в навигации, 32-48px декоративные
- [ ] `aria-label` обязательно для `IconButton`

### Изображения

- [ ] Next.js Image вместо `<img>`
- [ ] `alt` всегда указан
- [ ] `priority` только для above-the-fold (LCP)
- [ ] `sizes` для responsive изображений

### Layout

- [ ] Mobile-first: `{{ base: ..., md: ..., lg: ..., "2xl": ... }}`
- [ ] Container: `<Container maxW="container.xl">`
- [ ] Spacing: числовые tokens (4, 6, 8), не px
- [ ] Z-index: токены (`zIndex="modal"`), не магические числа

### Responsive

- [ ] Используй объект `{{ base: ..., md: ... }}`, НЕ массив `[..., ...]`
- [ ] `useBreakpointValue` для props без поддержки responsive объекта (например, Carousel slidesPerPage)

### UX

- [ ] Optimistic updates через `useOptimistic`
- [ ] Loading: Skeleton для контента, Spinner для действий
- [ ] Toast для обратной связи (`toaster` из `@/app/_components/ui/toaster`)

### Accessibility

- [ ] `aria-label` для IconButton
- [ ] Keyboard navigation работает
- [ ] Контраст текста проверен
- [ ] Не полагайся только на цвет — добавляй иконки

### Copywriting

- [ ] Кнопки: глаголы в инфинитиве
- [ ] Ошибки: человеческий язык + как исправить
- [ ] Empty states: иконка + что делать
- [ ] К ученикам на "ты", к инструкторам на "вы"

---

## 16. Структура темы

```
src/theme/
├── index.ts                    # Главный экспорт system
├── tokens/
│   ├── colors.ts              # brand, accent, gray, success, warning, error, info
│   ├── typography.ts          # fonts, fontSizes, fontWeights, lineHeights
│   ├── spacing.ts             # radii, shadows, durations, easings
│   └── index.ts
├── semanticTokens/
│   ├── colors.ts              # Semantic tokens с _light/_dark
│   └── index.ts
├── recipes/
│   ├── button.ts              # Button recipe с :active
│   ├── link.ts                # Link recipe с :active
│   ├── slotRecipes.ts         # Card, Menu, Tabs, Accordion и др.
│   └── index.ts
└── styles/
    ├── layerStyles.ts         # panel.*, card.*, stat.*, glass
    ├── textStyles.ts          # heading.*, body.*, label, caption
    ├── animationStyles.ts     # fade-in, slide-in, scale-in, bounce
    └── index.ts
```

### Миграция с hardcoded цветов

| Было                     | Стало                                                  |
| ------------------------ | ------------------------------------------------------ |
| `bg="red.50"`            | `bg="error.subtle"` или `layerStyle="panel.error"`     |
| `bg="green.50"`          | `bg="success.subtle"` или `layerStyle="panel.success"` |
| `bg="blue.50"`           | `bg="info.subtle"` или `layerStyle="panel.info"`       |
| `bg="yellow.50"`         | `bg="warning.subtle"` или `layerStyle="panel.warning"` |
| `bg="gray.100"`          | `bg="bg.subtle"`                                       |
| `color="blue.500"`       | `color="info.solid"` или `color="brand.solid"`         |
| `color="green.700"`      | `color="success.fg"`                                   |
| `color="red.700"`        | `color="error.fg"`                                     |
| `color="white"`          | `color="fg.inverted"`                                  |
| `borderColor="blue.500"` | `borderColor="brand.solid"`                            |

### Прогресс рефакторинга

**Завершено:**

1. TypeScript Typegen — настроен (`nx theme:typegen driving-school`)

**Рефакторинг компонентов (Приоритет 1) — завершено (v0.115.0):**

1. `(chats)/chats/_components/chat-messages.tsx`
2. `(instructor)/schedule/_components/schedule-view.tsx`
3. `(auth)/forgot-password/_components/reset-pin-form.tsx`
4. `(public)/schools/[id]/page.tsx`
5. `(owner)/owner/plans/page.tsx`

**Следующие шаги:**

1. Рефакторинг компонентов (Приоритет 2) — ~58 файлов осталось
2. Тестирование Dark Mode — проверить все страницы в обоих режимах

---

## Ресурсы

- [Chakra UI v3 Docs](https://chakra-ui.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Последнее обновление:** 2025-12-21
