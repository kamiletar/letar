# Animatrona IPFS Player — План

Каркас сгенерирован 2026-09-08 (`nx g @letar/generators:electron-app animatrona-ipfs-player`).
Собственный план приложения — был частью [apps/animatrona/PLAN.md](/apps/animatrona/PLAN.md)
(раздел «Animatrona IPFS Player», исследование 2026-09-07/08), физически перенесён сюда
2026-09-08 по тому же паттерну, что и [animatrona-folder-player](/apps/animatrona-folder-player/PLAN.md).

## Идея и позиционирование

Три продукта по аналогии с K-Lite Lite/Full/Mega:

- `animatrona-folder-player` — Lite: просмотр локальных папок, без IPFS.
- **`animatrona-ipfs-player` (этот план)** — Standard: только просмотр раздач через IPFS, без
  импорта/кодирования.
- `animatrona` — Mega: всё (импорт + кодирование + просмотр + библиотека). Не трогаем, остаётся
  полнофункциональной.

Подавляющему большинству пользователей не нужны импорт с Rutracker/торрентов, ffmpeg
транскодирование, профили кодирования, сборка MKV — они хотят посмотреть уже готовый релиз,
которым кто-то поделился через IPFS. Сейчас за это приходится ставить тот же инсталлятор
(**282 МБ**), что и релиз-мейкеры используют для создания контента.

## Решено с владельцем

| Вопрос                  | Решение                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Объём функциональности  | **⚠️ Только просмотр (2026-09-08, финальное уточнение владельца).** Добавить трекер в список раздач, посмотреть конкретную раздачу по её `directoryCid` — и всё. Никаких подписок с авто-обновлением, discover-ленты, федерации с ключами/доверием, скачивания торрентов, публикации, редактирования watch-статуса на удалённых серверах. |
| IPFS-доступ             | **Полный узел Kubo** (не HTTP-gateway) — участвует в раздаче (сидирует), не зависит от доступности стороннего шлюза                                                                                                                                                                                                                      |
| `libs/ipfs-kubo-core`   | **Решено (2026-09-08): только Animatrona + IPFS Player на старте.** `animatrona-tracker` — другой рантайм (веб-бэкенд, не Electron main); добавлять его в общую библиотеку только при реальной обнаруженной необходимости                                                                                                                |
| ffprobe                 | **Не нужен вообще** (подтверждено разбором кода 2026-09-08) — все метаданные дорожек уже в IPFS-манифесте `manifest.json`, даже creator-путь восстановления битых CID не перечитывает видео через ffprobe для метаданных                                                                                                                 |
| Судьба самой Animatrona | Не трогаем — остаётся Mega-продуктом                                                                                                                                                                                                                                                                                                     |

⚠️ **История решения по объёму нелинейна** — в течение 2026-09-08 объём федерации/подписок менялся
дважды в одной сессии: сначала «только sync/discover без ключей», затем «полная федерация со
своими ключами», затем финально отменено до «только просмотр по трекеру+CID». Ниже везде уже
финальная версия; не путать с более ранними параграфами `apps/animatrona/PLAN.md` (там сохранена
историческая последовательность решений as-is, по правилу не переписывать историю).

## Границы: что переносится, что нет

### Read/write разбор IPFS/Kubo сервисов (2026-09-08, полный разбор кода)

- **Чистый SHARED (переносить как есть, без изменений):** `kubo-service.ts` (767 строк),
  `kubo-daemon.ts` (602 строки), `peer-sync-service.ts` (486 строк) — ни одной Prisma/
  `ImportQueueController`-зависимости во всех трёх; жизненный цикл демона, конфиг (в т.ч.
  `Provide.Strategy: 'roots'`), bootstrap/peering sync одинаково нужны и creator, и viewer.
  `pin-manager.ts` (353 строки) тоже чистый SHARED — весь стейт в локальном `pins.json`, без БД.
- **Чистый WRITE/creator-only — НЕ переносить:** `anime-directory-builder.ts` (1445 строк,
  `buildAnimeDirectory()` строит `directoryCid` из полной Prisma-модели библиотеки —
  Anime/Episode/треки/шрифты), `pin-status-service.ts` (312 строк, `scanAndRegisterLocalCids()`
  сканирует всю творческую БД), `pin-normalizer.ts` (182 строки, `normalizeAllPins()`, гейтится
  через `ImportQueueController.hasActiveImport()`).
