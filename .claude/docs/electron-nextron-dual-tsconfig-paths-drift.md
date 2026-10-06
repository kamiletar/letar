# Nextron-приложения: у `renderer/` свой `tsconfig.json` — новый `@letar/*`-алиас правится в двух местах

⚠️ Симптом «зелёный `typecheck:tsgo`, красный `next build`» — не про `transpilePackages`
(это отдельная, уже закрытая ловушка, см. [transpile-packages-array-presence-not-content](/.claude/docs/transpile-packages-array-presence-not-content.md)
и [nextron-renderer-transpile-packages-required](/.claude/docs/nextron-renderer-transpile-packages-required.md)),
а про то, что **`typecheck:tsgo` и `next build` в Electron/Nextron-приложении читают два разных
файла `paths`.**

## Механизм

У Nextron-приложения (`main/` + `renderer/`, см. [electron.md](/.claude/rules/electron.md)) два
`tsconfig.json` с независимыми блоками `compilerOptions.paths`:

- `apps/<app>/tsconfig.json` — верхнеуровневый, его читает `nx typecheck:tsgo <app>`;
- `apps/<app>/renderer/tsconfig.json` — свой, отдельный набор `paths` (пути на уровень глубже:
  `../../../libs/...` вместо `../../libs/...`), его читает `next build --webpack` — Next.js
  резолвит tsconfig из своего рабочего каталога (`renderer/`), не из корня приложения.

Оба файла дублируют один и тот же список `@letar/*`-алиасов независимо. Добавление нового
алиаса только в верхнеуровневый `tsconfig.json` даёт:

- ✅ `nx typecheck:tsgo <app>` — зелёный (читает верхнеуровневый файл, где алиас есть);
- ❌ `nx build <app>` (`next build --webpack` внутри `renderer/`) — `Module not found: Can't
  resolve '@letar/<pkg>'` (читает `renderer/tsconfig.json`, где алиаса нет).

Ловушка симметрична и в обратную сторону — оба файла должны получить новую запись, порядок
не важен, важно не забыть один из двух.

## Где встречается

Проверено grep'ом по всем Nextron-приложениям монорепо (`apps/*/renderer/tsconfig.json`,
2026-09-06): паттерн «раздельный набор `@letar/*`-путей в корневом и в `renderer/tsconfig.json`»
подтверждён у `animatrona`, `label-printer-desktop`, `poster-microtext-desktop`. У всех трёх на
момент проверки списки синхронны (различие только в `@letar/electron-storage`/`@letar/forms-react`/
`@letar/seed-utils` — они нужны только `main/`-процессу и в `renderer/` не импортируются, это не
дрейф, а осознанная разница scope). `kami-key-the` (минимальный каркас без БД/сложного main) не
подвержен — там `renderer/tsconfig.json` вообще не переопределяет `paths`.

## Прецедент

`apps/animatrona/PLAN.md`, «Фаза 1 — вынос в библиотеки», коммит `c4cad00e` (2026-09-06,
перенос `libs/folder-scan`/`libs/folder-player-react`): при добавлении `@letar/folder-scan` и
`@letar/folder-player-react` оба файла (`apps/animatrona/tsconfig.json` и
`apps/animatrona/renderer/tsconfig.json`) были действительно правлены за один коммит — но по
пути к этому `typecheck:tsgo` кратковременно был зелёным, а `next build --webpack` падал
`Module not found`, пока не заметили, что `renderer/tsconfig.json` не подхватил новые записи
автоматически. Зафиксировано в PLAN.md как отдельное предупреждение (п. 5, «Приёмка»).

## Рецепт

При добавлении нового `@letar/*`-импорта в Electron/Nextron-приложении с раздельными tsconfig:

1. Добавить алиас в `apps/<app>/tsconfig.json` (`paths`) — для `typecheck:tsgo`.
2. Добавить тот же алиас в `apps/<app>/renderer/tsconfig.json` (`paths`, на один уровень глубже
   по `../`) — для `next build`.
