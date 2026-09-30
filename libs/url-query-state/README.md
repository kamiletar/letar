# @letar/url-query-state

Фильтры-тоглы (фасеты, чипы) как настоящие `<a href>`-ссылки, синхронизированные с URL (пригодно
для фасетных фильтров каталога): состояние живёт в query string, ссылка работает как обычная.

**Не для текстовых/диапазонных полей фильтров** (поиск внутри каталога, цена от-до) — там
состояние меняется вводом, а не кликом по ссылке, и это уже закрыто `@letar/forms`
(`FormUrlSync`/`useFormUrlSync`). Эта библиотека — только для тоглов, где нужна
настоящая ссылку (копирование, средний клик, right-click → «Копировать ссылку»), а не
`onClick`-обработчик.

## Установка

```bash
npm i @letar/url-query-state@beta
```

Peer-зависимости: `next` (>=15), `react` (>=19).

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
не требует трогать существующие переключатели (независимые href-билдеры со временем расходятся).

### `diffFromDefaults(state, defaults)` / `hasActiveFilters(state, defaults)`

Какие поля сейчас отличаются от дефолта — для чипов активных фильтров и видимости кнопки
«Сбросить всё» (кнопка видна, только когда активен хоть один фильтр).

### `useUrlQueryState(codec, { historyMode })` (`@letar/url-query-state/client`)

React-хук для Next.js App Router (`next/navigation`). `historyMode: 'push'` (дефолт) — «назад»
отменяет последний изменённый фильтр; `'replace'` — для измерений, которым
своя запись истории не нужна.

```tsx
const codec = useMemo(() => createQueryStateCodec({ color: '', sizes: [] as string[] }), [])
const { state, buildHref, activeFilters, hasActiveFilters } = useUrlQueryState(codec)
<Link href={buildHref({ color: 'red' })}>Красный</Link>
{
  hasActiveFilters && <Link href={buildHref(codec.defaults)}>Сбросить всё</Link>
}
```
