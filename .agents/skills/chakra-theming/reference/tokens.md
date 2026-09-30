# Design Tokens

Design токены — базовые значения дизайн-системы: цвета, размеры, отступы и т.д.

## Цвета (Colors)

### Встроенные палитры

Каждая палитра содержит оттенки от 50 (светлый) до 950 (тёмный):

| Палитра  | Использование                        |
| -------- | ------------------------------------ |
| `gray`   | Нейтральные элементы, текст, бордеры |
| `red`    | Ошибки, деструктивные действия       |
| `orange` | Предупреждения                       |
| `yellow` | Внимание, подсветка                  |
| `green`  | Успех, подтверждение                 |
| `teal`   | Акцентный цвет                       |
| `blue`   | Информация, ссылки, primary          |
| `cyan`   | Акцентный цвет                       |
| `purple` | Брендовый цвет                       |
| `pink`   | Акцентный цвет                       |

### Использование

```tsx
<Box bg="blue.500" color="white" />
<Text color="gray.600" />
<Box borderColor="red.200" />
```

### Кастомные цвета

```typescript
tokens: {
  colors: {
    brand: {
      50: { value: '#E6F0FF' },
      100: { value: '#CCE0FF' },
      // ...
      500: { value: '#3366FF' },
      // ...
      900: { value: '#0A1A40' },
      950: { value: '#050D20' },
    },
  },
}
```

---

## Spacing (Отступы)

Единообразные отступы для margin, padding, gap:

| Токен | Значение        | Токен | Значение      |
| ----- | --------------- | ----- | ------------- |
| `0.5` | 0.125rem (2px)  | `10`  | 2.5rem (40px) |
| `1`   | 0.25rem (4px)   | `12`  | 3rem (48px)   |
| `1.5` | 0.375rem (6px)  | `14`  | 3.5rem (56px) |
| `2`   | 0.5rem (8px)    | `16`  | 4rem (64px)   |
| `2.5` | 0.625rem (10px) | `20`  | 5rem (80px)   |
| `3`   | 0.75rem (12px)  | `24`  | 6rem (96px)   |
| `3.5` | 0.875rem (14px) | `28`  | 7rem (112px)  |
| `4`   | 1rem (16px)     | `32`  | 8rem (128px)  |
| `5`   | 1.25rem (20px)  | `36`  | 9rem (144px)  |
| `6`   | 1.5rem (24px)   | `40`  | 10rem (160px) |
| `7`   | 1.75rem (28px)  | `44`  | 11rem (176px) |
| `8`   | 2rem (32px)     | `48`  | 12rem (192px) |

```tsx
<Box p={4} m={2} gap={3} />
<Stack gap={6} />
```

---

## Sizes (Размеры)

Для width, height, maxWidth:

### Числовые

Те же значения что и spacing (0.5-96).

### Именованные

| Токен | Значение       |
| ----- | -------------- |
| `xs`  | 20rem (320px)  |
| `sm`  | 24rem (384px)  |
| `md`  | 28rem (448px)  |
| `lg`  | 32rem (512px)  |
| `xl`  | 36rem (576px)  |
| `2xl` | 42rem (672px)  |
| `3xl` | 48rem (768px)  |
| `4xl` | 56rem (896px)  |
| `5xl` | 64rem (1024px) |
| `6xl` | 72rem (1152px) |
| `7xl` | 80rem (1280px) |
| `8xl` | 90rem (1440px) |

### Дробные

| Токен               | Значение         |
| ------------------- | ---------------- |
| `1/2`               | 50%              |
| `1/3`, `2/3`        | 33.333%, 66.667% |
| `1/4`, `2/4`, `3/4` | 25%, 50%, 75%    |
| `full`              | 100%             |

```tsx
<Box w="full" maxW="4xl" h={10} />
<Container maxW="7xl" />
```

---

## Radii (Скругления)

| Токен  | Значение        | Использование     |
| ------ | --------------- | ----------------- |
| `none` | 0               | Без скругления    |
| `2xs`  | 0.0625rem (1px) | —                 |
| `xs`   | 0.125rem (2px)  | Минимальное       |
| `sm`   | 0.25rem (4px)   | Маленькое         |
| `md`   | 0.375rem (6px)  | Среднее           |
| `lg`   | 0.5rem (8px)    | Большое           |
| `xl`   | 0.75rem (12px)  | —                 |
| `2xl`  | 1rem (16px)     | —                 |
| `3xl`  | 1.5rem (24px)   | —                 |
| `4xl`  | 2rem (32px)     | —                 |
| `full` | 9999px          | Полностью круглое |

### Layer токены

| Токен | Описание       |
| ----- | -------------- |
| `l1`  | Первый уровень |
| `l2`  | Второй уровень |
| `l3`  | Третий уровень |

```tsx
<Box borderRadius="lg" />
<Avatar borderRadius="full" />
```

---

## Shadows (Тени)

| Токен   | Описание         |
| ------- | ---------------- |
| `xs`    | Минимальная тень |
| `sm`    | Маленькая        |
| `md`    | Средняя          |
| `lg`    | Большая          |
| `xl`    | Очень большая    |
| `2xl`   | Максимальная     |
| `inner` | Внутренняя тень  |
| `inset` | Inset тень       |

