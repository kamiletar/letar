# Выполненные задачи

Детальное описание реализованных фич. Полная история решений и обоснований — в
[PLAN.md](./PLAN.md), это только сводка.

## Фаза 0 «Общий фрагмент схемы» — шаги 0.1–0.4, 0.7 (2026-09-08)

### 0.1/0.3 — общий фрагмент `libs/zenstack-fragments/src/animatrona.zmodel`

Место фрагмента выбрано существующее (`libs/zenstack-fragments`), а не новая библиотека —
там уже живёт `better-auth.zmodel` с тем же механизмом подключения (файловый `import` в
`schema.zmodel`, не TS-алиас). Заведён `type TrackerFields` — идентификация и описание
источника раздач: `id`/`url`/`name`/`description`/`theme`/`language`/`lastCheckedAt`/
`createdAt`/`updatedAt`, плюс `@@allow('all', true)` и `@@index([lastCheckedAt])`.

В отличие от Better Auth, политика вынесена **внутрь** фрагмента: весь desktop-стек линейки
работает без аутентификации, политика одинакова у всех потребителей. Trust-система федерации
(`publicKeyPem`, `trustLevel`, `uptimePercent`, счётчики синхронизаций) и relation
`importedContent` остались в `apps/animatrona` — у плеера при объёме «только просмотр» их нет,
а relation на модель приложения миксин не поддерживает технически.

`PinStatus` рассматривался и **отклонён**: его содержательные поля обслуживают удалённый
пиннинг (вне объёма плеера), а состояние локальных пинов живёт в `pins.json`, не в БД.

### 0.2 — минимальная схема плеера

Спроектированы 4 модели: `Tracker` (через миксин), `RecentRelease` (локальный кэш открытых
раздач по `directoryCid`), `WatchProgress` (прогресс просмотра), `Settings` — 12 полей вместо
30 у Animatrona. Принцип: манифест в IPFS — источник истины, БД хранит только локальное.

Решение оставить Prisma/SQLite (а не `@letar/electron-storage`) подкреплено замером размера:
стек Prisma 7 + libsql-адаптер тянет единицы мегабайт против 84 МБ одного `kubo.exe`.

Ключ прогресса — `getReleaseKey()`: `shikimori:<id>`, иначе `cid:<directoryCid>`. Решение
владельца: `shikimoriId` в манифестах есть всегда, CID — страховка на случай его отсутствия.

### 0.4 — Animatrona переведена на миксин

Выполнено `animatrona-dev` (коммит `0da07607`), сверено с нашей стороны: сгенерированная
`schema.prisma` для `Tracker` до и после — построчно идентична, дрейфа нет.

### 0.7 — баг form-плагина найден и закрыт

`@letar/zenstack-form-plugin` молча терял **все** поля `type`-миксина: `model.fields` в Langium
AST не содержит полей миксина (они в `model.mixins`), а `extractModelInfo` итерировала только
`fields`. Генерация при этом завершалась с exit 0 — form-схема создавалась неполной без единого
предупреждения. Найдено контрольным опытом (одни и те же 4 поля напрямую в модели и через
миксин), передано `forms-coordinator-dev`, исправлено в v4.0.1 (`collectAllFields()`).
Перепроверено независимо: `Tracker.form.ts` через миксин и напрямую — побайтово идентичны.

Механизм, проверенные границы и ловушки —
[zenstack-shared-fragments-across-apps](/.claude/docs/zenstack-shared-fragments-across-apps.md).

### 0.5/0.6 — схема плеера заведена, таргеты добавлены (2026-09-08, вторая сессия)

`schema.zmodel` вставлен из готового задания почти как есть — одна правка: у `Tracker`
понадобилось обратное поле `recentReleases RecentRelease[]` (без него `zenstack generate`
падает на `RecentRelease.tracker` — «missing opposite relation field»). Таргеты
`zenstack:generate`/`db:push`/`db:push:data-loss`/`db:migrate`/`db:migrate:deploy`/`db:studio`
добавлены в `project.json` по образцу `apps/animatrona`.

