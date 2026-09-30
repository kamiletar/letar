# Testing

Тестирование мобильного UI.

## Chrome DevTools

### Device Mode

1. Открой DevTools: `F12` или `Ctrl+Shift+I`
2. Toggle Device Mode: `Ctrl+Shift+M`
3. Выбери устройство или задай размер вручную

### Предустановленные устройства

| Устройство         | Ширина | Breakpoint  |
| ------------------ | ------ | ----------- |
| iPhone SE          | 375px  | `base`      |
| iPhone 12/13/14    | 390px  | `base`      |
| iPhone 14 Pro Max  | 430px  | `base`/`sm` |
| Samsung Galaxy S20 | 360px  | `base`      |
| iPad Mini          | 768px  | `md`        |
| iPad               | 810px  | `md`        |
| iPad Pro 11"       | 834px  | `md`        |
| iPad Pro 12.9"     | 1024px | `lg`        |

### Responsive Mode

- Потяни за край viewport для произвольного размера
- Используй preset breakpoints в toolbar

### Touch simulation

- Автоматически включается в Device Mode
- Круглый курсор вместо стрелки
- Click → tap events

### Throttling

| Preset  | Download | Latency |
| ------- | -------- | ------- |
| Slow 3G | 400 Kbps | 400ms   |
| Fast 3G | 1.4 Mbps | 150ms   |
| Offline | 0        | —       |

---

## Тестирование на реальных устройствах

### Локальная сеть

```bash
# Запуск dev сервера с доступом из сети
nx dev premium-rosstil -- --hostname 0.0.0.0

# Или напрямую
npx next dev --hostname 0.0.0.0
```

Открой на телефоне: `http://<IP компьютера>:3000`

### Найти IP

```bash
# Windows
ipconfig

# macOS/Linux
ifconfig | grep inet
```

### USB debugging (Android)

1. Включи Developer Mode на телефоне
2. Подключи по USB
3. `chrome://inspect` в Chrome
4. Remote debugging

### Safari Web Inspector (iOS)

1. Настройки → Safari → Advanced → Web Inspector
2. Подключи iPhone к Mac
3. Safari → Develop → [Device Name]

---

## Чеклист мобильного UI

### Touch & Interaction

- [ ] Touch targets минимум 44×44px
- [ ] Достаточные отступы между кнопками (8px+)
- [ ] Нет hover-only элементов
- [ ] Важные действия в thumb zone (низ экрана)

### Typography

- [ ] Текст читаем без зума (16px+ для body)
- [ ] Line-height достаточный (1.5+)
- [ ] Контраст текста 4.5:1 минимум

### Forms

- [ ] Input font-size 16px+ (предотвращает zoom на iOS)
- [ ] Правильные `inputMode` для клавиатуры
- [ ] `autoComplete` атрибуты
- [ ] Labels видимы и связаны с inputs
- [ ] Кнопка Submit большая и внизу

### Layout

- [ ] Нет горизонтального скролла
- [ ] Layout не ломается при повороте
- [ ] `100dvh` вместо `100vh` для полноэкранных
- [ ] Safe area учтена (iPhone notch)

### Navigation

- [ ] Меню доступно (Drawer / Bottom Nav)
- [ ] Back navigation работает
- [ ] Active states видимы

### Images

- [ ] `sizes` prop для responsive loading
- [ ] Lazy loading для below-the-fold
- [ ] `priority` для above-the-fold

### Performance

- [ ] Тест на Slow 3G
- [ ] Lighthouse Mobile score 90+
- [ ] First Contentful Paint < 2s

---

## Viewport Units

```tsx
// dvh — dynamic viewport height
// Учитывает мобильную клавиатуру и browser chrome
<Box h="100dvh" />

// svh — small viewport height (минимальная)
// Когда browser chrome показан
<Box minH="100svh" />

// lvh — large viewport height (максимальная)
// Когда browser chrome скрыт
<Box maxH="100lvh" />

// vh — классический (может обрезаться)
<Box h="100vh" />  // ⚠️ Проблемы на mobile
```

### Когда использовать

| Unit  | Использование                        |
| ----- | ------------------------------------ |
| `dvh` | Полноэкранные layout (чаты, модалки) |
| `svh` | Минимальная высота страницы          |
| `lvh` | Редко нужен                          |
| `vh`  | Избегай на mobile                    |

---

## Safe Area (iPhone notch)

```tsx
// Padding для notch и home indicator
<Box pb="env(safe-area-inset-bottom)">
  <BottomNavigation />
</Box>

// Все стороны
<Box
  pt="env(safe-area-inset-top)"
  pb="env(safe-area-inset-bottom)"
  pl="env(safe-area-inset-left)"
  pr="env(safe-area-inset-right)"
>
  {children}
</Box>
```

### В CSS

```css
/* В global.css */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### viewport-fit в meta tag

```html
<!-- В layout.tsx через metadata -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

## Lighthouse Mobile

### Запуск

1. DevTools → Lighthouse tab
2. Device: Mobile
3. Categories: Performance, Accessibility, Best Practices
4. Generate report

### Целевые показатели

| Метрика        | Target  |
| -------------- | ------- |
| Performance    | 90+     |
| Accessibility  | 100     |
| Best Practices | 100     |
| FCP            | < 2s    |
| LCP            | < 2.5s  |
| CLS            | < 0.1   |
| TBT            | < 300ms |

---

## Playwright тесты

### Эмуляция устройств

```typescript
import { devices, test } from '@playwright/test'

// Использование preset
test.use({ ...devices['iPhone 14'] })

// Или кастомные настройки
test.use({
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true,
})
```

### Тест responsive layout

```typescript
test('sidebar скрыт на mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/dashboard')

  const sidebar = page.locator('[data-testid="sidebar"]')
  await expect(sidebar).not.toBeVisible()

  const mobileMenu = page.locator('[data-testid="mobile-menu-button"]')
  await expect(mobileMenu).toBeVisible()
})

test('sidebar виден на desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/dashboard')

  const sidebar = page.locator('[data-testid="sidebar"]')
  await expect(sidebar).toBeVisible()
})
```

### Touch events

```typescript
test('tap открывает меню', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')

  await page.tap('[data-testid="mobile-menu-button"]')

  const drawer = page.locator('[data-testid="mobile-drawer"]')
  await expect(drawer).toBeVisible()
})
```

---

## См. также

- [breakpoints.md](breakpoints.md) — Значения брейкпоинтов
- [touch-friendly.md](touch-friendly.md) — Touch targets
