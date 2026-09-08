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
- [x] **0.5 Завести `schema.zmodel` плеера** — ✅ выполнено 2026-09-08, текст вставлен как есть
      из задания ниже (с одной правкой: у `Tracker` добавлена обратная сторона relation
      `recentReleases RecentRelease[]` — без неё `zenstack generate` требует opposite field).
- [x] **0.6 Добавить таргеты в `project.json` плеера** — ✅ выполнено 2026-09-08, по образцу
      `apps/animatrona/project.json` (`zenstack:generate`/`db:push`/`db:push:data-loss`/
      `db:migrate`/`db:migrate:deploy`/`db:studio`).
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

1. **В `zenstack:generate` обязателен `dependsOn` на сборку form-плагина** — тот же, что у
   остальных 14 приложений:
   `"dependsOn": [{ "projects": ["@letar/zenstack-form-plugin"], "target": "build" }]`.
   Плагин подключается путём к `dist/`, а `dist/` не коммитится; с этим `dependsOn` Nx
   пересобирает его сам перед генерацией, без него приложение станет единственным, где старый
   артефакт молча съест поля миксина. Запуская генерацию **мимо Nx** (прямой бинарник, worktree),
   собирай руками: `nx build zenstack-form-plugin`, проверка —
   `grep -c collectAllFields libs/zenstack-form-plugin/dist/model-generator.js` > 0.
2. **`plugin policy` обязателен.** Без него `@@allow` из фрагмента не резолвится, и ошибка
   покажет на строку **фрагмента**, хотя причина в схеме приложения.
3. **`import` — первой строкой**, до `datasource`/`generator`/`plugin`. Иначе
   `Expecting token of type 'EOF' but found 'import'`.
4. **Не переопределять поля миксина.** Добавить `@unique` к `url` «для надёжности» нельзя —
   `Duplicated declaration name`. Оно там уже есть.
5. **Nx не свяжет ФРАГМЕНТ с приложением** (в отличие от плагина — там связь есть через
   `dependsOn`). Замер: правка `libs/zenstack-fragments/src/animatrona.zmodel` даёт в
   `nx show projects --affected` только сам `@letar/zenstack-fragments`, приложений в списке нет.
   Значит после любой правки фрагмента регенерацию каждого потребителя запускать руками.
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

✅ **Выполнено 2026-09-08** — все условия приёмки подтверждены. Дополнительно найдены и
исправлены две проблемы, которых не было в задании:

1. **Missing opposite relation.** `RecentRelease.tracker` требует обратного поля на `Tracker`
   (`Could not resolve...` при генерации без него) — добавлено `recentReleases
   RecentRelease[]` в модель `Tracker`.
2. **Путь к SQLite-файлу резолвился НЕ туда.** Скопированный из `apps/animatrona/prisma.config.ts`
   `url: 'file:../../../prisma/data/app.db'` для этого приложения (`cwd` таргетов —
   `apps/animatrona-ipfs-player`, та же глубина от корня репо, что и у `apps/animatrona`)
   создавал БД на уровень **выше корня всего репозитория** — `C:\web\prisma\data\app.db`, а не
   `apps/animatrona-ipfs-player/prisma/data/app.db`. Почему у Animatrona тот же относительный
   путь резолвится иначе — не выяснено (возможно, её реальная dev-БД создаётся не через
   `nx db:push`, а рантаймом самого приложения по другому пути; сама CLI-команда `nx db:push
   animatrona` при этом относительном пути могла молча писать БД в то же чужое место, никем не
   замеченная). Фикс для плеера — путь без `../../../`, просто `file:prisma/data/app.db`
   (относительно `cwd`, которым уже является корень приложения). Ошибочно созданный файл вне
   репозитория удалён. `prisma/data/` добавлена в `.gitignore` приложения (у плеера её не было —
   в отличие от Animatrona, где `.gitignore` эту папку игнорирует с самого начала).

Также создана и закоммичена начальная миграция `20260908100205_init` (`nx db:migrate`) —
pre-commit `schema-migration-check` верно потребовал миграцию в том же коммите, что и первый
`schema.zmodel`; это не ложное срабатывание, обходить флагом не пришлось.

### Закрыто