`nx zenstack:generate animatrona-ipfs-player` → 4 модели + `TrackPreference` во всех трёх
выходах (Prisma schema, Prisma Client, `form-schemas/*.form.ts` — form-плагин v4.0.1 корректно
разворачивает поля миксина `TrackerFields` в `Tracker.form.ts`). `nx typecheck:tsgo` и `nx lint`
зелёные.

**Найдена и исправлена независимая проблема** в скопированном `prisma.config.ts`: относительный
путь `../../../prisma/data/app.db`, взятый дословно из `apps/animatrona`, у плеера резолвился
не в `apps/animatrona-ipfs-player/prisma/data/`, а в `C:\web\prisma\data\app.db` — на уровень
выше корня репозитория целиком. Почему у Animatrona тот же путь ведёт себя иначе — не
выяснено. Фикс — `file:prisma/data/app.db` (без всплытия, относительно `cwd` таргета, который
уже указывает на корень приложения). Ошибочно созданный файл вне репозитория удалён,
`prisma/data/` добавлена в `.gitignore` приложения (не была унаследована из шаблона генератора).

Готово к MVP-разделу Фазы 1: бизнес-логика в `main/services/`, IPC-хендлеры, UI.

---

## Версия 0.3.0 (2026-09-08) — Фаза 1 (частично): main-процесс

- `main/utils/db.ts` — синглтон `PrismaClient` на `@prisma/adapter-libsql`, dev/prod-пути к БД
  (`prisma/data/app.db` в dev, `app.getPath('userData')` в упакованной сборке).
- `main/services/database.ts` — применение миграций через `sql.js` (WASM) в рантайме упакованного
  приложения (Prisma CLI недоступен без нативных модулей — тот же паттерн, что в `animatrona`).
- IPC-хендлеры `tracker`/`recentRelease`/`settings` — CRUD поверх Prisma без IPFS-логики (она
  блокирована выносом `libs/ipfs-kubo-core`, запрос отправлен `animatrona-coordinator-dev`).
- UI-каркас в `renderer/app/page.tsx` — список трекеров (добавить/удалить), поле «посмотреть по
  CID» пока заглушка.
- **Фикс `main/webpack.config.js`**: `libsql` не был в `externals` — webpack пытался распарсить
  нативные `.node`/`README.md` из `@libsql/win32-x64-msvc` как JS-модуль, 60 ошибок сборки.
- **Headless-верификация пройдена** (`app.whenReady()` без создания окна, паттерн
  `.claude/rules/electron.md`): временный `bun build`-бандл отдельного entry-скрипта →
  `electron.exe` напрямую (обход `npx EOVERRIDE`) — `initializeDatabase`/`initializePrismaDb`/
  `registerIpcHandlers` отработали без исключений на чистой БД. Две грабли этого способа
  верификации (не связаны с самим приложением — только с bun-бандлом): `require('libsql')` не
  резолвится из чужого каталога под изолированным линкером bun (нужен временный junction), и
  `__non_webpack_require__` (защита `database.ts` от статического бандлинга `fts5-sql-bundle`)
  webpack подставляет сам, а `bun build` — нет (подставлен вручную в entry-скрипте верификации).

---

## Версия 0.1.0 (2026-09-08)

### Каркас приложения

Сгенерирован через `nx g @letar/generators:electron-app animatrona-ipfs-player` — минимальный
рабочий Nextron-каркас (Electron 44.2.0 + Next.js 16 renderer, статический экспорт). Собственный
план разработки перенесён из `apps/animatrona/PLAN.md` (раздел «Animatrona IPFS Player»,
исследование границы read/write и разделения settings-карточек 2026-09-07/08).

---

**Последнее обновление:** 2026-09-08