- **Смешанный файл, нужен splitting по экспортам, не по файлу целиком:**
  `unified-ipfs-service.ts` (504 строки) — `cat/stat/has/safeCat/probeCidAvailable/saveToFile`
  READ (нужны как есть), `addFile/addBytes/addDirectory/createDirectoryFromCids` WRITE (НЕ
  переносить — публикация), `repoGc()` формально универсален, но жёстко гейтится через
  `ImportQueueController.hasActiveImport()` — гейт нужно убрать целиком (у IPFS Player нет очереди
  импорта).

### `settings/_settings/*` — 14 карточек Animatrona, факт использования (24 файла, 2026-09-08)

Учитывая финальное решение «только просмотр», реальный перенос сильно у́же черновой
классификации по имени файла:

- **Переносится:** `PlayerSettingsCard` (предпочтения плеера), `ThemeSettingsCard`,
  `TraySettingsCard`, `UpdateSettingsCard(New)` — общая инфраструктура окна/обновлений.
  `p2p-sharing/IpfsStatusSection.tsx`+`use-ipfs.ts` (запуск/статус Kubo-ноды — базовая
  инфраструктура, нужна любому IPFS-узлу), `p2p-sharing/PeerSyncSection.tsx` (синхронизация
  bootstrap/relay-серверов), `p2p-sharing/IpfsAuditSection.tsx`+`use-ipfs-audit.ts` (обслуживание
  локальных pin'ов — актуально независимо от источника контента), `LogsTab` (просмотр `main.log`,
  ничего контентного). `LibrarySettingsCard` частично — `libraryPath`/`ipfsStorageMaxGb`/очистка
  библиотеки нужны, поле `outputPath` (папка транскодирования) — нет, убрать при переносе.
- **НЕ переносится (creator-only):** `EncodingProfilesCard`, `TranscodingSettingsCard`,
  `QBittorrentSettingsCard`, `TorrentSettingsCard`, `TrackerPublishingCard`,
  `p2p-sharing/PublishingSection.tsx`+`use-publisher.ts` (генерация/публикация IPNS-манифеста
  своей библиотеки — у IPFS Player нет своей библиотеки на публикацию).
- **НЕ переносится (объём урезан финальным решением «только просмотр»):**
  `p2p-sharing/SubscriptionsSection.tsx`+`use-subscriptions.ts` (авто-обновляемые подписки),
  `p2p-sharing/SchedulerSection.tsx`+`use-scheduler.ts` (обслуживает Subscriptions),
  `p2p-sharing/P2PStatsTab.tsx`+`use-p2p-stats.ts`, `MobileAccessCard` (просмотр с телефона —
  отдельная фича, не входит в MVP «добавил трекер → посмотрел по CID»),
  `p2p-sharing/RemotePinningSection.tsx`+`use-remote-pin.ts` (резервный пин через Pinata — не
  нужен, если библиотека не своя). Если что-то из этого понадобится позже — заводить отдельным
  пунктом плана с explicit решением владельца, не по инерции черновой классификации.
- **`FederationCard`+`use-federation.ts` — НЕ переносится почти целиком.** Из всей 24КБ-карточки
  нужны только два действия: (1) добавить трекер в список (источник для просмотра по CID, без
  криптографии и доверия к нему как к пиру), (2) посмотреть раздачу по `directoryCid`. Писать эти
  два действия заново компактным UI, не резать по кускам существующей карточки.
- **UNCLEAR:** жив ли `UpdateSettingsCard.tsx` (старая версия, отличная от `New`) —
  `page.tsx` Animatrona импортирует `UpdateSettingsCardNew` напрямую, минуя барабанный `index.ts`,
  который экспортирует именно старую карточку. Похоже на мёртвый код в Animatrona — проверить
  перед переносом (переносить однозначно `New`).
- **Технический долг обоих составных хуков:** `use-p2p-sharing.ts` (композитный) и
  `use-settings.ts` в Animatrona тянут creator-only зависимости (`usePublisher`,
  `useFindManyEncodingProfile`) вместе с нужными IPFS Player частями — при переносе оба потребуют
  расщепления, копировать как есть нельзя.

### Оценка веса (предварительно)

