# Как резолвится `@letar/*` — `paths`, `node_modules` и `transpilePackages`

Про подключение библиотеки с несколькими точками входа (`@letar/x` + `@letar/x/server`) со
стороны **сборки**: что именно резолвит специфер, что ломается при промахе и почему
`transpilePackages` тут не нужен.

Про разметку (`type:*`-теги, `enforce-module-boundaries`) и про то, чем граница
клиент/сервер держится в линте, — соседний документ
[lib-entry-points.md](/.claude/docs/lib-entry-points.md). Здесь это не дублируется.

## Зачем вообще второй вход

Серверная раздача файлов тянет `node:fs`, `node:fs/promises`, `node:path`, `node:stream`
([serve-uploads.ts](/libs/image-upload/src/server/serve-uploads.ts)). Лежи она в общем
`src/index.ts` — любой `import { createUploadsRoute }` в API-роуте потянул бы за собой React и
Chakra-компоненты загрузки. Отдельный вход режет граф модулей: `route.ts` берёт только серверный
файл.

Библиотек с подпутями в монорепо уже пять — `@letar/auth`, `@letar/pin-auth`, `@letar/cdek`,
`@letar/forms`, `@letar/image-upload` (таблица — в [lib-entry-points.md](/.claude/docs/lib-entry-points.md)).

## 1. `exports` в package.json библиотеки

[libs/image-upload/package.json](/libs/image-upload/package.json):

```json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": { "types": "./src/index.ts", "import": "./src/index.ts", "default": "./src/index.ts" },
    "./server": {
      "types": "./src/server/index.ts",
      "import": "./src/server/index.ts",
      "default": "./src/server/index.ts"
    },
    "./package.json": "./package.json"
  }
}
```

`main`/`types` описывают только `.` — подпуть обязан быть отдельным ключом в `exports`.

## 2. `paths` в tsconfig КАЖДОГО приложения — отдельно на подпуть

⚠️ Ключ `@letar/image-upload` **не покрывает** `@letar/image-upload/server`: `paths` матчится по
строке, а не по префиксу пакета.

```json
"@letar/image-upload": ["../../libs/image-upload/src/index.ts"],
"@letar/image-upload/server": ["../../libs/image-upload/src/server/index.ts"]
```

| Приложение   | Что прописано                                                           |
| ------------ | ----------------------------------------------------------------------- |
| mandala      | оба входа — [tsconfig.json:35-36](/apps/mandala/tsconfig.json)          |
| kami         | только серверный — [tsconfig.json:32](/apps/kami/tsconfig.json)         |
| grandslamcup | только серверный — [tsconfig.json:32](/apps/grandslamcup/tsconfig.json) |

### Приложение может быть потребителем ТОЛЬКО серверного входа

У `kami` и `grandslamcup` записи для основного входа нет вообще — библиотека нужна им
исключительно ради `createUploadsRoute` в `api/files/[...path]/route.ts`. Это законная
конфигурация, а не недоделка: прописывать `.` «на всякий случай» не нужно.

### Промах в `paths` → TS2307

```
error TS2307: Cannot find module '@letar/image-upload/server' or its corresponding type declarations.
```

Проверено сравнением двух конфигов `tsgo` на одном и том же файле-импортёре: с записью резолв
уходит внутрь `libs/image-upload/src/server/serve-uploads.ts`, без записи — TS2307 на строке
импорта.

⚠️ У `kami` и `grandslamcup` в `next.config` стоит `typescript.ignoreBuildErrors: true`, поэтому
TS2307 **в билде не всплывёт** — промах ловит только `nx typecheck:tsgo <app>`.

## 3. Почему `paths` — несущая конструкция, а не удобство

В корне монорепо **нет `node_modules/@letar`** — ни каталога, ни симлинков (`lstat` → `ENOENT`).
Bun линкует workspace-библиотеки в `apps/<app>/node_modules/@letar/` только для объявленных в
`dependencies` самого приложения:

```bash
ls apps/studio/node_modules/@letar      # hooks
ls apps/dashboard/node_modules/@letar   # analytics chakra-provider forms infra-config ui
ls apps/kami/node_modules/@letar        # пусто
```

Все семь потребителей `image-upload` (`aboi`, `aprel8008`, `domwellbes`, `driving-school`,
`grandslamcup`, `kami`, `mandala`) объявляют `@letar/*` через `nx.implicitDependencies` — это граф
Nx, а не установка пакета. Линка не появляется, поэтому **`paths` остаётся единственным
механизмом резолва**.

