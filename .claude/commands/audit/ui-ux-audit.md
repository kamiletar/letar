# UI/UX Audit - Аудит интерфейса с Extended Thinking

Проведи глубокий аудит UI/UX приложения с использованием extended thinking для детального анализа.

## Когда использовать

- Перед релизом (проверка качества интерфейса)
- После добавления новых страниц/компонентов
- При жалобах на UX от пользователей
- Периодически (раз в месяц)

## Методология (Extended Thinking)

Для каждого компонента/страницы анализируй с **трёх перспектив**:

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

### 1. Design System (CRITICAL)

**Проверить:** Использование semantic tokens для dark/light mode

```tsx
// ✅ ПРИОРИТЕТ — semantic tokens
<Box bg="bg.surface" color="fg.default" />
<Text color="fg.muted" />

// ⚠️ Допустимо — colorPalette
<Button colorPalette="blue" />

// ❌ ЗАПРЕЩЕНО — хардкод
<Box bg="#f0f0f0" />
```

**Чеклист:**

- [ ] Все фоны используют semantic tokens (bg.surface, bg.subtle)
- [ ] Все тексты используют semantic tokens (fg.default, fg.muted)
- [ ] Dark mode работает на ВСЕХ компонентах
- [ ] Нет хардкода цветов (hex, rgb)
- [ ] colorPalette для интерактивных компонентов

### 2. Accessibility (WCAG 2.1 AA)

**Инструменты:**

```bash
# Chrome DevTools → Lighthouse → Accessibility
# Chrome DevTools → Elements → Accessibility panel
# axe DevTools extension
```

**Чеклист:**

- [ ] Color contrast ≥ 4.5:1 для текста
- [ ] Все изображения имеют alt
- [ ] Keyboard navigation работает
- [ ] Focus visible на интерактивных элементах
- [ ] ARIA labels где нужно
- [ ] Semantic HTML (nav, main, article)

### 3. Responsive Design

**Проверить breakpoints:**

```tsx
// base → sm → md → lg → xl → 2xl
<Box p={{ base: 4, md: 6, lg: 8 }} />
```

**Чеклист:**

- [ ] Работает на всех breakpoints
- [ ] Mobile-first подход
- [ ] Touch targets ≥ 44×44px на mobile
- [ ] Нет горизонтального скролла
- [ ] Навигация адаптирована (drawer на mobile)

### 4. Forms (@letar/forms)

**Проверить:** Соответствие паттернам form-components

```tsx
// ✅ Правильно
import { Form } from '@letar/forms'
;<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Field.String name="title" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

**Чеклист:**

- [ ] Используется `@letar/forms` (не сырой TanStack Form)
- [ ] `.strip()` на всех Zod схемах
- [ ] UI метаданные в `.meta({ ui: {...} })`
- [ ] Form.Errors для сводки ошибок
- [ ] Loading state на submit

### 5. UI Performance

**Инструменты:**

```bash
# Lighthouse
npx lighthouse https://localhost:3000 --view

# React DevTools Profiler
# Chrome DevTools → Performance
```

**Чеклист:**

- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] Изображения оптимизированы (next/image)
- [ ] Lazy loading для below-the-fold
- [ ] Анимации на transform/opacity

### 6. UX Patterns

**Чеклист:**

- [ ] Loading states для async операций
- [ ] Error messages понятны
- [ ] Empty states информативны
- [ ] Confirmation для destructive actions
- [ ] Success feedback после действий
- [ ] Breadcrumbs для иерархии

---

## Команды для проверки

```bash
# Lighthouse audit
npx lighthouse https://localhost:3000 --view

# Bundle size
ANALYZE=true nx build <app>

# Проверить MCP инструменты
# chakra-ui MCP — актуальные паттерны
# chrome-devtools MCP — DOM snapshot, performance trace
```

---

## Формат отчёта

### Сводка

| Область       | Статус   | Критичные | Важные | Рекомендации |
| ------------- | -------- | --------- | ------ | ------------ |
| Design System | ✅/⚠️/❌ | N         | N      | N            |
| Accessibility | ✅/⚠️/❌ | N         | N      | N            |
| Responsive    | ✅/⚠️/❌ | N         | N      | N            |
| Forms         | ✅/⚠️/❌ | N         | N      | N            |
| Performance   | ✅/⚠️/❌ | N         | N      | N            |
| UX Patterns   | ✅/⚠️/❌ | N         | N      | N            |

### Детали по приоритетам

**Критичные (исправить немедленно):**

1. [Описание проблемы] — [Файл:строка] — [Решение]

**Важные (исправить до релиза):**

1. [Описание проблемы] — [Файл:строка] — [Решение]

**Рекомендации (улучшить со временем):**

1. [Описание улучшения] — [Файл] — [Как улучшить]

---

## Связанные ресурсы

- **Skill:** `ui-ux-audit` — reference материалы
- **Agent:** `ui-architect` — создание UI компонентов
- **Skill:** `form-pipeline` — паттерны форм
- **Skill:** `chakra-theming` — темизация

---

## Документация

- [UI компоненты](/.claude/docs/ui-components.md) — Chakra UI v3
- [Формы](/.claude/docs/forms.md) — @letar/forms
- [form-components README](/libs/forms/README.md) — API библиотеки
