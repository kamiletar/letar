---
name: ui-ux-audit
description: |
  UI/UX аудит приложения с extended thinking. Используй при:
  - Проверке качества интерфейса перед релизом
  - Анализе accessibility (WCAG 2.1)
  - Проверке responsive дизайна
  - Оценке консистентности дизайн-системы
  - Поиске UX улучшений
---

# UI/UX Audit Skill

Глубокий аудит UI/UX с использованием extended thinking для детального анализа.

## Quick Reference

### Ключевые метрики

| Область       | Метрика     | Цель                        |
| ------------- | ----------- | --------------------------- |
| Accessibility | WCAG 2.1 AA | 100% соответствие           |
| Contrast      | Color ratio | ≥ 4.5:1 (текст), ≥ 3:1 (UI) |
| Touch         | Target size | ≥ 44×44px                   |
| Performance   | LCP         | < 2.5s                      |
| Performance   | CLS         | < 0.1                       |
| Responsive    | Breakpoints | base → sm → md → lg → xl    |

### Инструменты

```bash
# Lighthouse
npx lighthouse https://localhost:3000 --view

# axe-core (accessibility)
# Через Chrome DevTools → Accessibility panel

# Bundle analysis
ANALYZE=true nx build <app>
```

### Чеклист быстрой проверки

- [ ] Все интерактивные элементы имеют focus state
- [ ] Цветовой контраст соответствует WCAG AA
- [ ] Touch targets минимум 44×44px
- [ ] Используются токены вместо хардкода
- [ ] Dark mode работает корректно
- [ ] Responsive на всех breakpoints

---

## Методология анализа (Extended Thinking)

При анализе используй **расширенное размышление** для каждого компонента:

### 1. Перспектива пользователя

- Как пользователь взаимодействует с элементом?
- Какие ожидания у пользователя?
- Где возможны frustration points?

### 2. Перспектива разработчика

- Следует ли код best practices?
- Есть ли технический долг?
- Насколько maintainable решение?

### 3. Перспектива дизайнера

- Консистентен ли дизайн с системой?
- Правильно ли используются токены?
- Есть ли visual hierarchy?

---

## Области аудита

### 1. Accessibility (reference/accessibility.md)

- WCAG 2.1 AA критерии
- Keyboard navigation
- ARIA patterns
- Screen reader support

### 2. Responsive Design (reference/responsive.md)

- Mobile-first подход
- Breakpoints usage
- Touch-friendly UI

### 3. Design System (reference/design-system.md)

- Tokens vs hardcode
- Consistency
- Dark/Light mode

### 4. UI Performance (reference/performance.md)

- Render optimization
- Animation performance
- Layout shifts

### 5. UX Patterns (reference/ux-patterns.md)

- Navigation
- Feedback states
- Error handling

---

## Интеграция с MCP

### Chakra UI

```
mcp__chakra-ui__get_component_props — актуальные props
mcp__chakra-ui__get_component_example — примеры использования
mcp__chakra-ui__v2_to_v3_code_review — миграционные паттерны
```

### Browser Automation

```
mcp__plugin_playwright_playwright__browser_snapshot — accessibility tree
mcp__chrome-devtools__take_snapshot — DOM snapshot
mcp__chrome-devtools__performance_start_trace — performance trace
```

---

## Связанные ресурсы

- [ui-architect agent](../../agents/ui-architect.md) — создание UI
- [mobile-ui skill](../mobile-ui/SKILL.md) — мобильный UI
- [chakra-theming skill](../chakra-theming/SKILL.md) — темизация
- [UI компоненты](../../docs/ui-components.md) — паттерны Chakra UI v3