```tsx
<Box shadow="md" />
<Card shadow="lg" />
```

---

## Z-Index

| Токен      | Значение   | Использование         |
| ---------- | ---------- | --------------------- |
| `hide`     | -1         | Скрытые элементы      |
| `base`     | 0          | Базовый               |
| `docked`   | 10         | Закреплённые элементы |
| `dropdown` | 1000       | Выпадающие меню       |
| `sticky`   | 1100       | Sticky элементы       |
| `banner`   | 1200       | Баннеры               |
| `overlay`  | 1300       | Оверлеи               |
| `modal`    | 1400       | Модальные окна        |
| `popover`  | 1500       | Поповеры              |
| `skipNav`  | 1600       | Skip navigation       |
| `toast`    | 1700       | Тосты                 |
| `tooltip`  | 1800       | Тултипы               |
| `max`      | 2147483647 | Максимальный          |

```tsx
<Box zIndex="modal" />
```

---

## Breakpoints

### Стандартные

| Токен | Значение | Описание              |
| ----- | -------- | --------------------- |
| `sm`  | 480px    | Мобильные (landscape) |
| `md`  | 768px    | Планшеты              |
| `lg`  | 1024px   | Ноутбуки              |
| `xl`  | 1280px   | Десктопы              |
| `2xl` | 1536px   | Большие мониторы      |

### Кастомные (для больших мониторов)

```typescript
const config = defineConfig({
  theme: {
    breakpoints: {
      '3xl': '1920px', // Full HD
      '4xl': '2560px', // 2K / QHD
      '5xl': '3200px', // 3K
      '6xl': '3840px', // 4K / UHD
    },
  },
})
```

### Использование

```tsx
<Box
  fontSize={{ base: 'md', lg: 'lg', '3xl': 'xl', '5xl': '2xl' }}
  px={{ base: 4, xl: 8, '4xl': 16 }}
/>

<Grid
  templateColumns={{
    base: '1fr',
    md: 'repeat(2, 1fr)',
    xl: 'repeat(3, 1fr)',
    '3xl': 'repeat(4, 1fr)',
  }}
/>
```

---

## Typography

### Fonts

| Токен     | Значение                                             |
| --------- | ---------------------------------------------------- |
| `heading` | `-apple-system, BlinkMacSystemFont, "Segoe UI", ...` |
| `body`    | То же                                                |
| `mono`    | `SFMono-Regular, Menlo, Monaco, ...`                 |

### Font Sizes

| Токен | Значение        |
| ----- | --------------- |
| `2xs` | 0.625rem (10px) |
| `xs`  | 0.75rem (12px)  |
| `sm`  | 0.875rem (14px) |
| `md`  | 1rem (16px)     |
| `lg`  | 1.125rem (18px) |
| `xl`  | 1.25rem (20px)  |
| `2xl` | 1.5rem (24px)   |
| `3xl` | 1.875rem (30px) |
| `4xl` | 2.25rem (36px)  |
| `5xl` | 3rem (48px)     |
| `6xl` | 3.75rem (60px)  |
| `7xl` | 4.5rem (72px)   |

### Font Weights

| Токен        | Значение |
| ------------ | -------- |
| `thin`       | 100      |
| `extralight` | 200      |
| `light`      | 300      |
| `normal`     | 400      |
| `medium`     | 500      |
| `semibold`   | 600      |
| `bold`       | 700      |
| `extrabold`  | 800      |
| `black`      | 900      |

### Line Heights

| Токен      | Значение |
| ---------- | -------- |
| `none`     | 1        |
| `shorter`  | 1.25     |
| `short`    | 1.375    |
| `moderate` | 1.5      |
| `tall`     | 1.625    |
| `taller`   | 2        |

---

## Durations (Длительности анимаций)

| Токен     | Значение | Использование       |
| --------- | -------- | ------------------- |
| `fastest` | 50ms     | Мгновенные переходы |
| `faster`  | 100ms    | Быстрые             |
| `fast`    | 150ms    | —                   |
| `normal`  | 200ms    | Стандартные         |
| `slow`    | 300ms    | —                   |
| `slower`  | 400ms    | —                   |
| `slowest` | 500ms    | Медленные           |

```tsx
<Box transition="all" transitionDuration="fast" />
```

---

## Aspect Ratios

| Токен       | Значение  |
| ----------- | --------- |
| `square`    | 1 / 1     |
| `landscape` | 4 / 3     |
| `portrait`  | 3 / 4     |
| `wide`      | 16 / 9    |
| `ultrawide` | 21 / 9    |
| `golden`    | 1.618 / 1 |

```tsx
<AspectRatio ratio="wide">
  <Image src="..." />
</AspectRatio>
```

---

## Cursors

| Токен      | Значение    |
| ---------- | ----------- |
| `button`   | pointer     |
| `checkbox` | default     |
| `disabled` | not-allowed |
| `menuitem` | default     |
| `option`   | default     |
| `radio`    | default     |
| `slider`   | default     |
| `switch`   | pointer     |

## См. также

- [semantic-tokens.md](semantic-tokens.md) — Семантические токены
- [customization.md](customization.md) — Кастомизация токенов
