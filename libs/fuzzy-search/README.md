# @letar/fuzzy-search

Оркестрация «дружелюбного к опечаткам» поиска. Библиотека не выполняет запросы к БД сама и не завязана на
конкретную ZenStack-модель — она решает, какой из выполненных вызывающей стороной запросов
показать. Устойчивость к опечаткам внутри одной раскладки и морфология словоформ уже закрыты
ZenStack `@fuzzy`/`@fullText` (pg_trgm + tsvector, Postgres-only, v3.7+) на стороне модели —
здесь добавлена только коррекция раскладки клавиатуры (RU⇄EN), которую БД не видит.

## Установка

```bash
npm i @letar/fuzzy-search@beta
```

Peer-зависимости: `react` (>=19), `@chakra-ui/react` (>=3), `@letar/forms-core` (>=0.28.0 <1) — последний нужен для `correctKeyboardLayout`/`detectLayout`.

```typescript
import { correctKeyboardLayout, orchestrateSearch } from '@letar/fuzzy-search'
import { FuzzySearchBanner } from '@letar/fuzzy-search/client'
```

## API

### `orchestrateSearch(params)`

Гоняет `runSearch(query)`; если результатов меньше `threshold.minResults` — пробует раскладку
(`correctKeyboardLayout`) и переключается на неё, только если результатов в
`threshold.correctedMultiplier` раз больше буквальных. Ноль результатов по обоим вариантам —
зовёт `suggestFallback` (подбор близких/популярных вариантов остаётся на вызывающей стороне,
это DB-специфичная логика).

```typescript
const outcome = await orchestrateSearch({
  query: userInput,
  runSearch: async (q) => {
    const items = await db.material.findMany({ where: { name: { search: q } }, take: 20 })
    const total = await db.material.count({ where: { name: { search: q } } })
    return { items, total }
  },
  suggestFallback: async () => db.material.findMany({ where: { isPopular: true }, take: 5 }),
})
```

### `correctKeyboardLayout(text)` / `detectLayout(text)`

Чистые функции без побочных эффектов — используются `orchestrateSearch` внутри, но экспортированы
отдельно на случай, если нужна только коррекция раскладки без полного оркестратора.

### `FuzzySearchBanner` (`@letar/fuzzy-search/client`)

Chakra-компонент прозрачного уведомления о подмене запроса («Показаны результаты по: X. Искать
вместо этого: Y») — тексты
принимаются пропом `labels` (уведомление должно быть человекочитаемым и локализованным), дефолт на русском — только запасной вариант.
