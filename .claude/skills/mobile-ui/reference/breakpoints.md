# Breakpoints

Система брейкпоинтов Chakra UI v3 для адаптивной вёрстки.

## Значения брейкпоинтов

| Breakpoint | rem   | px      | Описание            |
| ---------- | ----- | ------- | ------------------- |
| `base`     | 0rem  | 0px     | Мобильные (default) |
| `sm`       | 30rem | ~480px  | Большие мобильные   |
| `md`       | 48rem | ~768px  | Планшеты            |
| `lg`       | 62rem | ~992px  | Ноутбуки            |
| `xl`       | 80rem | ~1280px | Десктопы            |
| `2xl`      | 96rem | ~1536px | Большие экраны      |

---

## Mobile-first подход

Chakra UI использует **mobile-first** подход с `@media(min-width)`:

- Стили применяются от меньшего к большему экрану
- `base` — это default для всех размеров
- Каждый следующий breakpoint переопределяет предыдущие

```tsx
// Сначала мобильный стиль (base), потом desktop (md+)
<Box
  p={{ base: 4, md: 6, lg: 8 }} // Отступы растут с экраном
  fontSize={{ base: 'sm', md: 'md' }} // Шрифт больше на desktop
  display={{ base: 'block', md: 'flex' }} // Stack на mobile, flex на desktop
/>
```

---

## Почему rem вместо px?

Breakpoints в `rem` уважают пользовательские настройки:

- Пользователь увеличил шрифт в браузере → breakpoints сдвигаются
- Accessibility: слабовидящие пользователи часто используют zoom
- 1rem = 16px при дефолтных настройках браузера

---

## Типичные устройства

| Устройство        | Ширина    | Breakpoint |
| ----------------- | --------- | ---------- |
| iPhone SE         | 375px     | `base`     |
| iPhone 14         | 390px     | `base`     |
| iPhone 14 Pro Max | 430px     | `base`     |
| Samsung Galaxy    | 360-412px | `base`     |
| iPad Mini         | 768px     | `md`       |
| iPad              | 810px     | `md`       |
| iPad Pro 11"      | 834px     | `md`       |
| iPad Pro 12.9"    | 1024px    | `lg`       |
| Laptop            | 1280px    | `xl`       |
| Desktop           | 1440px+   | `xl`/`2xl` |
| 4K Monitor        | 2560px+   | `2xl`      |

---

## Рекомендации

### Когда менять layout

| Transition    | Что меняется                      |
| ------------- | --------------------------------- |
| `base` → `sm` | Редко — оба мобильные             |
| `base` → `md` | Основное: mobile → tablet/desktop |
| `md` → `lg`   | Sidebar появляется                |
| `lg` → `xl`   | Больше колонок, шире контент      |

### Типичные паттерны

```tsx
// Колонки: 1 → 2 → 3 → 4
<SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} />

// Sidebar: скрыт → виден
<Box display={{ base: 'none', lg: 'block' }} />

// Padding: компактный → просторный
<Container px={{ base: 4, md: 6, lg: 8 }} />

// Шрифт: меньше → больше
<Heading size={{ base: 'lg', md: 'xl', lg: '2xl' }} />
```

---

## См. также

- [responsive-syntax.md](responsive-syntax.md) — Синтаксис responsive props
- [layouts.md](layouts.md) — Адаптивные layout паттерны