Обратная сторона: у `studio` импорт `@letar/hooks` работает вообще без записи в `paths` (либа в
`dependencies` → линк есть), и `nx typecheck:tsgo studio` зелёный. Не бери это за образец — при
`implicitDependencies` так не будет.

## 4. `transpilePackages` — НЕ нужен

Для библиотеки, резолвящейся через `paths`, запись в `transpilePackages` не требуется.

- [apps/kami/next.config.js:36](/apps/kami/next.config.js) перечисляет пять пакетов, и
  `@letar/image-upload` среди них нет — при том что `src/app/api/files/[...path]/route.ts`
  импортирует `@letar/image-upload/server`. `nx build kami` доходит до
  `✓ Compiled successfully` — а это ровно та фаза, где вылез бы `Module not found`.
  Turbopack в трейсе прямо показывает, что затянул исходник библиотеки:

  ```
  Import trace:
    App Route:
      ./libs/image-upload/src/server/serve-uploads.ts
      ./apps/kami/src/app/api/files/[...path]/route.ts
  ```

- [apps/grandslamcup/next.config.mjs](/apps/grandslamcup/next.config.mjs) не имеет
  `transpilePackages` вовсе, хотя тянет `@letar/forms`, `@letar/ui`, `@letar/auth`,
  `@letar/chakra-provider` и серверный вход `image-upload`. `nx build grandslamcup` тоже доходит
  до `✓ Compiled successfully`. То же отсутствие `transpilePackages` — у `aprel8008`,
  `dsperevod`, `studio`.

Важно, что эти два случая закрывают **оба бандлера**: `kami` собирается Turbopack'ом,
`grandslamcup` — webpack'ом (`next build --webpack`). Правило «не компилировать `node_modules`»,
которое снимает `transpilePackages`, — исторически webpack'овое, так что webpack-подтверждение
здесь весомее.

⚠️ Целиком локально ни тот, ни другой билд не проходит — но оба падают **позже** фазы компиляции
и по причинам, не связанным с резолвом библиотек: `kami` — на `/api/keystatic/[...params]` без
`KEYSTATIC_*` (они только в `.env.docker`, а локальный `next build` грузит `.env.local`/`.env`),
`grandslamcup` — на «Collecting page data» без доступа к БД (`EACCES` при `acquireConnection`).
Для вопроса про `transpilePackages` это неважно: `Module not found` вылезает на фазе компиляции,
а она в обоих случаях зелёная.

**Причина.** `transpilePackages` снимает дефолтное правило Next.js «не компилировать то, что лежит
в `node_modules`». Через `paths` специфер резолвится сразу в исходник под `libs/` — файл вне
`node_modules`, который Next компилирует как обычный файл проекта. Снимать нечего.

То же говорит Nx в деприкейшен-предупреждении, которое печатается при каждом билде:

> `withNx()` from `@nx/next` is deprecated… Next.js transpiles workspace libraries automatically.

⚠️ Уточнение к прецеденту из [deploy-coordination.md](/.claude/rules/deploy-coordination.md)
(«typecheck зелёный, прод-билд падает на `Module not found`» при транзитивном реэкспорте одной
`@letar/*`-либы из другой): чинится он добавлением **`paths`** для транзитивной библиотеки, а не
`transpilePackages`. Показательно, что `aprel8008` имеет `@letar/format-utils` в `paths` и не имеет
`transpilePackages` вовсе. Сам совет «прогони `nx build <app>` после нового импорта из `libs/`»
остаётся в силе — меняется только то, что чинить по факту падения.

## Чек-лист подключения подпути

1. `exports` в `package.json` библиотеки — отдельный ключ на подпуть.
2. `paths` в `tsconfig.json` приложения — отдельная запись на подпуть.
3. `references` в `tsconfig.json` приложения — на библиотеку целиком, одна на все подпути
   (`{ "path": "../../libs/image-upload" }`); поддерживается через `nx sync`.
4. `nx.implicitDependencies` в `package.json` приложения — для графа Nx.
5. `transpilePackages` — **не добавлять**.

Промах в п.2 ловит `nx typecheck:tsgo <app>`, промах в п.1 — `nx build <app>`.