**Консолидация `TrackPreference` во фрагмент — сделано (2026-09-09).** Задача была передана
`animatrona-coordinator-dev` (2026-09-08, тред `trackpreference-fragment-consolidation`), так как
enum жил в creator-файле `media.zmodel` Animatrona и перенос требовал одновременной правки
`apps/animatrona` (не входит в объём этого приложения). Координатор поручил `animatrona-dev`
одним коммитом убрать локальные `TrackPreference`/`WatchStatus` из `apps/animatrona/schema/` и
подключить фрагмент в `settings.zmodel` (не `media.zmodel` — после удаления enum имя
`TrackPreference` там больше не встречается, ссылается только `Settings.trackPreference`), плюс
попутно перевести `DiscoverWatchProgress` на `with WatchProgressFields`. Подтверждено
(сообщение 1427): дубли удалены, миксин подключён везде. С нашей стороны — убрана локальная
копия `enum TrackPreference` из `schema.zmodel`, она резолвится через уже существующий импорт
фрагмента в шапке файла. `zenstack:generate`/`db:push`/`typecheck:tsgo`/`lint` зелёные.

**`WatchProgressFields` во фрагмент — сделано (2026-09-08).** В отличие от `TrackPreference`,
это новое имя типа — добавление в `libs/zenstack-fragments/src/animatrona.zmodel` было
безопасно сделать без правки `apps/animatrona` (ничего там не переименовывает и не
конфликтует с существующими декларациями), поэтому выполнено сразу этим приложением. Состав —
`currentTime`/`duration`/`completed`/`selectedAudioTrackId`/`selectedSubtitleTrackId`/
`lastWatchedAt` (шесть полей — `duration` добавлен к пятёрке, заявленной при проектировании
выше: она идентична в обеих моделях и явно относится к «полезной нагрузке» просмотра, похоже на
случайный пропуск в первоначальном списке). `WatchProgress` этого приложения переведён на
`with WatchProgressFields`, `nx zenstack:generate`/`db:push` зелёные, `WatchProgress.form.ts`
содержит все поля миксина (баг потери полей `type`-миксина закрыт в v4.0.1, регрессии нет).
Консолидация `DiscoverWatchProgress` Animatrona на этот же миксин — по усмотрению координатора,
не блокирует ничего (тип существует и не используется, пока Animatrona не примет решение).

## Открытые вопросы

- [x] ✅ Набор моделей под объём «только просмотр» пересчитан — см. раздел «Схема плеера» выше
      (`Tracker`, `RecentRelease`, `WatchProgress`, урезанный `Settings`). Черновик 2026-09-07
      (`Anime`/`Episode`/`Subscription`/`FederatedContent`/`UserStats`/`Reputation`/
      `Achievements`/`Bonus`) отпал целиком: он был про удержание в экосистеме, не про
      «посмотреть по CID». `PinStatus` тоже не понадобился — см. 0.3.
- [x] `libs/ipfs-kubo-core` — вынесена координатором (коммиты `2d07a906`/`03991a38` в
      Animatrona) и подключена к IPFS Player — см. раздел «Подключение `libs/ipfs-kubo-core`»
      ниже.
- [x] Расщепление READ/WRITE решилось само собой при переносе: `libs/ipfs-kubo-core` несёт
      READ-функции (`cat()` и т.п.), IPFS Player использует только их — `unified-ipfs-service.ts`
      с WRITE-частью в Animatrona не трогался и не копировался.
- [x] UI «добавить трекер → посмотреть по CID» написан с нуля в `renderer/app/page.tsx` —
      `FederationCard` Animatrona не резался.

## Фаза 1 — MVP (каркас, из шаблона генератора)

- [x] Заменить placeholder-иконку и заголовок — заголовок был готов раньше («Animatrona IPFS
      Player» в layout/page), иконка (`resources/icon.svg`) переделана: бирюзово-синий градиент
      (отличается от фиолетово-розового Animatrona), play-треугольник в центре узла сети с
      линиями к соседним узлам (символ P2P/IPFS) вместо заглушки-буквы «A» от генератора
- [x] Закрыть **Фазу 0** (общий фрагмент схемы) и оставшиеся «Открытые вопросы» — предварительное
      условие для реальной бизнес-логики, не начинать с UI/IPC вперёд схемы
