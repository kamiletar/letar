# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Changed

- **Локальный дубль `enum TrackPreference` убран из `schema.zmodel`** — теперь резолвится через
  фрагмент `libs/zenstack-fragments/src/animatrona.zmodel` (импорт в шапке файла уже был).
  Консолидация выполнена `animatrona-dev` по задаче, переданной через `animatrona-coordinator-dev`
  (тред `trackpreference-fragment-consolidation`): локальные `TrackPreference`/`WatchStatus`
  Animatrona удалены, `Settings.trackPreference` теперь ссылается на фрагмент через
  `settings.zmodel`. `zenstack:generate`/`db:push`/`typecheck:tsgo`/`lint` зелёные.

### Added

- **`WatchProgressFields` вынесен в общий фрагмент** (`libs/zenstack-fragments/src/animatrona.zmodel`)
  — `currentTime`/`duration`/`completed`/`selectedAudioTrackId`/`selectedSubtitleTrackId`/
  `lastWatchedAt`, ключи (`releaseKey`/`episodeNumber`) остаются локальными. `WatchProgress`
  переведён на `with WatchProgressFields`. Безопасно сделано без правки `apps/animatrona`
  (новое имя типа, ничего не конфликтует) — в отличие от `TrackPreference`, который требует
  одновременной правки `media.zmodel` Animatrona и передан задачей `animatrona-coordinator-dev`.

- **Упакованная сборка (`nx build:win`) проверена.** `next build` → `webpack` →
  `electron-builder --win` прошли без ошибок, собраны `dist/win-unpacked/Animatrona IPFS
  Player.exe` и NSIS-инсталлятор `Animatrona IPFS Player Setup 0.6.0.exe`. Все пункты Фазы 1
  MVP из PLAN.md закрыты. Живой запуск установленного приложения не проверялся (GUI Electron
  нельзя проверить в сендбоксе).
- **Сохранение прогресса просмотра.** `main/ipc/watch-progress.handlers.ts`
  (`watchProgress:get`/`listForRelease`/`upsert`) поверх модели `WatchProgress`. `releaseKey`
  теперь реально вычисляется в `manifest:openByCid` (`AnimeManifest.animeInfoCid` →
  `AnimeInfo.externalIds.shikimori`, деградация до `cid:<directoryCid>` при ошибке или
  отсутствии). `EpisodePlayer` резюмирует позицию и выбор дорожек при повторном открытии
  эпизода, сохраняет раз в 10 сек + на паузе/окончании/закрытии. Не проверено живым прогоном
  (нет тестового CID).
- **Видеоплеер эпизода.** `renderer/app/_components/EpisodePlayer.tsx` — Shaka Player через
  `@letar/video-player-react`/`@letar/video-player-core`, раздельные аудио/субтитры (отдельные
  IPFS-файлы, не embedded MKV-дорожки), выбор дорожек (`AudioTrackSelector`/
  `SubtitleTrackSelector`, перенос из `animatrona-folder-player`). Новый IPC —
  `manifest:openEpisode` (EpisodeManifest по CID) + `ipfs:getGatewayUrl` (сам медиаконтент
  стримится напрямую с HTTP-шлюза Kubo, не через IPC). Список эпизодов раздачи выведен в UI,
  клик открывает полноэкранный плеер. Renderer переведён с `file://`/`loadFile()` на
  привилегированную схему `app://` (порт `main/protocols/app.protocol.ts` из
  `animatrona-folder-player`) — без этого ASS-субтитры (SubtitlesOctopus = Worker+WASM) не
  работали бы под `file://`. Проверено статически (typecheck/lint/webpack/`next build`
  зелёные, все ассеты SubtitlesOctopus в `out/`) — живой прогон с реальной раздачей не
  пройден (нет тестового CID), сохранение прогресса просмотра ещё не реализовано.
- **Фаза 1 продолжена: подключён `libs/ipfs-kubo-core`, реализовано чтение раздачи по CID.**
  `main/services/ipfs.ts` (ленивый запуск Kubo-ноды), `main/ipc/manifest.handlers.ts`
  (`manifest:openByCid` — манифест + список эпизодов), UI: кнопка «Открыть» запускает ноду,
  читает манифест, показывает карточку раздачи и сохраняет в `RecentRelease`. Новая иконка
  приложения (бирюзовый P2P-узел вместо заглушки-буквы генератора). Три точки подключения либы
  (package.json/tsconfig/webpack alias) + `resolve.extensionAlias` для node16/nodenext-импортов
  либы. Headless-верификация подтвердила реальный запуск embedded Kubo 0.40.1. Актуальный вопрос
  вне объёма этой сессии — сам видеоплеер (Shaka Player) для просмотра эпизодов ещё не начат.