| Компонент              | Animatrona (текущая) | IPFS Player (оценка)                                                                                                                         |
| ---------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ffmpeg.exe`           | 202 МБ               | нет (просмотр — работа Shaka Player, не ffmpeg)                                                                                              |
| `ffprobe.exe`          | 193 МБ               | нет — подтверждено, все метаданные дорожек уже в IPFS-манифесте                                                                              |
| `kubo.exe`             | 84 МБ                | остаётся (решение владельца — полный узел)                                                                                                   |
| SQLite/Prisma/миграции | есть                 | под вопросом — при объёме «только просмотр» может хватить сильно урезанной схемы, требует пересчёта                                          |
| **Итог**               | ~282 МБ              | ориентировочно заметно ниже прежней оценки 80–130 МБ — сама область функциональности сократилась сильнее, чем предполагала оценка 2026-09-07 |

## Разделение схемы БД с Animatrona (исследовано 2026-09-08)

Часть моделей нужна и Animatrona, и IPFS Player (`Tracker`, `PinStatus`+`RemotePinStatus`,
кэш раздачи по CID, урезанный `Settings`). Копипастить их между приложениями нельзя — разъедутся.
Механизм переиспользования в монорепо есть и проверен эмпирически (zenstack 3.9.3), полный
разбор с границами и ловушками —
[zenstack-shared-fragments-across-apps](/.claude/docs/zenstack-shared-fragments-across-apps.md).

Итог для этого приложения:

| Модель                          | Способ                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `PinStatus` + `RemotePinStatus` | ⚠️ пересмотрено 2026-09-08 — во фрагмент **не** вошёл, пересечение оказалось слишком тонким (см. 0.3)      |
| `Tracker`                       | `type`-миксин — у Animatrona поверх него своя relation `importedContent FederatedContent[]`, у плеера нет |
| кэш раздачи по CID              | новая модель, только у плеера — в общий фрагмент не идёт                                                  |
| `Settings`                      | НЕ выносить — у плеера радикально урезанный набор полей, общего мало                                      |

⚠️ **Перед выносом любой модели, по которой будут строиться формы `@letar/forms`, — свериться с
ловушкой form-плагина** в доке выше: `@letar/zenstack-form-plugin` молча теряет поля миксина
(генерация exit 0, `<Model>.form.ts` неполный). У Animatrona form-плагин подключён, поэтому риск
реальный, а не теоретический. Баг отправлен владельцу `libs/forms`.

⚠️ Nx не видит связи «фрагмент → приложение» (подключение файловым путём, не TS-алиасом): после
правки общего фрагмента `nx zenstack:generate` нужно запускать **на каждом** потребителе руками,
`nx affected` их не поймает.

### ⚠️ Миксин — это пересечение, а не объединение

Поле, попавшее в `type`-миксин, получают **все** потребители. Убрать его у одного или
переопределить с другим атрибутом нельзя (`Duplicated declaration name`, проверено). Значит во
фрагмент идёт только пересечение потребностей, а специфика дописывается каждым приложением
поверх.

Практически для `Tracker`: `trustLevel`/`uptimePercent`/`avgResponseTimeMs`/`contentQuality`/
`successfulSyncs`/`failedSyncs`/`contentSynced` — это trust-система федерации, плееру при объёме
«только просмотр» она не нужна. Значит в `TrackerFields` идут только `id`/`url`/`name`/
`description`/`theme`/`language`/`lastCheckedAt`/таймстемпы, а вся trust-часть и enum `TrustLevel`
остаются в Animatrona поверх миксина. Точный состав пересечения — задача 0.2 ниже.

## Фаза 0 — общий фрагмент схемы (предусловие Фазы 1)

Порядок принципиален: сначала фрагмент и перевод на него Animatrona, только потом схема плеера.
Наоборот — значит получить вторую копию моделей, которая разъедется с оригиналом (та же логика,
что и с `libs/ipfs-kubo-core`).

- [x] **0.1 Место фрагмента** — ✅ решено владельцем 2026-09-08: вторым файлом в существующую
      `libs/zenstack-fragments/src/`, отдельную либу не заводим.
- [x] **0.2 Минимальная схема плеера** — ✅ спроектирована 2026-09-08, см. раздел
      «Схема плеера» ниже. Закрывает первый пункт «Открытых вопросов».
- [x] **0.3 Завести фрагмент** — ✅ `libs/zenstack-fragments/src/animatrona.zmodel` с
      `TrackerFields` (9 полей: `id`/`url`/`name`/`description`/`theme`/`language`/
      `lastCheckedAt`/`createdAt`/`updatedAt`, плюс `@@index([lastCheckedAt])` и
      `@@allow('all', true)` прямо в миксине).
      **Проверено:** реконструкция `Tracker` из Animatrona поверх этого миксина даёт схему,
      идентичную нынешней — 24 строки полей/атрибутов/индексов совпали с
      `apps/animatrona/renderer/src/generated/schema.prisma` один в один.

      ⚠️ **`PinStatus` во фрагмент НЕ вошёл** (отклонение от таблицы выше, сделано осознанно).
      Все его содержательные поля — `status`/`queuedAt`/`pinnedAt`/`errorMsg`/`retryCount` —
      обслуживают **удалённое** пиннинг-очередь, а remote pinning в объём плеера не входит
      (`RemotePinningSection` в списке «не переносится»). Локальное состояние пинов
      `pin-manager.ts` держит в `pins.json`, не в БД. Пересечение сводится к `id`/`cid`/
      таймстемпам — слишком тонко, чтобы оправдать связанность двух приложений. Решать в 0.2,
      когда станет ясно, нужна ли плееру вообще таблица пинов.
- [x] **0.4 Перевести Animatrona на фрагмент** — ✅ выполнено `animatrona-dev` 2026-09-08,
      коммит `0da07607` (`federation.zmodel`: −28 строк, `model Tracker with TrackerFields`).
      Проверено независимо с нашей стороны: состав `Tracker` в её сгенерированной
      `schema.prisma` **совпал со слепком до перевода** — те же 24 строки полей/атрибутов/
      индексов, дрейфа нет, миграция не потребовалась. Путь для схемы плеера свободен.
- [ ] **0.5 Завести `schema.zmodel` плеера** на готовом фрагменте: `datasource` sqlite,
      `plugin policy` (обязателен, иначе `@@allow` из фрагмента не резолвится), `plugin prisma`,
      свои модели (кэш раздачи по CID, урезанный `Settings`).
- [ ] **0.6 Добавить таргеты в `project.json` плеера** — сейчас там только
      `dev`/`build:win`/`lint`/`typecheck:tsgo`/`format`, ни `zenstack:generate`, ни `db:push`
      нет вовсе. Брать за образец `apps/animatrona/project.json`.
- [x] **0.7 Баг form-плагина** — ✅ снят 2026-09-08, исправлен в `@letar/zenstack-form-plugin`
      v4.0.1 (`collectAllFields()` разворачивает `model.mixins` рекурсивно). Проверено повторным
      прогоном контрольного опыта: form-схема через миксин и через прямое объявление —
      идентичны побайтово. Ограничение на вынос моделей с формами снято, `plugin formSchema`
      подключаем как обычно.
      ⚠️ При этом фикс живёт в `dist/`, который не коммитится: перед первой генерацией нужен
      `nx build zenstack-form-plugin`, иначе плагин отработает старым артефактом молча. Проверка —
      `grep -c collectAllFields libs/zenstack-form-plugin/dist/model-generator.js`.

## Схема плеера (спроектирована 2026-09-08, шаг 0.2)

### Главный принцип: манифест — источник истины, БД хранит только локальное

Всё про саму раздачу (название, постер, список эпизодов, метаданные, дорожки) лежит в IPFS и
адресуется по CID, то есть **неизменяемо**. Дублировать это в SQLite незачем и вредно — получим
две правды. БД хранит ровно то, чего в IPFS нет:

1. что пользователь **добавил** — список трекеров;
2. что пользователь **сделал** — прогресс просмотра и недавно открытое;
3. **локальные настройки**.

### Нужна ли вообще БД (проверено измерением, а не на глаз)

Родственный `animatrona-folder-player` (Lite) обходится вообще без БД — у него
`@letar/electron-storage` (JSON-файл в `userData`). Поэтому вопрос стоял всерьёз. Замер стека
Animatrona (Prisma 7 + driver adapter libsql, без rust-движка):

| Компонент                                      | Размер                         |
| ---------------------------------------------- | ------------------------------ |
| `query_compiler_fast_bg.wasm` (+ base64-копия) | 3.2 МБ (+4.3 МБ)               |
| `sql.js` — применение миграций в рантайме      | 9.3 МБ пакет (в сборку — wasm) |
| `@prisma/adapter-libsql` + `@libsql/client`    | ~0.4 МБ                        |
| `kubo.exe` — для сравнения, остаётся           | **84 МБ**                      |

**Вывод: БД оставляем.** Стек тянет единицы мегабайт против 84 МБ одного только Kubo — не он
делает инсталлятор тяжёлым. JSON-хранилище выиграло бы копейки, но проиграло бы в запросах
(«продолжить просмотр» — сортировка по `lastWatchedAt`, поиск по ключу среди тысяч записей).

### Модели

**1. `Tracker with TrackerFields`** — своих полей сверх миксина не нужно.

**2. `RecentRelease`** — тонкая карточка недавно открытой раздачи, чтобы рисовать список
«недавнее» без похода в IPFS (медленно, а офлайн — вовсе никак). Не метаданные, а именно то
минимальное, что нужно карточке:

| Поле                                     | Зачем                                             |
| ---------------------------------------- | ------------------------------------------------- |
| `directoryCid` `@unique`                 | что открывали                                     |
| `name`, `posterCid`, `episodesCount`     | отрисовать карточку без сети                      |
| `shikimoriId Int?`                       | стабильный ключ раздачи между версиями (см. ниже) |
| `trackerId String?` + relation `Tracker` | откуда пришло; nullable — CID можно ввести руками |
| `firstOpenedAt`, `lastOpenedAt`          | сортировка списка                                 |

**3. `WatchProgress`** — прогресс просмотра. Копируется по смыслу с `DiscoverWatchProgress`
Animatrona (прогресс **без FK** на библиотеку — ровно наш случай), но с другим ключом:

| Поле                                              | Заметка                         |
| ------------------------------------------------- | ------------------------------- |
| `releaseKey`, `episodeNumber` + `@@unique`        | идентичность, см. развилку ниже |
| `currentTime`, `duration`, `completed`            | сам прогресс                    |
| `selectedAudioTrackId`, `selectedSubtitleTrackId` | выбор дорожек из манифеста      |
| `lastWatchedAt` + `@@index`                       | «продолжить просмотр»           |

⚠️ **Развилка по ключу — требует решения.** Animatrona ключует `DiscoverWatchProgress` по
`shikimoriId + episodeNumber`, и не случайно: `directoryCid` **меняется при каждом обновлении
раздачи** (вышла новая серия → новый CID директории), и прогресс, привязанный к нему, осиротеет.
Но `shikimoriId` лежит не в самом манифесте, а в `AnimeInfo` по отдельному CID, и у
некастомного контента его может не быть вовсе.

Предлагаю `releaseKey String` = `shikimoriId`, когда он есть, иначе `directoryCid` — то есть
стабильный ключ с деградацией. Плеер всё равно тянет `AnimeInfo`, чтобы показать страницу
раздачи, так что дополнительного запроса это не стоит. Альтернатива (ключ по `directoryCid`)
проще, но теряет прогресс при каждом обновлении раздачи — для сериала это происходит еженедельно.

**4. `Settings`** (singleton) — из 30 полей Animatrona остаются 12:

- **IPFS:** `ipfsRepoPath String?`, `ipfsStorageMaxGb Int @default(100)`
- **Трей:** `minimizeToTray`, `closeToTray`, `showTrayNotification`
- **Интерфейс:** `darkMode`, `language`
- **Плеер:** `skipOpening`, `skipEnding`, `autoplay`, `trackPreference`, `volume Float @default(1)`

Не переносится: весь блок транскодирования (`useGpu`/`videoCodec`/`videoQuality`/`videoPreset`/
`audioBitrate`), `outputPath`/`exportPath`, `defaultProfile`, мобильный доступ, торрент-бэкенд,
`chaptersMigrated`. `ipfsStorageMaxGb` дефолт снижен с 500 до 100 ГБ — плеер не держит свою
библиотеку на раздаче.

### Ключ прогресса просмотра — решено владельцем (2026-09-08)

`releaseKey` = **`shikimoriId`, когда он есть, иначе `directoryCid`**. Владелец подтвердил: в
манифестах `shikimoriId` должен быть всегда, `directoryCid` — страховка на случай, если его
почему-то не оказалось.

Где брать (точный путь для реализации): `AnimeManifest.animeInfoCid` → достать по этому CID
документ `AnimeInfo` → `animeInfo.externalIds.shikimori`. В типах
(`libs/animatrona-types/src/anime-info.ts:108`) поле `externalIds` **обязательное**, а
`shikimori?: number` внутри — опциональный: отсюда и страховка.

Почему не просто `directoryCid`: он меняется при **каждом** обновлении раздачи (вышла новая
серия → новый CID директории), и весь прогресс по сериалу осиротел бы еженедельно.

```ts
/** Стабильный ключ раздачи: shikimoriId, иначе CID директории */
export function getReleaseKey(shikimoriId: number | undefined, directoryCid: string): string {
  return shikimoriId !== undefined ? `shikimori:${shikimoriId}` : `cid:${directoryCid}`
}
```

Префиксы обязательны — без них числовой ID и CID могут теоретически совпасть по строке, а
`@@unique([releaseKey, episodeNumber])` этого не заметит.

### Что это добавляет к общему фрагменту

Два новых кандидата, оба — чистое пересечение без relation'ов:

- **`TrackPreference`** (enum `RUSSIAN_DUB`/`ORIGINAL_SUB`/`AUTO`) — нужен обоим, но лежит в
  creator-файле `media.zmodel` Animatrona вместе с кодеками. Переносить в
  `animatrona.zmodel` — иначе плееру придётся объявлять свою копию, и они разъедутся.
- **`WatchProgressFields`** — пересечение трёх моделей (`WatchProgress` и
  `DiscoverWatchProgress` Animatrona + наша): `currentTime`, `completed`,
  `selectedAudioTrackId`, `selectedSubtitleTrackId`, `lastWatchedAt`. Идентичность и `@@unique`
  у всех трёх разные, поэтому в миксин идёт только «полезная нагрузка» плеера, а ключи каждая
  модель объявляет сама.

Оба требуют правки `apps/animatrona` → идут задачей координатору, вместе с 0.4.

## Задание на реализацию (шаги 0.5 и 0.6) — готово к исполнению

Всё спроектировано и проверено, ниже — то, что можно делать без повторного исследования.
Фрагмент `TrackerFields` уже в репозитории (коммит `346990c0`), синтаксис ниже прогнан на
реальном `zenstack generate` 3.9.3.

### Шаг 0.5 — завести `apps/animatrona-ipfs-player/schema.zmodel`

Файл целиком, можно вставлять как есть:

```zmodel
import "../../libs/zenstack-fragments/src/animatrona"