- [x] Бизнес-логика в `main/services/` — Kubo-нода из `libs/ipfs-kubo-core` (готова, коммиты
      `2d07a906`/`03991a38` в Animatrona координатора), чтение манифеста по CID —
      `main/services/ipfs.ts` (ленивый старт ноды) + `main/ipc/manifest.handlers.ts`
      (`manifest:openByCid` — `cat()` READ-функция из либы, `manifest.json` → опционально
      `EpisodesDocument`)
- [x] IPC-хендлеры в `main/ipc/` — `tracker.handlers.ts`, `recent-release.handlers.ts`,
      `settings.handlers.ts`, `manifest.handlers.ts` (`manifest:openByCid`, `ipfs:start`)
- [x] UI в `renderer/app/page.tsx` — список трекеров (добавление/удаление) + поле «посмотреть по
      CID»: запускает Kubo-ноду при первом обращении, читает манифест, показывает карточку
      раздачи (название, число эпизодов) и сохраняет в `RecentRelease`
- [x] Видеоплеер эпизода — `renderer/app/_components/EpisodePlayer.tsx` (Shaka Player через
      `@letar/video-player-react`/`@letar/video-player-core`), см. раздел «Видеоплеер эпизода»
      ниже
- [x] Сохранение прогресса просмотра (`WatchProgress`) — см. раздел «Прогресс просмотра» ниже
- [x] Проверка упакованной сборки (`nx build:win animatrona-ipfs-player`) — `next build` →
      `webpack` → `electron-builder --win` прошли зелёными, `dist/win-unpacked/Animatrona IPFS
      Player.exe` и NSIS-инсталлятор `Animatrona IPFS Player Setup 0.6.0.exe` собраны. Живой
      запуск установленного приложения не проверялся (GUI-уровень Electron нельзя проверить в
      сендбоксе — см. `verification-pitfalls.md`), только успешная сборка/упаковка.

### Видеоплеер эпизода (2026-09-08)

Список эпизодов раздачи (уже читался `manifest:openByCid`) выведен в UI карточки раздачи —
клик по эпизоду открывает полноэкранный `EpisodePlayer` поверх страницы (эта же страница, без
роутинга — см. ниже почему).

**Новый IPC-путь до самого видео:** `manifest:openEpisode(manifestCid)` — читает
`EpisodeManifest` (подмножество типов из `libs/animatrona-types`, локальная копия формы данных
в `main/ipc/manifest.handlers.ts` — приложение осознанно не импортирует `@letar/animatrona-types`, см. раздел «Особенности
проекта» в командном воркфлоу приложения). Сам видео/аудио/
субтитровый контент — **не через IPC**: он стримится напрямую с HTTP-шлюза Kubo
(`ipfs:getGatewayUrl` возвращает `http://127.0.0.1:<port>`, порт нефиксирован — та же логика,
что у `apiUrl` в headless-верификации предыдущей сессии). IPC на структурное клонирование
гигабайт видео не годится в принципе — только на JSON-манифест.

**Аудио и субтитры эпизода — отдельные файлы в IPFS** (не embedded-дорожки MKV, как в
`animatrona-folder-player`), поэтому режим плеера — раздельное аудио
(`usesSeparateAudioRef=true`, `<audio src>` + `useAudioSync`), не нативные
`HTMLMediaElement.audioTracks`. `AudioTrackSelector`/`SubtitleTrackSelector`/
`TrackDropdownButton` — прямой перенос из `apps/animatrona-folder-player` (общий UI-паттерн
дропдауна дорожек), не общая либа — тонкая обвязка, привязанная к `@letar/video-player-react`
двумя разными приложениями независимо, выносить в `libs/` пока нет третьего потребителя со
своим форматом дорожек.

⚠️ **ASS/SSA-субтитры потребовали смены протокола раздачи renderer'а.** SubtitlesOctopus
(рендер ASS) — Worker + WASM, а под `file://` (как грузился renderer до этой сессии) origin
`null` блокирует оба. Перенесена схема `app://` из `apps/animatrona-folder-player`
(`main/protocols/app.protocol.ts`, дословный порт) — `main/background.ts` теперь регистрирует
привилегии до `whenReady()` и грузит `app://local/index.html` вместо `loadFile()`, `next.config.js`
лишился хака `assetPrefix: './'` (больше не нужен — абсолютные `/_next/...` резолвятся от корня
схемы). Разбор класса проблемы и альтернативы — `.claude/docs/electron-app-protocol.md`. Четыре
статических ассета SubtitlesOctopus (`default.woff2`, `libassjs-worker.js`,
`subtitles-octopus.js`, `subtitles-octopus-worker.wasm`) скопированы в `renderer/public/` из
того же приложения.