- **Фаза 1 (частично): main-процесс — БД, IPC, UI-каркас.** `main/utils/db.ts` (синглтон
  `PrismaClient` + `@prisma/adapter-libsql`, dev/prod-пути к БД), `main/services/database.ts`
  (применение миграций через `sql.js` в упакованной сборке), IPC-хендлеры
  `tracker`/`recentRelease`/`settings` (CRUD поверх Prisma), UI в `renderer/app/page.tsx` (список
  трекеров + заглушка «посмотреть по CID» — ждёт вынос `libs/ipfs-kubo-core`). Фикс
  `main/webpack.config.js`: `libsql` в `externals` (без него сборка падает на 60 ошибках —
  webpack пытается распарсить нативные `.node`/`README.md` платформенных суб-пакетов
  `@libsql/win32-x64-msvc` как JS). Headless-верификация `app.whenReady()` (без создания окна,
  паттерн `.claude/rules/electron.md`) пройдена — инициализация БД и регистрация IPC работают.
- **Шаги 0.5/0.6 Фазы 0 закрыты**: заведён `schema.zmodel` (4 модели + `TrackPreference`),
  таргеты `zenstack:generate`/`db:push`/`db:push:data-loss`/`db:migrate`/`db:migrate:deploy`/
  `db:studio` в `project.json`. `nx typecheck:tsgo`/`nx lint` зелёные, `nx db:push` синхронизирует
  локальную SQLite. По пути найден и исправлен независимый баг скопированного
  `prisma.config.ts` — относительный путь к БД резолвился на уровень выше корня репозитория,
  фикс — `file:prisma/data/app.db`.
- Каркас приложения (`nx g @letar/generators:electron-app`).
- **Задание на реализацию шагов 0.5/0.6** — готовый к вставке `schema.zmodel` целиком (4 модели
  - enum, синтаксис прогнан на реальном `zenstack generate`), функция `getReleaseKey()`,
    чек-лист из 6 граблей. Шаг 0.4 (перевод Animatrona на миксин) выполнен `animatrona-dev`
    коммитом `0da07607` и сверен с нашей стороны — дрейфа нет.
- Решён ключ прогресса просмотра: `releaseKey` = `shikimori:<id>`, иначе `cid:<directoryCid>`
  (решение владельца — `shikimoriId` в манифестах есть всегда, CID как страховка).
- Спроектирована минимальная схема плеера (шаг 0.2): `Tracker`, `RecentRelease`, `WatchProgress`,
  урезанный `Settings` (12 полей из 30). Принцип — манифест в IPFS источник истины, БД хранит
  только локальное. Решение оставить Prisma/SQLite подкреплено замером: стек тянет единицы
  мегабайт против 84 МБ одного Kubo.
- Заведён общий фрагмент схемы `libs/zenstack-fragments/src/animatrona.zmodel` с `TrackerFields`
  (шаги 0.1 и 0.3 Фазы 0). Проверено: реконструкция `Tracker` из Animatrona поверх миксина даёт
  схему, идентичную нынешней. `PinStatus` во фрагмент не вошёл — пересечение оказалось слишком
  тонким, решение отложено в 0.2.
- **Фаза 0 «Общий фрагмент схемы»** в `PLAN.md` — 7 шагов от выбора места фрагмента до таргетов
  `zenstack:generate`/`db:push` в `project.json` (сейчас их у приложения нет вовсе). Порядок:
  сначала перевод Animatrona на фрагмент, только потом схема плеера.
- Исследование разделения `schema.zmodel` с Animatrona: раздел «Разделение схемы БД с Animatrona»
  в `PLAN.md` — какие модели идут в общий фрагмент и каким способом, плюс ограничение «миксин —
  это пересечение, а не объединение». Механизм проверен эмпирически (zenstack 3.9.3), разбор
  границ (баг form-плагина из этого разбора исправлен в v4.0.1, шаг 0.7 закрыт) —
  [zenstack-shared-fragments-across-apps](/.claude/docs/zenstack-shared-fragments-across-apps.md).
  Найдена ловушка: `@letar/zenstack-form-plugin` молча теряет все поля `type`-миксина — баг
  передан владельцу `libs/forms`.

## [0.1.0] - 2026-09-08

### Added

- Первый релиз каркаса.
