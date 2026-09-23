# `useSyncExternalStore`: snapshot без кеша и тест, который зеленеет до фикса

## Симптом

В dev-консоли на каждой странице, где смонтирован хук, появляется:

```
The result of getServerSnapshot should be cached to avoid an infinite loop
```

(или то же про `getSnapshot`). Приложение при этом работает, тесты зелёные, `typecheck` и `lint`
чисты — ловушка не видна ни одному из гейтов. Найдено в `useBookmarks` приложения `pravda`
(2026-09-24), образец фикса — `apps/pravda/src/hooks/use-bookmarks.ts`, коммит `9f1ec3ac8`.

## Механизм 1 — snapshot сравнивается по ссылке

React вызывает snapshot-функцию несколько раз подряд и сравнивает результаты через `Object.is`
(исходники `react-dom` 19.3.0, `mountSyncExternalStore` / `updateSyncExternalStore`):

- при **гидратации** дважды вызывается `getServerSnapshot`, при обычном рендере — `getSnapshot`;
- ссылки разные → `console.error("The result of … should be cached to avoid an infinite loop")`.

```ts
// ❌ новый массив на каждый вызов
useSyncExternalStore(subscribe, getBookmarks, () => [])

// ❌ то же самое, только объект
useSyncExternalStore(subscribe, () => ({ ...store.state }), () => ({ items: [] }))
```

Для `getServerSnapshot` последствие — предупреждение в dev. Для `getSnapshot` хуже: новая ссылка
на каждый вызов React читает как «данные изменились», и компонент уходит в цикл ререндеров
(`Maximum update depth exceeded`). Примитивы безопасны — `() => 0`, `() => false`,
`() => 'pending'` сравниваются по значению.

## Фикс — одна модульная константа

```ts
/** Единственный экземпляр пустого списка: snapshot сравнивается по ссылке. */
const EMPTY_BOOKMARKS: Bookmark[] = []

function getServerBookmarks(): Bookmark[] {
  return EMPTY_BOOKMARKS
}

useSyncExternalStore(subscribe, getBookmarks, getServerBookmarks)
```

⚠️ **Стабильная ссылка нужна во всех ветках именованного `getSnapshot`**, не только в
inline-стрелке третьего аргумента. В `useBookmarks` было три места, где возвращался новый `[]`:
ветка `typeof window === 'undefined'`, ветка `stored ? JSON.parse(stored) : []` и `catch`. Везде —
`EMPTY_BOOKMARKS`.

⚠️ **`catch` при кеше по строке.** Хук кешировал пару «строка → разобранный список» и обновлял
кеш строки **до** `JSON.parse`. На битом JSON разбор бросал, `catch` отдавал `[]`, но кеш списка
оставался старым — следующий вызов видел совпавшую строку и возвращал закладки, закешированные
**до** порчи данных. В `catch` сбрасывай и кеш значения, а не только возвращай заглушку.

Образец «правильно с самого начала» в публичном коде — `EMPTY_QUEUE` в
`libs/forms/src/lib/offline/use-sync-queue.ts`.

## Механизм 2 — ловушка регрессионного теста ⚠️

Естественный тест на этот баг — шпион на `console.error` и проверка, что предупреждения нет.
Такой тест **зеленеет до фикса**, если предупреждение уже выдал другой тест в том же файле.

В `react-dom` есть одна модульная переменная `didWarnUncachedGetSnapshot`. Она общая для
`getSnapshot` и `getServerSnapshot` и после первого срабатывания навсегда гасит оба
`console.error` (`didWarnUncachedGetSnapshot || …`). Vitest грузит модули заново на каждый
тест-файл, поэтому «навсегда» = до конца файла.

Сценарий: в файле есть тест «CRUD», где сломанный `getSnapshot` или `getServerSnapshot` уже
вызвал предупреждение (его `console.error` никто не слушал) → флаг взведён → следующий тест со
шпионом видит тишину и проходит, хотя баг на месте.

Как писать:

1. **Тест гидратации — первый в файле**, до любого другого рендера хука. Комментарий к нему
   должен объяснять причину порядка, иначе его «наведут порядок» и переставят.
2. `renderHook(() => useHook(), { hydrate: true })` — единственный способ дёрнуть
   `getServerSnapshot` в тесте; обычный `renderHook` идёт по клиентской ветке и вызывает
   `getSnapshot`.
3. Ветку `catch` / «нет window» проверяй отдельным тестом — тоже со шпионом.
4. В `afterEach` — `vi.restoreAllMocks()`, не `vi.clearAllMocks()`: `clear` не снимает
   `mockImplementation` со `spyOn`, и подавленный `console.error` утекает в соседние тесты.

```ts
function snapshotCacheWarnings(spy: MockInstance<typeof console.error>): unknown[][] {
  return spy.mock.calls.filter((args) => String(args[0]).includes('should be cached to avoid an infinite loop'))
}

// ⚠️ Флаг предупреждения в React общий на модуль и взводится один раз —
// тест гидратации идёт первым, пока его не взвёл другой тест
it('getServerSnapshot возвращает стабильную ссылку при гидратации', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  renderHook(() => useBookmarks(), { hydrate: true })
  expect(snapshotCacheWarnings(consoleError)).toHaveLength(0)
})
```

Полный образец — `apps/pravda/src/hooks/use-bookmarks.test.ts`.

**Проверено вживую (2026-09-24, React 19.3.0, Vitest 4):** один и тот же сломанный хук
(`() => []` третьим аргументом) под `renderHook(…, { hydrate: true })` и шпионом на
`console.error` в двух тестах подряд — первый насчитал 1 предупреждение, второй **0**. Отдельно:
сломанный `getSnapshot` (`() => []`) на обычном `renderHook` падает с
`Maximum update depth exceeded`, а не предупреждением.

**Как убедиться, что свой тест ловит баг:** верни `() => []` вместо константы и запусти файл —
тест обязан упасть; затем поставь его после другого теста и убедись, что он проходит зря.

## Сторож

Статически ловится только литерал прямо в аргументе — правило semgrep
`letar-use-sync-external-store-uncached-snapshot` (`.semgrep/letar-rules.yml`, уровень ERROR,
тест — `.semgrep/letar-rules.ts`):

```bash
PYTHONUTF8=1 uvx semgrep --test --config .semgrep/letar-rules.yml .semgrep/letar-rules.ts
```

⚠️ **Именованный snapshot, возвращающий новый объект в одной из веток, правило не видит** —
это как раз случай `useBookmarks` (его `getServerSnapshot` был inline-`() => []`, но `catch`
и ветка без `window` — внутри функции). Их держит только тест гидратации из раздела выше.

⚠️ `semgrep --test` не находит тесты в скрытом каталоге `.semgrep` при запуске «по папке»
(`semgrep --test .semgrep` → «No unit tests found»): пути к правилам и к файлу теста нужно
передавать явно, как в команде выше. Тестовый файл исключён из боевого сканирования
(`paths.exclude`), иначе pre-commit блокировал бы собственный коммит намеренными нарушениями;
`--test` этот `exclude` игнорирует.

Публичное дерево на момент 2026-09-24 чисто: 26 файлов с `useSyncExternalStore` в `apps/` и
`libs/` — 0 срабатываний.

## Как искать в другом месте

```bash
grep -rn -A6 "useSyncExternalStore(" apps libs --include=*.ts --include=*.tsx \
  | grep -E "=> \[|=> \(\{|=> new "
```

Дальше — открыть каждый `getSnapshot`/`getServerSnapshot`, у которого ссылка на именованную
функцию, и пройти **все** её `return`.
