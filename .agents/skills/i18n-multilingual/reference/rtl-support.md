# RTL Support

## Определение RTL языков

```typescript
// i18n/config.ts
export const locales = ['ru', 'en', 'ar', 'he'] as const
export const defaultLocale = 'ru' as const

export type Locale = (typeof locales)[number]

export const rtlLocales: Locale[] = ['ar', 'he']

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale as Locale)
}
```

## HTML dir атрибут

```tsx
// app/[locale]/layout.tsx
import { isRtl } from '@/i18n/config'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dir = isRtl(locale) ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  )
}
```

## Chakra UI RTL

```tsx
// app/providers.tsx
'use client'

import { isRtl } from '@/i18n/config'
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react'
import { useLocale } from 'next-intl'

export function Providers({ children }: { children: ReactNode }) {
  const locale = useLocale()
  const direction = isRtl(locale) ? 'rtl' : 'ltr'

  const system = createSystem(defaultConfig, {
    globalCss: {
      html: {
        direction,
      },
    },
  })

  return <ChakraProvider value={system}>{children}</ChakraProvider>
}
```

## Логические CSS свойства

```tsx
// ✅ Правильно: логические свойства
<Box
  paddingStart={4}    // padding-left в LTR, padding-right в RTL
  paddingEnd={2}      // padding-right в LTR, padding-left в RTL
  marginStart="auto"  // margin-left в LTR, margin-right в RTL
  borderStartRadius="lg"
/>

// ❌ Неправильно: физические свойства
<Box
  paddingLeft={4}   // Не адаптируется к RTL
  marginRight="auto"
/>
```

## Маппинг свойств

| Физическое (избегать) | Логическое (использовать) |
| --------------------- | ------------------------- |
| `left`                | `start`                   |
| `right`               | `end`                     |
| `paddingLeft`         | `paddingStart` / `ps`     |
| `paddingRight`        | `paddingEnd` / `pe`       |
| `marginLeft`          | `marginStart` / `ms`      |
| `marginRight`         | `marginEnd` / `me`        |
| `borderLeftRadius`    | `borderStartRadius`       |
| `borderRightRadius`   | `borderEndRadius`         |
| `textAlign="left"`    | `textAlign="start"`       |
| `textAlign="right"`   | `textAlign="end"`         |
| `float="left"`        | (избегать float)          |

## Flexbox и Grid

```tsx
// ✅ Flexbox автоматически адаптируется
<HStack>
  <Icon />
  <Text>Текст рядом с иконкой</Text>
</HStack>
// В RTL порядок автоматически изменится

// Явное управление направлением
<HStack flexDirection={{ base: 'column', md: 'row' }}>
  ...
</HStack>

// ❌ Избегать row-reverse для RTL — используй логические свойства
```

## Иконки

```tsx
// Некоторые иконки нужно отзеркаливать в RTL
import { isRtl } from '@/i18n/config'
import { useLocale } from 'next-intl'
import { FiArrowRight, FiChevronLeft } from 'react-icons/fi'

export function DirectionalIcon({ icon: Icon }: { icon: IconType }) {
  const locale = useLocale()
  const shouldMirror = isRtl(locale)

  return <Icon style={{ transform: shouldMirror ? 'scaleX(-1)' : undefined }} />
}

// Иконки, которые НЕ нужно отзеркаливать:
// - Галочки ✓
// - Крестики ✗
// - Плюсы/минусы +/-
// - Стрелки вверх/вниз ↑↓

// Иконки, которые НУЖНО отзеркаливать:
// - Стрелки влево/вправо ←→
// - Шевроны влево/вправо
// - Иконки "вперёд/назад"
// - Иконки с направлением чтения (книга, текст)
```

## Компонент с RTL-aware отступами

```tsx
// components/Card.tsx
import { Box, BoxProps } from '@chakra-ui/react'

export function Card({ children, ...props }: BoxProps) {
  return (
    <Box
      bg="bg.surface"
      borderRadius="lg"
      // Логические свойства
      paddingStart={4}
      paddingEnd={4}
      paddingY={3}
      // Граница слева (в RTL будет справа)
      borderStartWidth={4}
      borderStartColor="brand.500"
      {...props}
    >
      {children}
    </Box>
  )
}
```

## Позиционирование

```tsx
// ✅ Логическое позиционирование
<Box
  position="absolute"
  insetStart={0} // left:0 в LTR, right:0 в RTL
  insetEnd="auto"
  top={0}
/>

// Маппинг:
// insetStart = left (LTR) / right (RTL)
// insetEnd = right (LTR) / left (RTL)
```

## CSS для RTL

```css
/* Глобальные стили */
[dir='rtl'] {
  /* Переопределения для RTL если нужны */
}

/* Компонент-специфичные */
.sidebar {
  border-inline-start: 1px solid var(--border);
}

/* Анимации с направлением */
@keyframes slide-in-start {
  from {
    transform: translateX(calc(-100% * var(--direction, 1)));
  }
  to {
    transform: translateX(0);
  }
}

[dir='ltr'] {
  --direction: 1;
}
[dir='rtl'] {
  --direction: -1;
}
```

## Формы в RTL

```tsx
// Input с иконкой
<Group attached>
  <InputAddon>
    <FiSearch />
  </InputAddon>
  <Input placeholder={t('search')} />
</Group>
// В RTL иконка будет справа автоматически

// Лейблы автоматически выравниваются по start
<FormLabel>{t('email')}</FormLabel>
<Input />
```

## Тестирование RTL

```tsx
// В тестах можно принудительно включить RTL
import { render } from '@testing-library/react'

function renderWithRtl(ui: ReactElement) {
  return render(<div dir="rtl">{ui}</div>)
}

test('компонент корректно отображается в RTL', () => {
  const { container } = renderWithRtl(<MyComponent />)
  // Проверки...
})
```

## Переключатель направления (для разработки)

```tsx
'use client'

import { Box, Button } from '@chakra-ui/react'
import { useState } from 'react'

export function DirectionToggle() {
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr')

  function toggle() {
    const newDir = dir === 'ltr' ? 'rtl' : 'ltr'
    setDir(newDir)
    document.documentElement.dir = newDir
  }

  return (
    <Box position="fixed" bottom={4} insetEnd={4} zIndex={9999}>
      <Button size="sm" onClick={toggle}>
        {dir.toUpperCase()}
      </Button>
    </Box>
  )
}
```

## Чеклист RTL

- [ ] HTML `dir` атрибут установлен динамически
- [ ] Используются логические CSS свойства (start/end)
- [ ] Иконки с направлением отзеркаливаются
- [ ] Flexbox/Grid используют логические свойства
- [ ] Нет hardcoded left/right в стилях
- [ ] Тестирование проведено в RTL режиме
- [ ] Шрифты поддерживают арабские/еврейские символы