datasource db {
  provider = "sqlite"
}

generator client {
  provider      = "prisma-client-js"
  output        = "./prisma"
  binaryTargets = ["native", "windows"]
}

plugin policy {
  provider = "@zenstackhq/plugin-policy"
}

plugin prisma {
  provider = "@core/prisma"
  output   = "./renderer/src/generated/schema.prisma"
}

plugin formSchema {
  provider = "../../libs/zenstack-form-plugin/dist/index.js"
  output   = "./renderer/src/generated/form-schemas"
}

/// Предпочтение дорожек при первом просмотре
///
/// ⚠️ Временная локальная копия enum'а из `apps/animatrona/schema/models/media.zmodel`.
/// Консолидация во фрагмент отложена намеренно — см. «Отложено» ниже.
enum TrackPreference {
  /// Русская озвучка + субтитры надписей
  RUSSIAN_DUB
  /// Оригинальная дорожка + полные субтитры
  ORIGINAL_SUB
  /// Автовыбор по доступности
  AUTO
}

/// Трекер — источник раздач. Все поля из общего миксина, своих не нужно.
model Tracker with TrackerFields {
}

/// Недавно открытая раздача — тонкая карточка для списка «недавнее».
///
/// НЕ кеш метаданных: всё содержательное лежит в IPFS по `directoryCid` и неизменяемо.
/// Здесь ровно то, чем нарисовать карточку, когда сети нет.
model RecentRelease {
  id             String    @id @default(cuid())

  /// CID директории раздачи — что именно открывали
  directoryCid   String    @unique

  /// Название (из манифеста, для отображения)
  name           String

  /// CID постера
  posterCid      String?

  /// Количество эпизодов в раздаче
  episodesCount  Int       @default(0)

  /// Shikimori ID — стабильный ключ раздачи между её версиями
  shikimoriId    Int?

  /// Откуда пришла раздача; null — CID ввели руками
  trackerId      String?
  tracker        Tracker?  @relation(fields: [trackerId], references: [id], onDelete: SetNull)

  firstOpenedAt  DateTime  @default(now())
  lastOpenedAt   DateTime  @default(now())

  // Desktop-приложение без аутентификации
  @@allow('all', true)

  @@index([lastOpenedAt])
  @@index([shikimoriId])
}

