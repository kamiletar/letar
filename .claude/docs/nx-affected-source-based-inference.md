# `nx affected` видит TS-импорты `@letar/*` даже без `dependencies`/`implicitDependencies`

**Повод.** §169 `PLAN-INFRA-6.md` изначально формулировал находку как «разрыв графа Nx»: у 22 из
56 приложений часть импортируемых `@letar/*`-библиотек не была объявлена ни в `dependencies`, ни
в `nx.implicitDependencies` — из этого делался вывод, что `nx affected` не помечает приложение
затронутым при изменении такой библиотеки (не пересобирает, не гонит lint/typecheck/тесты).

**Проверка не подтвердила эту часть вывода.** Перед правкой `package.json` у `animatrona`
прогнан `nx show projects --affected --files=libs/<lib>/src/index.ts` по каждой из 8 недостающих
библиотек **до** каких-либо изменений — и для 7 из 8 `animatrona`/`animatrona-main`/
`animatrona-renderer` уже был в списке затронутых. Проверка расширена на три других приложения
из того же §169 списка тем же методом (изолированно, без правки package.json):

| Приложение  | Проверенные библиотеки                                    | Результат       |
| ----------- | --------------------------------------------------------- | --------------- |
| `kami`      | `auth`, `email`, `forms`, `ui`                            | 4/4 — затронуто |
| `mandala`   | `admin-ui`, `auth`, `email`, `pin-auth`, `query-provider` | 5/5 — затронуто |
| `dashboard` | `auth`                                                    | 1/1 — затронуто |

Итого 10/10 проверок подтверждают: `nx affected` видел ребро графа для приложения-потребителя
**без единой записи** о библиотеке ни в `dependencies`, ни в `nx.implicitDependencies`.

## Механизм

Граф зависимостей Nx строится не только из явных источников (`dependencies`,
`nx.implicitDependencies`) — плагин `@nx/js` (`nx/js/dependencies-and-lockfile` и связанные
таргеты в выводе `nx show projects --affected`) дополнительно парсит **исходный код** каждого
проекта в воркспейсе и строит рёбра по факту статических `import`/`from '@letar/...'`,
независимо от того, что записано в `package.json`. Это source-based (по содержимому файлов)
инференс, а не только config-based (по декларациям).

Отсюда: удаление/забывание записи в `dependencies`/`implicitDependencies` не создаёт слепую зону
для `nx affected`, `nx build`/`typecheck`/`lint` через `run-many`/`affected` — эти команды
продолжают корректно пересобирать/перепроверять потребителя.

## Что проверка НЕ покрывает

- **Динамический `import()`** — не проверялся отдельно. Source-based инференс `@nx/js`
  исторически ориентирован на статический анализ; для динамических импортов поведение не
  подтверждено эмпирически в этом репозитории.
- **Реэкспорт через баррель другого пакета** (`libs/A` реэкспортирует `libs/B`, потребитель
  импортирует только `A`) — не проверялся. Есть прецедент из смежного класса проблем
  ([lib-consumer-missing-lib-dom.md](/.claude/docs/lib-consumer-missing-lib-dom.md)), где граф TS
  типов такое видит, но это про `tsc --build`/`references`, не про инференс `@nx/js`.
- **Остальные 19 приложений** из исходного списка §169 (кроме `animatrona`, `kami`, `mandala`,
  `dashboard`) не перепроверялись — не считать доказанным без отдельного замера per-app.

## Что проверка ПОДТВЕРЖДАЕТ как реальную проблему

Разрыв в `dependencies` всё равно является дефектом — но по другой причине, не через
`nx affected`. См. [libs.md § «Подключение к приложению»](/.claude/rules/libs.md) и
[vitest-unlinked-workspace-lib-imports.md](/.claude/docs/vitest-unlinked-workspace-lib-imports.md):
под изолированным линковщиком bun симлинк `node_modules/@letar/<lib>` создаёт только
`bun install` по записи в `dependencies`. Без симлинка падает резолв мимо `tsconfig.paths` —
`typecheck:tsgo` (`TS2307: Cannot find module`, прецедент `@letar/demo-protection` в aboi/
domwellbes/form-example) и vitest через sibling-spec файл. `nx.implicitDependencies` для bun
невидим — это чисто графовое ребро Nx, не источник для линковщика.

## Практический вывод

Продолжать чинить находку §169 (дописывать библиотеки в `dependencies` потребителей) — это
правильно, но обосновывать это нужно устойчивостью резолва под bun isolated linker, а не защитой
`nx affected`/CI от пропуска пересборки. Формулировка причины в коммитах/PLAN и в `check-nx-graph-deps.mjs`
(если у скрипта есть текст обоснования) стоит свериться и поправить, если она апеллирует к
`nx affected`.
