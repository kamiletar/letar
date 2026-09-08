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

## Версия 0.6.0 (2026-09-08) — Фаза 1: сохранение прогресса просмотра

- `releaseKey` реально вычисляется в `manifest:openByCid`: `AnimeManifest.animeInfoCid` →
  читается `AnimeInfo` → `externalIds.shikimori`; если `animeInfoCid` нет или чтение упало —
  деградация до `cid:<directoryCid>` (try/catch, не валит открытие раздачи).
- `main/ipc/watch-progress.handlers.ts` — `watchProgress:get`/`listForRelease`/`upsert` поверх
  модели `WatchProgress` (`@@unique([releaseKey, episodeNumber])`).
- `EpisodePlayer` при открытии эпизода читает прошлый прогресс: резюмирует позицию (если не
  `completed` и прогресс дальше 5 сек), восстанавливает выбор аудио/субтитров, если такие
  дорожки ещё есть в манифесте эпизода. Сохранение — раз в 10 сек во время воспроизведения +
  на `pause`/`ended`/размонтировании компонента (переключение эпизода, закрытие плеера).
- Не проверено живым прогоном (нет тестового CID) — тот же пробел, что у самого плеера.

---

## Версия 0.5.0 (2026-09-08) — Фаза 1: видеоплеер эпизода

- `EpisodePlayer` (`renderer/app/_components/`) — полноэкранный плеер на Shaka Player
  (`@letar/video-player-react`/`@letar/video-player-core`, тот же стек, что
  `animatrona-folder-player`), открывается кликом по эпизоду из карточки открытой раздачи.
- Аудио и субтитры эпизода — отдельные файлы в IPFS (не embedded-дорожки MKV) → режим плеера
  раздельное аудио (`usesSeparateAudioRef=true`, `<audio src>` + `useAudioSync`).
  `AudioTrackSelector`/`SubtitleTrackSelector`/`TrackDropdownButton` перенесены из
  `animatrona-folder-player` (общий UI-паттерн, не выносился в `libs/` — второй независимый
  потребитель, третьего пока нет).
- `main/ipc/manifest.handlers.ts` — `manifest:openEpisode(manifestCid)` читает
  `EpisodeManifest` (локальная копия формы типов из `libs/animatrona-types`, приложение не
  импортирует библиотеку напрямую). `main/services/ipfs.ts` — `getGatewayUrl()`. Сам медиа-
  контент (видео/аудио/субтитры) стримится в renderer напрямую с HTTP-шлюза Kubo, минуя IPC —
  структурное клонирование гигабайтного видео через IPC не годится.
- **Renderer переведён с `file://` на схему `app://`** — `main/protocols/app.protocol.ts`
  (дословный перенос из `animatrona-folder-player`), `main/background.ts` регистрирует
  привилегии до `whenReady()` и грузит `app://local/index.html`. Причина: SubtitlesOctopus
  (рендер ASS-субтитров) — Worker + WASM, блокируются под `file://` (origin `null`). Заодно
  снят хак `assetPrefix: './'` из `next.config.js` — больше не нужен. Четыре статических
  ассета SubtitlesOctopus скопированы в `renderer/public/` из того же приложения.
- **Проверено статически**: `nx typecheck:tsgo`/`nx lint` зелёные, main-процесс собирается
  webpack'ом, renderer — `next build --webpack` (статический экспорт), `out/` содержит все
  ассеты SubtitlesOctopus рядом с `index.html`. Живой прогон плеера не пройден — нет
  тестового CID с реальным эпизодом в dev-окружении.
- **Не начато**: сохранение прогресса просмотра (модель `WatchProgress` в схеме уже есть, IPC
  для неё ещё нет).

---

## Версия 0.4.0 (2026-09-08) — Фаза 1: подключение libs/ipfs-kubo-core, чтение по CID

- `libs/ipfs-kubo-core` готова координатором (коммиты `2d07a906`/`03991a38` в Animatrona) —
  подключена по образцу `apps/animatrona/main`: `package.json` dependency +
  `implicitDependencies`, `tsconfig.json` path-алиас + `include`-glob, `main/webpack.config.js`
  `resolve.alias` + новый `resolve.extensionAlias: { '.js': ['.ts', '.js'] }` (либа на
  node16/nodenext, внутренние относительные импорты пишут явный `.js`).
- `main/services/ipfs.ts` — `ensureIpfsStarted()` (ленивый singleton-старт Kubo-ноды,
  `getKuboService().initialize({ libraryPath: app.getPath('userData') })`).
- `main/ipc/manifest.handlers.ts` — `manifest:openByCid` (манифест + `EpisodesDocument`),
  `ipfs:start`.
- UI: кнопка «Открыть» в `renderer/app/page.tsx` реально запускает ноду, читает манифест,
  показывает карточку раздачи (название, число эпизодов), сохраняет в `RecentRelease`.
- Новая иконка приложения (`resources/icon.svg`) — бирюзовый градиент, play-треугольник в узле
  сети с линиями к соседним узлам, вместо заглушки-буквы «A» от генератора.
- `electron-builder.yml` — `extraResources` запись для `resources/kubo/win` (бинарник не в git,
  как у Animatrona — копируется вручную перед сборкой).
- **Headless-верификация реального запуска Kubo-ноды пройдена**: embedded Kubo 0.40.1 поднялся,
  зарегистрировался на relay, RPC-клиент подключился (`getIpfsStatus()` → `isRunning: true`).
  Реального CID для сквозной проверки чтения манифеста не было (нет опубликованной раздачи в
  dev-окружении) — код проверен статически (`typecheck:tsgo`/`lint`/webpack-сборка зелёные).
- **Не начато**: сам видеоплеер (воспроизведение эпизодов) — вне объёма этой сессии, следующий
  шаг Фазы 1 для полного MVP «посмотрел по CID → посмотрел серию».

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
