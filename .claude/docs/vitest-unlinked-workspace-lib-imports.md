# `@letar/*`-либа без bun-симлинка не резолвится под vitest

Найдено в `poster-microtext-desktop` (2026-08-18, режим календаря + вкладыш в тубу): файл,
импортирующий `@letar/electron-storage`, нельзя было напрямую покрыть unit-тестом — vitest падал
с `Error: Cannot find package '@letar/electron-storage'`, хотя `nx typecheck:tsgo` и сборка
приложения были зелёными.

## Причина: у резолверов typecheck/сборки и у резолвера vitest разные источники истины

`@letar/*`-импорт в этом монорепо резолвится тремя независимыми механизмами, и они не
согласованы между собой:

1. **`tsgo`/`tsc`** — через `customConditions: ["@letar/source"]` в `tsconfig.base.json` +
   `exports` с этим условием в `libs/<name>/package.json`. Работает без единой строки в
   `paths` приложения (см. [libs.md](/.claude/rules/libs.md) § «Подключение к приложению»).
2. **`webpack`/`Next.js`-сборка** — так же, через `customConditions`, транспилируется исходник.
3. **vitest (Vite/Rollup, plain Node resolver)** — ни `customConditions`, ни `exports`-условия
   тут не участвуют. Vite резолвит bare-импорт `@letar/x` обычным алгоритмом Node: ищет
   `node_modules/@letar/x` вверх по дереву каталогов от файла, либо смотрит в
   `resolve.alias`, если он явно прописан в `vitest.config.ts`.

Симлинк `<пакет>/node_modules/@letar/x → ../../../libs/x` создаёт `bun install` **только когда
`@letar/x` — настоящая npm/bun-зависимость** (`dependencies`/`devDependencies` в
`package.json` приложения или библиотеки). `nx.implicitDependencies` — это исключительно
ребро графа Nx (порядок сборки, `nx affected`, инвалидация кэша), bun о нём не знает и
симлинк по нему не создаёт.

**Свежие Electron-приложения (`poster-microtext-desktop`, `kami-key-the`, `animatrona`,
`label-printer-desktop`) подключают `@letar/electron-storage` именно так — только через
`nx.implicitDependencies`, не через `dependencies`.** Это осознанный и рабочий выбор для
typecheck/сборки (см. пункты 1–2 выше), но для vitest он означает: симлинка нет ни в
`node_modules` приложения, ни в корневом `node_modules/@letar` (у него в этом репо вообще нет
такой папки — см. [libs.md](/.claude/rules/libs.md)), и резолвер vitest честно сообщает, что
пакета не существует.

Проверено 2026-08-18 по всем четырём потребителям — ни один не имеет
`node_modules/@letar/electron-storage` ни локально, ни в корне.

## Не путать с `vitest-alias-prefix-matching.md`

[vitest-alias-prefix-matching.md](/.claude/docs/vitest-alias-prefix-matching.md) — другая
ловушка: там `resolve.alias` **есть**, но порядок ключей ломает матчинг подпутей. Здесь речь о
случае, когда `resolve.alias` для этой либы **не заведён вовсе**, а симлинка в `node_modules`
физически не существует — ошибка другая (`Cannot find package`, а не «резолвится не туда»), и
чинить её сортировкой ключей бессмысленно.

## Обход, применённый в сессии

Тестируемую логику выносить в отдельный dependency-free модуль, который не импортирует
транзитивно непросимлинкованную `@letar/*`-либу. Сервис, которому нужен и сам
`createJsonStore`, и unit-тестируемая логика вокруг него, держит последнюю в отдельном файле и
импортирует в спек только чистую функцию:

```
main/services/tube-insert.service.ts   # import { createJsonStore } from '@letar/electron-storage'
main/lib/text-wrap.ts                  # чистая функция, без @letar/*-импортов
main/lib/text-wrap.spec.ts             # import { wrapTextToLines } from './text-wrap'
```

`text-wrap.spec.ts` компилируется и гоняется под vitest без единой правки конфига — он просто не
задевает нерезолвящийся импорт.

## Третий обход: замокать локальный модуль-обёртку, а не саму либу

Найдено в `animatrona-tracker` (2026-08-21, тест на гонку публикации аниме, дубль
`directoryCid` должен вернуть 409): нужно было протестировать сам HTTP route handler
(`route.ts`) целиком — вынести логику было некуда, тестируется именно обработчик запроса. `route.ts`
не импортирует `@letar/*` напрямую, но импортирует локальные `@/lib/ipfs.ts` и `@/lib/redis.ts`,
которые сами реэкспортируют `@letar/animatrona-utils` и `@letar/redis-client` (обе — только
`implicitDependencies`, без bun-симлинка).

Рабочий обход — замокать не либу, а сам локальный файл-обёртку:

```ts
// route.ts импортирует isValidCid из '@/lib/ipfs', который реэкспортирует
// '@letar/animatrona-utils' — под vitest этот workspace-пакет не резолвится
// (только через customConditions Next.js), поэтому мокаем весь модуль целиком.
vi.mock('@/lib/ipfs', () => ({
  isValidCid: vi.fn((cid: string) => /^bafy[a-z2-7]{50,}$/.test(cid) || /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)),
}))

vi.mock('@/lib/redis', () => ({
  cached: vi.fn((_key: string, _ttl: number, fn: () => unknown) => fn()),
}))
```

`vi.mock` подменяет модуль по пути импорта до того, как резолвер дойдёт до его тела — значит и до
нерезолвящегося `@letar/x` внутри. Полный пример —
[route.spec.ts](/apps/animatrona-tracker/src/app/api/anime/route.spec.ts).

**Когда подходит:** тестируемый код сам не импортирует `@letar/x` напрямую, только транзитивно
через локальный `lib`-файл, и поведение реального `@letar/x`-кода в этом конкретном тесте не
важно (легко подменить моком с сохранением сигнатуры).

**Когда не подходит:** тестируемый файл импортирует `@letar/x` напрямую (мокать нечего —
`vi.mock` пришлось бы вешать на саму либу, а это уже не «обёртка», а первый вариант выше — вынос
логики), либо реальное поведение либы в тесте важно (например бизнес-логика внутри неё, которую
мок не воспроизведёт корректно) — тогда нужен один из двух вариантов ниже.

## Настоящий фикс, если тестировать сервис целиком обязательно

Не применялся в сессии (код приложений не трогали, только вынос логики), но фикс для будущего
случая — один из двух:

- Добавить `@letar/x` в реальные `dependencies` приложения и прогнать `bun install` — тогда
  появится симлинк, и резолвер vitest увидит пакет как обычный. Меняет семантику подключения
  (пакет становится настоящей npm-зависимостью, не только Nx-графовой), так что решение
  архитектурное, не механическое.
- Прописать `resolve.alias` на `@letar/x` → `../../libs/x/src/index.ts` в `vitest.config.ts`
  приложения — тот же паттерн, что уже используют ручные alias-блоки для либ с несколькими
  точками входа (см. [vitest-alias-prefix-matching.md](/.claude/docs/vitest-alias-prefix-matching.md)
  § «Ручные alias»). Не требует `bun install`, но alias придётся поддерживать руками для каждой
  такой либы.

## Как узнать, специфично ли это `@letar/electron-storage`

Нет — специфика не в конкретной либе, а в способе подключения (`implicitDependencies` без
реальной `dependencies`-записи). Любая `@letar/*`-либа, подключённая так же (typecheck/сборка
работают через `customConditions`, а не через bun-зависимость), даст тот же симптом под vitest.
Быстрая проверка для конкретного приложения: `@letar/x` есть в `implicitDependencies`, но
`grep -c "@letar/x"` по блокам `dependencies`/`devDependencies` того же `package.json` даёт ноль.

## Ловушка тянется транзитивно через реэкспорт

Добавление `resolve.alias` для одной непросимлинкованной либы не гарантирует зелёный прогон,
если эта либа сама реэкспортирует другую такую же либу. Прецедент — `domwellbes`
(2026-08-19): `category-tree.ts` импортировал `validateTreeMove` из `@letar/admin-ui`
(в `implicitDependencies`, без реальной зависимости). После alias на `@letar/admin-ui` тест
всё равно падал — уже на `libs/admin-ui/src/utils/slugify.ts`, который сам делает
`export { slugify } from '@letar/format-utils'`, а эта либа в `domwellbes` подключена точно
так же (`implicitDependencies` без `dependencies`). Пришлось добавить alias на обе:

```ts
resolve: {
  alias: {
    '@letar/admin-ui/server': resolve(__dirname, '../../libs/admin-ui/src/server'),
    '@letar/admin-ui': resolve(__dirname, '../../libs/admin-ui/src'),
    '@letar/format-utils': resolve(__dirname, '../../libs/format-utils/src'),
  },
},
```

Вывод: одна ошибка резолва в логе не значит одну недостающую запись — после фикса первой
перезапускай тест и проверяй, не всплыла ли следующая либа в той же цепочке реэкспортов.

## Ссылки

- [libs.md](/.claude/rules/libs.md) § «Подключение к приложению» — `customConditions` как
  основной механизм резолва `@letar/*`, и где физически лежит bun-симлинк.
- [vitest-alias-prefix-matching.md](/.claude/docs/vitest-alias-prefix-matching.md) — соседняя
  ловушка резолва в vitest (alias есть, но матчится не туда), не путать с этой.
