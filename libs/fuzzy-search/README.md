# @letar/fuzzy-search

Оркестрация «дружелюбного к опечаткам» поиска — заповедь №17 студии
(`.claude/private/WEBSTUDIO.md`). Библиотека не выполняет запросы к БД сама и не завязана на
конкретную ZenStack-модель — она решает, какой из выполненных вызывающей стороной запросов
показать. Устойчивость к опечаткам внутри одной раскладки и морфология словоформ уже закрыты
ZenStack `@fuzzy`/`@fullText` (pg_trgm + tsvector, Postgres-only, v3.7+) на стороне модели —
здесь добавлена только коррекция раскладки клавиатуры (RU⇄EN), которую БД не видит.

## Установка

Библиотека уже включена в монорепозиторий.

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
вместо этого: Y») — заповедь №11 требует человекочитаемый и локализованный текст, поэтому тексты
принимаются пропом `labels`, дефолт на русском — только запасной вариант.

## Статус (2026-09-05)

Спроектировано и покрыто тестами в изоляции — **интеграция ни в одно приложение ещё не сделана**.
Кандидат первого потребителя — `apps/domwellbes` (там уже стоят `@fuzzy`/`@fullText` в трёх
`.zmodel`, не хватает только серверной оркестрации и баннера). См. `/commandments-check`.

## Команды

```bash
nx test fuzzy-search
nx lint fuzzy-search
nx typecheck:tsgo fuzzy-search
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/fuzzy-search` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/fuzzy-search` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
