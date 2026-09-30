---
name: mobile-ui
description: |
  Мобильный UI с Chakra UI v3. Используй при:
  - Создании адаптивных компонентов
  - Работе с breakpoints (sm, md, lg, xl)
  - Реализации мобильной навигации (Drawer, Bottom Nav)
  - Оптимизации touch-friendly UI (44px targets)
  - Тестировании на мобильных устройствах
---

# Mobile UI Skill

Руководство по мобильному UI с Chakra UI v3.

## Quick Reference

### Breakpoints

| Breakpoint | px      | Описание            |
| ---------- | ------- | ------------------- |
| `base`     | 0px     | Мобильные (default) |
| `sm`       | ~480px  | Большие мобильные   |
| `md`       | ~768px  | Планшеты            |
| `lg`       | ~992px  | Ноутбуки            |
| `xl`       | ~1280px | Десктопы            |
| `2xl`      | ~1536px | Большие экраны      |

### Синтаксис

```tsx
// Object синтаксис (рекомендуется)
<Box p={{ base: 4, md: 6, lg: 8 }} />
<Box display={{ base: 'block', md: 'flex' }} />

// Hide/Show
<Box hideFrom="md">Только mobile</Box>
<Box hideBelow="md">Только desktop</Box>

// Range targeting (v3)
<Box display={{ mdToXl: 'flex' }} />  // между md и xl
<Box display={{ lgOnly: 'none' }} />  // только lg
<Box display={{ smDown: 'block' }} /> // до sm включительно
```

### Touch Targets

```tsx
// Минимум 44×44px для touch
<Button size={{ base: 'lg', md: 'md' }}>Кнопка</Button>
<IconButton minH="44px" minW="44px" aria-label="Действие" />
```

### useBreakpointValue

```tsx
import { useBreakpointValue } from '@chakra-ui/react'

const columns = useBreakpointValue({ base: 1, md: 2, lg: 3 })
const isMobile = useBreakpointValue({ base: true, md: false })
```

---

## Ключевые принципы

1. **Mobile-first** — пиши сначала для `base`, потом добавляй стили для больших экранов
2. **Touch targets 44×44px** — минимальный размер интерактивных элементов
3. **Thumb zone** — важные элементы в нижней части экрана для одноручного использования
4. **`100dvh`** — dynamic viewport height учитывает мобильную клавиатуру

---

## Содержание

- [breakpoints.md](reference/breakpoints.md) — Система брейкпоинтов Chakra UI v3
- [responsive-syntax.md](reference/responsive-syntax.md) — Синтаксис responsive props
- [layouts.md](reference/layouts.md) — Адаптивные layout паттерны
- [navigation.md](reference/navigation.md) — Мобильная навигация
- [touch-friendly.md](reference/touch-friendly.md) — Touch targets, accessibility
- [patterns.md](reference/patterns.md) — Готовые паттерны из проекта
- [testing.md](reference/testing.md) — DevTools, тестирование

---

## См. также

- [UI компоненты](../../docs/ui-components.md) — Chakra UI v3 паттерны
- [Chakra UI MCP](../../docs/mcp-servers.md#chakra-ui) — актуальная документация