3. Если пакет импортируется и в `renderer/`, добавить его же в `transpilePackages`
   (`renderer/next.config.js`) — по единообразию с остальными приложениями монорепо, хотя для
   nextron-рендерера это не строго обязательно для сборки (см. смежный док выше).
4. **Обязательно прогнать `nx build <app>` после правки, не только `typecheck:tsgo`** — это
   единственная проверка, которая реально читает `renderer/tsconfig.json`. Тот же общий принцип,
   что и в прецеденте `SortablePhotoGrid` (упомянут в [verification-pitfalls](/.claude/docs/verification-pitfalls.md)
   и в корневом `CLAUDE.md`): зелёный typecheck не доказывает, что прод-билд соберётся.

## Связанные доки

- [transpile-packages-array-presence-not-content](/.claude/docs/transpile-packages-array-presence-not-content.md) —
  точка входа по теме `transpilePackages`, другой механизм той же общей проблемы («typecheck и
  прод-билд расходятся»).
- [nextron-renderer-transpile-packages-required](/.claude/docs/nextron-renderer-transpile-packages-required.md) —
  тот же вопрос применительно конкретно к `transpilePackages` у nextron-рендерера.
- [animatrona-dual-build-alias-drift](/.claude/docs/animatrona-dual-build-alias-drift.md) —
  соседняя, но другая ловушка того же приложения: `main/` собирается webpack и esbuild
  независимо, каждый со своим списком алиасов (`resolve.alias` vs `tsconfig.json paths`).

## Вторая ловушка той же пары: `strict` расходится, и сужение типов работает по-разному

Те же два файла расходятся не только в `paths`. Шаблон `electron-app` до 2026-10-07 выдавал
`renderer/tsconfig.json` с `"strict": false`, а корневой `tsconfig.json` приложения — со
`"strict": true`. Что видит каждый:

- `typecheck:tsgo` читал **только** корневой файл (`strict: true`) и был зелёным;
- `next build` проверяет типы по `renderer/tsconfig.json` (`strict: false`) и падал.

Падение — на discriminated union вида `{ ok: true; v } | { ok: false; error }`. Без
`strictNullChecks` условие `if (x.ok)` и `x.success ? … : x.error` **не сужает** тип, и
`x.error` даёт `TS2339: Property 'error' does not exist`. Парадокс: строгий режим здесь
**мягче** к такому коду, нестрогий — жёстче. Воспроизводится одним файлом и в `tsc`, и в `tsgo`:

```ts
type R = { ok: true; v: number } | { ok: false; error: string }
export function f(x: R) {
  return x.ok ? x.v : x.error
} // TS2339 при strict: false
```

Прецедент: `poster-microtext-desktop` v0.35.1 — упала `nx build:win`, фикс `=== true` лечил
симптом.

**Фикс (с v0.35.2 и в шаблоне генератора):**

1. `renderer/tsconfig.json` → `"strict": true`. Для `poster-microtext-desktop` это ничего не
   стоило: `tsgo -p renderer/tsconfig.json --strict` — 0 ошибок.
2. `typecheck:tsgo` — два прогона подряд, второй по `renderer/tsconfig.json`
   (`nx:run-commands`, `parallel: false`). Так любое будущее расхождение опций или путей
   ловится до сборки, а не на `next build`.

⚠️ **Остальные приложения с той же ловушкой на 2026-10-07** (по `renderer/tsconfig.json`,
правка не сделана — вне задачи): `label-printer-desktop`, `animatrona-folder-player`,
`animatrona-ipfs-player`. `animatrona` и `kami-key-the` уже `strict: true`. С `--strict`
у `label-printer-desktop` и `animatrona-ipfs-player` по 0 ошибок; у `animatrona-folder-player`
5 в `main/services/embedded-subtitles.ts` (нет типов `matroska-subtitles`; `main/` попадает в
renderer-проект через `include`, нужен `declare module` или узкий `include`).
⚠️ В нестрогом режиме `tsgo -p renderer/tsconfig.json` у этих трёх приложений ещё и сыплет
`TS2339` из `libs/forms/.../field-data-grid.tsx` — чужой код ломается от `strict: false`
сам по себе.
