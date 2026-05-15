# План улучшения UI/UX для проекта Mandala (elfafeya.art)

**Версия:** 1.0.0
**Дата создания:** 2025-12-23
**Автор анализа:** Claude (UI/UX архитектор)
**Референс:** apps/driving-school (эталонный UI)

---

## Содержание

1. [Резюме текущего состояния](#резюме-текущего-состояния)
2. [Критичные проблемы (P0)](#критичные-проблемы-p0)
3. [Важные улучшения (P1)](#важные-улучшения-p1)
4. [Желательные улучшения (P2)](#желательные-улучшения-p2)
5. [Детальный план реализации](#детальный-план-реализации)

---

## Резюме текущего состояния

### Что хорошо

- ✅ **Навигация** — адаптивная, с мобильным меню (Drawer)
- ✅ **Формы** — используют @letar/forms (современный стек)
- ✅ **Карточки товаров** — используют Card из Chakra UI
- ✅ **Тёмная тема** — соответствует художественной направленности сайта
- ✅ **PWA** — полная поддержка оффлайн режима
- ✅ **Корзина и заказы** — функционал работает

### Что требует улучшения

- ❌ **Страница входа** — минималистичная до примитивности (1 кнопка, нет визуального дизайна)
- ❌ **Нет регистрации** — только OAuth через Google для админки
- ❌ **Layout форм** — формы выглядят "голыми", без визуальных карточек
- ❌ **Контактная форма** — хорошая, но можно улучшить визуально
- ❌ **Checkout форма** — функционал есть, дизайн базовый
- ❌ **Отсутствует брендинг** — нет логотипа в шапке страниц авторизации

---

## Критичные проблемы (P0)

### P0.1 Страница авторизации `/auth/login`

**Текущее состояние:**

```tsx
// Крайне минималистично
<div>
  <h1>Вход в админ-панель</h1>
  <Button>Войти через Google</Button>
</div>
```

**Проблемы:**

1. Отсутствует визуальный дизайн
2. Нет центрирования
3. Нет брендинга (логотип, название)
4. Нет обратной связи при ошибках
5. Использует простой `<div>` вместо Chakra компонентов

**Референс (driving-school):**

- Центрированный layout с `VStack`, `Container`
- Логотип + название (`LogoWithText`)
- Карточка с `borderRadius="xl"`, `shadow="lg"`
- OAuth кнопки с иконками (Google, Yandex)
- Разделитель "или" для множественных способов входа
- Ссылка на регистрацию
- Ссылка "Забыли пароль?"

---

## Важные улучшения (P1)

### P1.1 Создать AuthLayout для страниц авторизации

**Задача:** Создать layout `(auth)/layout.tsx` по образцу driving-school.

**Компоненты:**

- Ссылка "На главную" с иконкой стрелки
- Центрирование контента
- Фон `bg.subtle`

### P1.2 Редизайн страницы входа `/auth/login`

**Задача:** Переработать страницу входа по образцу driving-school.

**Изменения:**

1. Переместить в `(auth)/sign-in/page.tsx` (конвенция driving-school)
2. Добавить логотип "Elfafeya Art"
3. Обернуть в карточку с тенью
4. Добавить иконку Google к кнопке
5. Добавить возможность Yandex OAuth (опционально)
6. Добавить текст "Вход только для администраторов"

### P1.3 Улучшение контактной формы

**Текущее состояние:** Форма работает, но можно улучшить UX.

**Улучшения:**

1. Добавить placeholder с примерами
2. Добавить подсказки под полями (helperText)
3. Добавить визуальную индикацию обязательных полей
4. Улучшить мобильную адаптацию

### P1.4 Улучшение формы оформления заказа

**Текущее состояние:** Базовый функционал работает.

**Улучшения:**

1. Добавить валидацию телефона с маской
2. Добавить stepper (шаги оформления)
3. Улучшить визуальную иерархию полей
4. Добавить иконки к полям

---

## Желательные улучшения (P2)

### P2.1 Компонент LogoWithText

**Задача:** Создать брендированный компонент логотипа.

```tsx
// Пример структуры
interface LogoWithTextProps {
  size?: 'sm' | 'md' | 'lg'
}

function LogoWithText({ size = 'md' }: LogoWithTextProps) {
  return (
    <HStack>
      <Image src="/logo.svg" alt="Elfafeya Art" />
      <Text fontWeight="bold">Elfafeya Art</Text>
    </HStack>
  )
}
```

### P2.2 Улучшение страницы корзины

**Текущее состояние:** Базовый список товаров.

**Улучшения:**

1. Анимация при удалении товара
2. Кнопка "Очистить корзину"
3. Swipe-to-delete на мобильных
4. Сохранение корзины в localStorage (уже есть)

### P2.3 Улучшение галереи мандал

**Текущее состояние:** Grid с карточками.

**Улучшения:**

1. Фильтрация по категориям (если будут)
2. Lightbox для просмотра в fullscreen
3. Анимация при наведении

### P2.4 Улучшение страницы магазина

**Улучшения:**

1. Фильтры по цене
2. Сортировка
3. Карточки с hover-эффектами

---

## Детальный план реализации

### Фаза 1: Авторизация (P0 + P1.1-P1.2)

#### 1.1 Создать структуру папок

```
apps/mandala/src/app/
├── (auth)/
│   ├── layout.tsx                 # Auth layout с ссылкой на главную
│   ├── sign-in/
│   │   └── page.tsx              # Переработанная страница входа
│   └── _components/
│       └── google-icon.tsx       # Иконка Google (скопировать из driving-school)
└── auth/
    └── login/
        └── page.tsx              # Редирект на /sign-in (для обратной совместимости)
```

#### 1.2 Создать компоненты

**AuthLayout:**

```tsx
// (auth)/layout.tsx
import { Box, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuArrowLeft } from 'react-icons/lu'

export default function AuthLayout({ children }) {
  return (
    <VStack minH="100vh" bg="bg.subtle" alignItems="center" justifyContent="center">
      <Link
        asChild
        colorPalette="brand"
        display="inline-flex"
        alignItems="center"
        gap={1}
        px={4}
        py={4}
        alignSelf="flex-start"
      >
        <NextLink href="/">
          <LuArrowLeft />
          На главную
        </NextLink>
      </Link>
      <Box flex={1}>{children}</Box>
    </VStack>
  )
}
```

**SignInPage:**

```tsx
// (auth)/sign-in/page.tsx
import { signIn } from '@/lib/auth'
import { Box, Button, Container, Text, VStack } from '@chakra-ui/react'
import { GoogleIcon } from '../_components/google-icon'

export default function SignInPage() {
  return (
    <Container maxW="md" py={12}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={4} textAlign="center">
          <Text fontSize="3xl" fontWeight="bold" color="fg">
            Elfafeya Art
          </Text>
          <VStack gap={1}>
            <Text fontSize="2xl" fontWeight="semibold" color="fg">
              Вход в админ-панель
            </Text>
            <Text color="fg.muted" fontSize="md">
              Только для администраторов
            </Text>
          </VStack>
        </VStack>

        {/* Карточка входа */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <VStack gap={4}>
            <form
              action={async () => {
                'use server'
                await signIn('google', { redirectTo: '/admin' })
              }}
            >
              <Button type="submit" variant="outline" width="full" size="lg">
                <GoogleIcon />
                Войти через Google
              </Button>
            </form>
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}
```

#### 1.3 Редирект для обратной совместимости

```tsx
// auth/login/page.tsx
import { redirect } from 'next/navigation'

export default function LegacyLoginPage() {
  redirect('/sign-in')
}
```

### Фаза 2: Улучшение форм (P1.3-P1.4)

#### 2.1 Контактная форма

**Изменения в `contacts/_components/contact-form.tsx`:**

- Добавить `helperText` к полям
- Улучшить placeholder'ы
- Добавить иконки к полям (опционально)

#### 2.2 Checkout форма

**Изменения в `checkout/_components/checkout-form.tsx`:**

- Добавить маску для телефона
- Добавить иконки к секциям
- Улучшить визуальную группировку полей

### Фаза 3: Брендинг и компоненты (P2.1)

#### 3.1 Создать LogoWithText компонент

```tsx
// _components/logo-with-text.tsx
import { HStack, Text } from '@chakra-ui/react'

interface LogoWithTextProps {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { fontSize: 'lg', gap: 2 },
  md: { fontSize: '2xl', gap: 3 },
  lg: { fontSize: '3xl', gap: 4 },
}

export function LogoWithText({ size = 'md' }: LogoWithTextProps) {
  const { fontSize, gap } = sizes[size]

  return (
    <HStack gap={gap}>
      <Text
        fontSize={fontSize}
        fontWeight="bold"
        color="fg"
        fontFamily="serif" // Художественный шрифт
      >
        ✦ Elfafeya Art
      </Text>
    </HStack>
  )
}
```

### Фаза 4: Дополнительные улучшения (P2.2-P2.4)

_Эти задачи можно реализовать после основных улучшений._

---

## Приоритизация задач

| Приоритет | Задача                     | Сложность | Влияние на UX |
| --------- | -------------------------- | --------- | ------------- |
| P0.1      | Редизайн страницы входа    | Низкая    | Высокое       |
| P1.1      | AuthLayout                 | Низкая    | Среднее       |
| P1.2      | SignIn page по образцу     | Средняя   | Высокое       |
| P1.3      | Улучшение контактной формы | Низкая    | Среднее       |
| P1.4      | Улучшение checkout формы   | Средняя   | Среднее       |
| P2.1      | LogoWithText компонент     | Низкая    | Низкое        |
| P2.2      | Улучшение корзины          | Средняя   | Среднее       |
| P2.3      | Улучшение галереи          | Высокая   | Среднее       |
| P2.4      | Улучшение магазина         | Высокая   | Среднее       |

---

## Оценка ресурсов

**Фаза 1 (Авторизация):**

- Создание файлов и структуры: ~30 минут
- Компонент GoogleIcon: ~10 минут
- Новая страница входа: ~1 час
- Тестирование: ~30 минут

**Фаза 2 (Формы):**

- Контактная форма: ~30 минут
- Checkout форма: ~1 час

**Фаза 3 (Брендинг):**

- LogoWithText: ~20 минут

**Фаза 4 (Дополнительно):**

- По запросу пользователя

---

## Следующие шаги

1. [ ] Утвердить план с пользователем
2. [ ] Реализовать Фазу 1 (Авторизация) — P0
3. [ ] Реализовать Фазу 2 (Формы) — P1
4. [ ] Реализовать Фазу 3 (Брендинг) — P2
5. [ ] Тестирование и итерации

---

**Создано:** 2025-12-23
**Последнее обновление:** 2025-12-23