**Проверено статически, не живым запуском** (см. `verification-pitfalls.md` — GUI-уровень
Electron нельзя проверить в сендбоксе): `nx typecheck:tsgo`/`nx lint` зелёные, main-процесс
собирается webpack'ом (включая новый `app.protocol.ts` и IPC-хендлеры), renderer собирается
`next build --webpack` (статический экспорт, `shaka-player`/`@letar/video-player-react`
компилируются без `self is not defined` — динамический `import('shaka-player')` внутри эффекта
защищает от SSR-пререндера), `out/` содержит все 4 ассета SubtitlesOctopus рядом с
`index.html`. Реального CID с эпизодом для сквозной проверки воспроизведения не было (тот же
пробел, что в предыдущей сессии для чтения манифеста) — живой прогон плеера не пройден,
следующая сессия с реальной раздачей должна это закрыть в первую очередь.

**Не начато:** `hasPrev`/`hasNext` навигация проверены только на статически собранном списке
эпизодов текущей раздачи, не на реальном воспроизведении.

### Прогресс просмотра (2026-09-08)

`releaseKey` (см. «Ключ прогресса просмотра» выше) теперь реально вычисляется в
`manifest:openByCid`: если `AnimeManifest.animeInfoCid` присутствует, читается документ
`AnimeInfo` и берётся `externalIds.shikimori` — ошибка на этом шаге не валит открытие раздачи
(try/catch, деградация до `cid:<directoryCid>`), потому что `shikimoriId` вспомогательный, а не
обязательный для открытия. `releaseKey` едет в `OpenByCidResult` и прокидывается в
`EpisodePlayer` вместе с номером эпизода.

Новый IPC-модуль `main/ipc/watch-progress.handlers.ts`: `watchProgress:get(releaseKey,
episodeNumber)`, `watchProgress:listForRelease(releaseKey)` (задел на «продолжить просмотр» в
списке эпизодов — UI ещё не использует), `watchProgress:upsert(input)`.

`EpisodePlayer` при открытии эпизода читает прогресс и, если он есть и не `completed` (и
позиция дальше 5 сек — иначе не резюмировать с самого начала), выставляет `video.currentTime`
как только видео готово принять seek; читает сохранённые `selectedAudioTrackId`/
`selectedSubtitleTrackId`, если такие дорожки ещё есть в манифесте эпизода. Сохранение — раз в
10 сек, пока видео играет, плюс на `pause`/`ended`, плюс гарантированно при размонтировании
компонента (переключение эпизода, закрытие плеера) через cleanup эффекта. Чтение прогресса
обёрнуто в свой try/catch — сбой не должен мешать открыть эпизод с начала.

**Не проверено живым прогоном** (нет тестового CID) — тот же пробел, что у самого плеера.

### Инфраструктура main-процесса (2026-09-08)

- `main/utils/db.ts` — синглтон `PrismaClient` с `@prisma/adapter-libsql`, путь к БД разный для
  dev (`prisma/data/app.db` в корне приложения) и упакованной сборки (`app.getPath('userData')`)
- `main/services/database.ts` — применение миграций через `sql.js` (WASM) в рантайме упакованного
  приложения (Prisma CLI недоступен без нативных модулей) — тот же паттерн, что в `animatrona`
- `main/webpack.config.js` — добавлен `libsql: 'commonjs libsql'` в `externals` (был только
  `electron`/`typescript`) — без этого webpack пытается распарсить нативный `.node`/`README.md`
  из `@libsql/win32-x64-msvc` как JS-модуль, сборка падает on 60 ошибках
