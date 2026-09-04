# @letar/url-query-state

Фильтры-тоглы (фасеты, чипы) как настоящие `<a href>`-ссылки, синхронизированные с URL —
заповедь №18 студии (`.claude/private/WEBSTUDIO.md`). Обобщает паттерн `houses/_lib/query-state.ts`
из domwellbes (`.claude/docs/faceted-catalog-pitfalls.md` §5).

**Не для текстовых/диапазонных полей фильтров** (поиск внутри каталога, цена от-до) — там
состояние меняется вводом, а не кликом по ссылке, и это уже закрыто `@letar/forms`
(`FormUrlSync`/`useFormUrlSync`). Эта библиотека — только для тоглов, где заповедь №14 требует
настоящую ссылку (копирование, средний клик, right-click → «Копировать ссылку»), а не
`onClick`-обработчик.

## Установка

```typescript
import { createQueryStateCodec, diffFromDefaults } from '@letar/url-query-state'
import { useUrlQueryState } from '@letar/url-query-state/client'
```

## API

### `createQueryStateCodec(defaults)`

Строит кодек «URL ⇄ состояние» по образцу объекта дефолтов — строка или массив в `defaults`
определяет, как поле парсится/сериализуется. Дефолтные значения не попадают в URL (адрес
остаётся чистым).

```typescript
const codec = createQueryStateCodec({ color: '', sizes: [] as string[], sort: 'popular' })
```

### `buildQueryStateHref(basePath, codec, current, patch)`

Единая точка сборки ссылки от полного состояния + патча — добавление нового измерения фильтров
не требует трогать существующие переключатели (см. `faceted-catalog-pitfalls.md` §5 про
расхождение независимых href-билдеров).

### `diffFromDefaults(state, defaults)` / `hasActiveFilters(state, defaults)`

Какие поля сейчас отличаются от дефолта — для чипов активных фильтров и видимости кнопки
«Сбросить всё» (заповедь №18: «виден, когда активен хоть один фильтр»).

### `useUrlQueryState(codec, { historyMode })` (`@letar/url-query-state/client`)

React-хук для Next.js App Router (`next/navigation`). `historyMode: 'push'` (дефолт) — «назад»
отменяет последний изменённый фильтр (заповедь №4/№18); `'replace'` — для измерений, которым
своя запись истории не нужна.

```tsx
const codec = useMemo(() => createQueryStateCodec({ color: '', sizes: [] as string[] }), [])
const { state, buildHref, activeFilters, hasActiveFilters } = useUrlQueryState(codec)
<Link href={buildHref({ color: 'red' })}>Красный</Link>
{
  hasActiveFilters && <Link href={buildHref(codec.defaults)}>Сбросить всё</Link>
}
```

## Статус (2026-09-05)

Спроектировано и покрыто тестами в изоляции (только чистые функции — React-хук не тестируется
юнит-тестами, требует реального Next.js App Router или e2e) — **интеграция ни в одно приложение
ещё не сделана**. Кандидат первого потребителя — фасетные фильтры каталогов `domwellbes`
(`materials`/`works`), где сейчас своя реализация без общего паттерна. См. `/commandments-check`.

## Команды

```bash
nx test url-query-state
nx lint url-query-state
nx typecheck:tsgo url-query-state
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/url-query-state` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/url-query-state` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