/// Прогресс просмотра — без FK на библиотеку (её у плеера нет).
///
/// Смысловой аналог `DiscoverWatchProgress` из Animatrona, но ключ другой — см. раздел
/// «Ключ прогресса просмотра» выше.
model WatchProgress {
  id                      String   @id @default(cuid())

  /// Стабильный ключ раздачи: `shikimori:<id>` либо `cid:<directoryCid>`
  releaseKey              String
  /// Номер эпизода
  episodeNumber           Int

  /// Текущая позиция (сек)
  currentTime             Float    @default(0)
  /// Длительность (сек)
  duration                Float    @default(0)
  /// Досмотрен до конца
  completed               Boolean  @default(false)

  /// ID выбранной аудиодорожки из манифеста
  selectedAudioTrackId    String?
  /// ID выбранных субтитров из манифеста (null — выключены)
  selectedSubtitleTrackId String?

  lastWatchedAt           DateTime @default(now())

  @@allow('all', true)

  @@unique([releaseKey, episodeNumber])
  @@index([lastWatchedAt])
}

/// Настройки приложения (singleton) — 12 полей против 30 у Animatrona
model Settings {
  id                   String          @id @default("default")

  // === IPFS ===

  /// Путь к репозиторию Kubo
  ipfsRepoPath         String?         @meta("form.title", "Папка IPFS-хранилища")

  ipfsStorageMaxGb     Int             @default(100) @meta("form.title", "Макс. размер IPFS хранилища (ГБ)") @meta("form.fieldType", "slider") @meta("form.props.min", 10) @meta("form.props.max", 4000) @meta("form.props.step", 10) @meta("form.props.showValue", true)

  // === Системный трей ===

  minimizeToTray       Boolean         @default(true) @meta("form.title", "Сворачивать в трей") @meta("form.fieldType", "switch")

  closeToTray          Boolean         @default(true) @meta("form.title", "Закрытие окна в трей") @meta("form.fieldType", "switch")

  showTrayNotification Boolean         @default(true) @meta("form.title", "Уведомление при сворачивании") @meta("form.fieldType", "switch")

  // === Интерфейс ===

  darkMode             Boolean         @default(true) @meta("form.title", "Тёмная тема") @meta("form.fieldType", "switch")

  language             String          @default("ru") @meta("form.title", "Язык интерфейса") @meta("form.fieldType", "select") @meta("form.props.options", ["ru","en","ja"])

  // === Плеер ===

  skipOpening          Boolean         @default(false) @meta("form.title", "Автопропуск опенинга") @meta("form.fieldType", "switch")

  skipEnding           Boolean         @default(false) @meta("form.title", "Автопропуск эндинга") @meta("form.fieldType", "switch")

  autoplay             Boolean         @default(true) @meta("form.title", "Автовоспроизведение") @meta("form.fieldType", "switch")

  trackPreference      TrackPreference @default(AUTO) @meta("form.title", "Предпочтение дорожек") @meta("form.fieldType", "radioCard")

  /// Громкость плеера (0–1) — общая, а не на каждый эпизод
  volume               Float           @default(1)

  updatedAt            DateTime        @updatedAt

  @@allow('all', true)
}
```

### Шаг 0.6 — таргеты в `project.json`

Сейчас у приложения только `dev`/`build:win`/`lint`/`typecheck:tsgo`/`format` — ни
`zenstack:generate`, ни `db:push` нет вовсе. Брать за образец `apps/animatrona/project.json`
(тот же стек: sqlite + libsql-адаптер + генерация в `renderer/src/generated`).

### Чек-лист исполнителю — грабли, на которых легко потерять час

1. **Перед первой генерацией — `nx build zenstack-form-plugin`.** Плагин подключается путём к
   `dist/`, а `dist/` не коммитится. Проверка, что артефакт свежий:
   `grep -c collectAllFields libs/zenstack-form-plugin/dist/model-generator.js` → должно быть > 0.
   Иначе поля миксина молча пропадут из form-схем (баг был закрыт в v4.0.1 — но старый `dist`
   вернёт его).
2. **`plugin policy` обязателен.** Без него `@@allow` из фрагмента не резолвится, и ошибка
   покажет на строку **фрагмента**, хотя причина в схеме приложения.
3. **`import` — первой строкой**, до `datasource`/`generator`/`plugin`. Иначе
   `Expecting token of type 'EOF' but found 'import'`.
4. **Не переопределять поля миксина.** Добавить `@unique` к `url` «для надёжности» нельзя —
   `Duplicated declaration name`. Оно там уже есть.
5. **Nx не свяжет фрагмент с приложением.** После любой правки
   `libs/zenstack-fragments/src/animatrona.zmodel` регенерацию каждого потребителя запускать
   руками, `nx affected` их не увидит.
6. **Pre-commit `schema-migration-check` может ложно сработать.** На переводе Animatrona
   (коммит `0da07607`) хук принял удаление полей, уехавших в миксин, за структурное изменение
   схемы и потребовал миграцию, которой не нужно. Обходится
   `GIT_ALLOW_SCHEMA_WITHOUT_MIGRATION=1` — но **только** предъявив доказательство: вывод
   `nx db:push` со словами «already in sync». Обоснование писать в тело коммита.
   У нас случай другой (новая схема с нуля, а не правка существующей), но хук может
   среагировать так же.

Приёмка шага: `nx zenstack:generate animatrona-ipfs-player` отрабатывает, в
`renderer/src/generated/schema.prisma` четыре модели и enum, `nx typecheck:tsgo` и `nx lint`
зелёные.

### Отложено намеренно (не делать в этой итерации)

- **Консолидация `TrackPreference` во фрагмент.** Enum живёт в creator-файле
  `media.zmodel` Animatrona рядом с кодеками. Перенос требует одновременного удаления оттуда и
  добавления во фрагмент — иначе после 0.4 (когда Animatrona начнёт импортировать фрагмент)
  получится дублирующее объявление. Плюс `media.zmodel` придётся заставить импортировать
  фрагмент напрямую (импорты не транзитивны). Ради enum'а из трёх значений это лишний риск
  прямо сейчас — плеер держит локальную копию, консолидация отдельной задачей.
- **`WatchProgressFields` во фрагмент** — та же причина: требует правки двух моделей
  Animatrona, а выигрыш пять полей. Делать вместе с консолидацией `TrackPreference`, одной
  задачей координатору.

## Открытые вопросы

- [x] ✅ Набор моделей под объём «только просмотр» пересчитан — см. раздел «Схема плеера» выше
      (`Tracker`, `RecentRelease`, `WatchProgress`, урезанный `Settings`). Черновик 2026-09-07
      (`Anime`/`Episode`/`Subscription`/`FederatedContent`/`UserStats`/`Reputation`/
      `Achievements`/`Bonus`) отпал целиком: он был про удержание в экосистеме, не про
      «посмотреть по CID». `PinStatus` тоже не понадобился — см. 0.3.
- [ ] `libs/ipfs-kubo-core` — решить порядок переноса: сначала выделить SHARED-часть
      (`kubo-service`/`kubo-daemon`/`peer-sync-service`/`pin-manager`) из Animatrona в либу, обновить
      Animatrona на импорт из либы, только потом заводить IPFS Player на готовую либу — не
      копипастить в IPFS Player, чтобы не создать вторую копию, которая разъедется с оригиналом.
- [ ] Расщепить `unified-ipfs-service.ts` на READ/WRITE — READ-часть в либу, WRITE-часть
      остаётся в Animatrona.
- [ ] Написать компактный UI «добавить трекер → посмотреть по CID» с нуля, не резать
      `FederationCard`.

## Фаза 1 — MVP (каркас, из шаблона генератора)

- [ ] Заменить placeholder-иконку и заголовок
- [ ] Закрыть **Фазу 0** (общий фрагмент схемы) и оставшиеся «Открытые вопросы» — предварительное
      условие для реальной бизнес-логики, не начинать с UI/IPC вперёд схемы
- [ ] Бизнес-логика в `main/services/` — Kubo-нода (SHARED из будущей `libs/ipfs-kubo-core`),
      чтение манифеста по CID
- [ ] IPC-хендлеры в `main/ipc/`
- [ ] UI в `renderer/app/page.tsx` — список трекеров + поле «посмотреть по CID»
- [ ] Проверка dev-режима и упакованной сборки (`nx build:win animatrona-ipfs-player`)