- **Headless-верификация main-процесса пройдена** (`.claude/rules/electron.md` § паттерн
  `app.whenReady()` без создания окна): `bun build` отдельного entry-скрипта
  (`scripts/verify-main-init-entry.ts`, не коммитится — временный, воспроизводится по рецепту в
  доке) → `electron.exe scripts/.verify-bundle.cjs` → `initializeDatabase` + `initializePrismaDb`
  - `registerIpcHandlers` отработали без исключений, `tracker.count()`/`settings.count()` = 0 на
    чистой БД. Две грабли по пути (решение — в реальном приложении не нужно, только для
    bun-бандла верификации):
  1. `require('libsql')` не резолвится из `bun build`-бандла в `scripts/` — пакет не хостится в
     корневой `node_modules` (изолированный линкер bun, транзитивная зависимость), нужен junction
     `node_modules/libsql` → `.bun/libsql@.../node_modules/libsql` на время прогона (не коммитить).
  2. `__non_webpack_require__` в `database.ts` (защита от статического бандлинга
     `fts5-sql-bundle`) — webpack подставляет его сам, `bun build` нет; entry-скрипт верификации
     подставляет `globalThis.__non_webpack_require__ = require` перед импортом.

### Подключение `libs/ipfs-kubo-core` (2026-09-08)

Три точки подключения — по образцу `apps/animatrona/main` (та же схема, без dual-build esbuild,
у нас один общий `tsconfig.json`, не `main/tsconfig.json`):

- `package.json` — `@letar/ipfs-kubo-core: workspace:*` в `dependencies` + `implicitDependencies`
- `tsconfig.json` — путь-алиас в `paths` + glob в `include` (нужен `bun install` из корня после
  добавления зависимости — линкер иначе не заведёт symlink в `node_modules/@letar/`)
- `main/webpack.config.js` — `resolve.alias` на `libs/ipfs-kubo-core/src` + **новое**:
  `resolve.extensionAlias: { '.js': ['.ts', '.js'] }` — либа компилируется под node16/nodenext,
  её внутренние относительные импорты пишут явный `.js` (TS-конвенция), без alias webpack не
  резолвит `.js` в фактический `.ts` (`Module not found: './peer-sync-service.js'`)

`main/services/ipfs.ts` — ленивый `ensureIpfsStarted()` (singleton promise, `getKuboService()
.initialize({ libraryPath: app.getPath('userData') })`, повторные вызовы ждут ту же
инициализацию, нода не стартует при каждом запуске приложения без причины — только по первому
обращению к CID). `main/ipc/manifest.handlers.ts` — `manifest:openByCid` дергает
`ensureIpfsStarted()`, затем `cat()` (READ-функция из либы) на `${directoryCid}/manifest.json`,
затем опционально `EpisodesDocument` по `episodesCid`, если `episodes[]` не встроен прямо в
манифест.

**Бинарник Kubo не в git** (`resources/kubo/` в `.gitignore`, как у Animatrona) — для dev/
верификации скопирован локально с `apps/animatrona/resources/kubo/win/kubo.exe` (тот же
дистрибутив, downloader-скрипт свой не заводился — задача взять готовый вместо повторного
скачивания). `electron-builder.yml` дополнен `extraResources` записью `resources/kubo/win →
kubo/win` — перед `nx build:win` бинарник нужно положить туда вручную (или скопировать оттуда же).

**Headless-верификация реального запуска Kubo-ноды пройдена** (тот же `bun build`-бандл + прямой
`electron.exe`, что и для БД/IPC): `ensureIpfsStarted()` реально поднял embedded Kubo 0.40.1,
зарегистрировался на relay, RPC-клиент подключился — `getIpfsStatus()` вернул `isRunning: true,
mode: "embedded", peerId: "12D3KooW...", apiUrl: "http://127.0.0.1:5011"`. Единственная грабля
верификации (не относится к реальному приложению): `app.getAppPath()` в headless-скрипте,
запущенном напрямую как `electron.exe scripts/.verify-bundle.cjs`, резолвится в `scripts/` (нет
`package.json` с `main` рядом со входным файлом) — Kubo искал бинарник в
`scripts/resources/kubo/win/kubo.exe`. В реальном dev/prod запуске (`main`-точка входа —
`app/background.js`, `package.json` рядом) `app.getAppPath()` корректно указывает на корень
приложения. Фикс для верификации — временный junction `scripts/resources` → `../resources`, не
коммитится.

Реального CID для проверки чтения манифеста не было (нет опубликованной раздачи в dev-окружении)
— проверено только то, что нода поднимается и IPC-путь не падает синтаксически/типово
(`typecheck:tsgo`+`lint` зелёные, `nx build`-сборка webpack чистая без предупреждений).
