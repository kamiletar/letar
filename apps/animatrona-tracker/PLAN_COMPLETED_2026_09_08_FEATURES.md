# Выполненные задачи — Animatrona Tracker (Архив: снимок фич и инфраструктуры до 2026-09-08)

> Точка входа — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).
> Соседняя часть архива (баг-фиксы/сессии до 2026-08-08) — [PLAN_COMPLETED_2026_09_08.md](./PLAN_COMPLETED_2026_09_08.md).
> Здесь — перенесённые из `PLAN.md` разделы "Реализовано", "Backlog" и справочные заметки по
> инфраструктуре IPFS-пинеров, все помеченные `✅`/`[x]` до 2026-09-08.

## Реализовано ✅ (снимок функциональности, до 2026-09-08)

### Инфраструктура

- Next.js 16 + App Router
- Chakra UI v3
- ZenStack 3.2 + PostgreSQL
- Better Auth (OAuth: Google, Yandex, VK)
- Docker-compose для production

### Модели данных

| Модель            | Описание                                        |
| ----------------- | ----------------------------------------------- |
| User              | Пользователи с ролями                           |
| Anime             | Аниме из Animatrona (manifestCid)               |
| AnimeEpisode      | Эпизоды с videoCid                              |
| ApiKey            | Ключи для API публикации                        |
| Content           | Универсальный контент (legacy)                  |
| Rating            | Оценки контента                                 |
| Report            | Жалобы на контент                               |
| Distribution      | Раздачи (кто сидирует контент)                  |
| PinServer         | Серверы для пиннинга (Kubo API)                 |
| PinJob            | Задания на пиннинг CID                          |
| UserLibraryItem   | Аниме в библиотеке пользователя (Cloud Library) |
| UserWatchProgress | Прогресс просмотра эпизодов (Cloud Library)     |
| AnimeComment      | Комментарии к аниме (с ответами на 1 уровень)   |
| ModerationLog     | Аудит-лог модерации (кто, когда, что)           |
| DistributionStats | Статистика раздач пользователя                  |
| CidHistory        | История замен directoryCid (для очистки пинов)  |

### API

- `POST /api/anime` — публикация из Animatrona (API Key auth)
- `GET /api/anime` — список аниме с фильтрами и пагинацией
- `POST /api/admin/pin/[animeId]` — запинить аниме на сервере
- `POST /api/admin/unpin/[animeId]` — распинить аниме с сервера
- `GET /api/admin/pin-jobs` — список заданий на пиннинг
- `GET/POST /api/admin/pin-servers` — управление пин-серверами
- `POST /api/admin/pin-servers/health-check` — проверка доступности серверов
- `POST /api/admin/pin-jobs/[jobId]/retry` — повтор упавших заданий
- `POST /api/admin/pin-jobs/sync` — синхронизация статусов с Kubo/pin-queue
- `POST /api/admin/moderate-anime/[id]` — модерация с опциональным автопином
- `POST /api/admin/moderate-anime/batch` — batch-модерация (debounced)
- `GET /api/admin/track-diff` — загрузка аудио/субтитров из IPFS манифестов
- `GET /api/pin-servers/public` — публичный API для синхронизации Kubo config в desktop app (без авторизации)
- `POST /api/distributions` — регистрация раздачи (Desktop API Key)
- `PATCH /api/distributions/[id]` — обновление heartbeat раздачи
- `GET/POST /api/watch-progress` — прогресс просмотра (upsert каждые 5 сек)
- `GET /api/watch-progress/continue` — последние незавершённые для "Продолжить"
- `GET/POST /api/user/library` — облачная библиотека пользователя
- `POST /api/user/library/sync` — синхронизация библиотеки Desktop ↔ Tracker
- `GET /api/ipfs/[...path]` — fallback IPFS прокси
- `GET /api/comments` — список комментариев к аниме (cursor-пагинация)
- `POST /api/comments` — создание комментария/ответа
- `PATCH /api/comments/[id]` — редактирование своего комментария
- `DELETE /api/comments/[id]` — удаление (автор/модератор/админ)
- `GET /api/admin/moderation-log` — аудит-лог модерации (cursor-пагинация)
- `POST /api/admin/cleanup-old-pins` — очистка устаревших пинов (30+ дней)
- `GET /api/admin/cleanup-old-pins` — статус ожидающих очистки
- `POST /api/admin/recalc-stats` — пересчёт viewCount/libraryCount/avgRating/uploaderScore
- `GET /api/rss/feed.xml` — RSS 2.0 фид (50 последних релизов, кэш 15 мин)
- `GET /api/rss/genre/[slug]` — RSS фид по жанру
- `GET /api/leaderboard` — лидерборд загрузчиков (с Redis кэшем)

### Страницы

- `/` — Landing page с категориями
- `/anime` — Каталог аниме
- `/anime/[id]` — Детальная страница аниме
- `/browse` — Каталог всего контента
- `/watch/[animeId]/[episode]` — Видеоплеер (Shaka + SubtitlesOctopus)
- `/profile/library` — Библиотека пользователя
- `/profile` — Профиль пользователя
- `/profile/api-keys` — Управление API ключами
- `/admin` — Модерация (табы: модерация, пин-серверы, задания, раздачи, лог, очистка пинов)
- `/leaderboard` — Лидерборд загрузчиков
- `/profile/[userId]` — Публичный профиль пользователя
- `/sign-in`, `/sign-up` — Авторизация

## Завершено (Фаза 1.5 / Фаза 1 — портирование из animatrona-web)

| Задача                                                 | Приоритет |
| ------------------------------------------------------ | --------- |
| manifest-loader (загрузка из IPFS)                     | P0        |
| Внешние ссылки + malId/anilistId                       | P1        |
| Полная страница аниме (hero, tabs, episodes, about)    | P1        |
| Связанные аниме + видео (Related, VideoSection)        | P1        |
| Франшизы (граф React Flow + список + таймлайн)         | P1        |
| Видеоплеер IPFS (Shaka + SubtitlesOctopus)             | P1        |
| Прогресс просмотра в БД (WatchProgress)                | P1        |
| Nginx proxy_cache для gateway (шрифты, JSON, картинки) | P2        |
| Облачная библиотека (Cloud Library + sync)             | P1        |
| Счётчик категорий на главной                           | P2        |
| Полнотекстовый поиск                                   | P2        |

## Список дел (MVP-эра, без точных дат)

### Баги

- Баннер «Укажите дату рождения» не исчезал после сохранения — фикс инвалидации cookie сессии
- Счётчик «Аниме» в профиле завышен (включал HIDDEN) — фильтр `status: { not: 'HIDDEN' }`
- Двойной хедер на странице профиля — убран собственный nav-блок `ProfileClient`
- Не сохранялись данные о просмотре от animatrona-mobile — инференс duration, защита от нуля

### Пин-серверы

- Флаг MAINTENANCE для пин-серверов (кнопка «На паузу»/«Включить»)
- Cleanup threshold — порог 1 день, только PUBLISHED аниме
- fix pin-queue unpin — всегда вызывает `pin rm` на Kubo
- Аудит сиротских пинов — `POST /api/admin/audit-pins` (dry-run)
- Async unpin сиротских пинов + полная синхронизация библиотеки с пин-серверами (async endpoint,
  полный обход всех CID из манифестов, GC после unpin, UI в админке, health check обновление
  usedBytes) — реализовано по образцу `orphan-audit.ts` десктопа
- Базовая инфраструктура трекера раздач: регистрация/учёт сидов, роль модератора, десктоп
  публикует раздачи, модерация одобряет → раздача в публичном интерфейсе, пиннинг на конкретном
  или автовыбор наименее загруженного сервера, автопиннинг при одобрении + health check + retry,
  пиннинг на нескольких серверах, сравнение аудиодорожек/субтитров при замене (lazy под спойлер),
  optimistic updates в модерации, batch-модерация, LRU-кеш IPFS fetch, DB Pool до 20

## Шардирование пиннинга ✅ (2026-04-10)

Переход от полного резервирования (все CID на все пинеры) к шардированию — каждое аниме на одном пинере.

- **Модель Anime: `pinnedOnId`** — привязка к PinServer, миграция `add_pinned_on_sharding`
- **`autoPinAnime()` → шардирование** — выбирает наименее загруженный ONLINE сервер, при обновлении CID перепиннит на том же сервере
- **Автоочистка старого CID** — `syncPinJobStatuses()` при переходе в PINNED unpinит старый CID из CidHistory
- **Убран `replicaCount`** из `/api/admin/pin/[animeId]` и `/api/admin/moderate-anime/[id]`
- **153 PUBLISHED аниме распределены 77/76** между pinner1 и pinner3

## Публичный API пин-серверов ✅ (2026-04-10)

Endpoint для автосинхронизации Kubo config в desktop Animatrona app — без хардкода адресов.

- **`GET /api/pin-servers/public`** — публичный, без авторизации, `Cache-Control: max-age=300`
- **Enum `PinServerRole`** (PINNER/RELAY/GATEWAY) + поле `role` в модели
- **Поле `swarmAddrs String[]`** — multiaddrs для bootstrap/peering (TCP + QUIC)
- **Relay как запись PinServer** (id=`relay-mail`) с role=RELAY
- **`peeringRole`** выводится из role: RELAY→peering, PINNER→both, GATEWAY→bootstrap
- **Desktop sync реализован PurpleForge** — читает endpoint, синхронизирует Bootstrap/Peering.Peers
- **Periodic reconnect** в desktop — сбрасывает зависшие QUIC bitswap сессии (не отключаем QUIC, решение через reconnect)

## Pin-queue резилиентность ✅ (2026-04-10)

Исправления в `infra/animatrona-pin-queue/` (Go сервис).

- **Переподключение стрима pin/add** до 50 раз (`maxStreamReconnects`) — Kubo обрывает pin/add стрим через ~4 мин, блоки остаются в datastore, новый pin/add продолжает с места
- **TTL фильтр state.json** — при `load()` отбрасываются `pinned`/`failed` старше 24h (COMPLETED_TTL_HOURS)
- **Удалена папка `infra/animatrona-pinner2/`** — сервер списан (OOM, плохой HDD)
- **Обновлён `infra/animatrona-pinner/setup.sh`** — pinner3 и gateway добавлены в Peering.Peers, pinner3 в bootstrap

## Заметки по инфраструктуре пинеров (архив, для pinner4+)

### Сервер s3 и его роль в экосистеме (2026-06-14)

Сервер s3 (HDD S16, 16 ГБ RAM) — см. **[PLAN-INFRA-1.md §15](../../PLAN-INFRA-1.md#15--сервер-s3--медиа-e2e-ipfs-бэкап-)**.
Его Kubo-нод (`ipfs.letar.best`) — **отдельный от pinner1/pinner3** и обслуживает другую задачу:
хранение общих медиафайлов веб-приложений (svoichuzhie, kami и др.) через Pin Registry с `appId`.

**Разграничение ролей:**

|              | pinner1 / pinner3                   | s3 Kubo                                    |
| ------------ | ----------------------------------- | ------------------------------------------ |
| Контент      | Аниме (HLS, большие файлы, 100s GB) | Веб-медиа (MP4, музыкальные видео, фото)   |
| Шардирование | по `Anime.pinnedOnId`               | по `PinRef.appId` (multi-tenant)           |
| Шлюз         | `gateway.letar.best`                | `ipfs.letar.best`                          |
| Pin-queue    | Go-сервис `animatrona-pin-queue`    | Node.js піннер с Pin Registry (PostgreSQL) |
| Апстрим      | Desktop app → tracker API           | Медиа-сервер `media.letar.best`            |

**s3 как pinner4** — когда pinner1/pinner3 заполнятся, s3 можно добавить как `pinner4` в таблицу
`PinServer` трекера. ⚠️ **Незакрытый технический долг, перенесён в активный `PLAN.md`:**
`POST /api/admin/pin-servers` (`CreateServerSchema`) не принимает `pinQueueUrl`/`pinQueueSecret`
— требуется обновить схему прежде чем добавлять pinner4 через API (либо вставлять через psql).

### PebbleDS миграция (Kubo v0.40.0)

1. Помимо config нужно перезаписать `$IPFS_PATH/datastore_spec` файл с новой конфигурацией PebbleDS
2. Удалить старые `blocks/` и `datastore/` директории перед запуском
3. `Provide` формат: `{"Strategy": "disabled", "DHT": {"Interval": "0"}}` (НЕ `Reprovider` — deprecated FATAL)

### HTTPS — Caddy вместо NPM

NPM v2.14.0 сломал API для headless setup (sqlite хак + API создания proxy → 500 Internal Error).
Используй **Caddy** — автоматический Let's Encrypt, один Caddyfile, zero UI.
См. `infra/animatrona-pinner3/Caddyfile` и `docker-compose.npm.yml`

### Relay Reservation — QUIC отключён, TCP-only (закрыто, 2026-03-25)

**Проблема:** Desktop Kubo (v0.40.1) не получал relay reservation. Reserve() проваливался с пустой ошибкой `{}` за 130мс, relay не видел входящий stream.

**Корневая причина (гипотеза):** Несовместимость QUIC stream negotiation между go-libp2p v0.47 (relay) и Kubo 0.40.1 (Desktop). Peering подключался через QUIC первым, AutoRelay переиспользовал эту connection, и circuit relay v2 stream не проходил.

**Что сделано:**

1. Pin-queue: swarm connect к провайдерам перед pin/add (`PROVIDER_PEERS` env)
2. Pin-queue: heartbeat-регистрация пинеров на relay (`RELAY_REGISTER_URL` env)
3. Relay: external address fix (Docker анонсировал 127.0.0.1 вместо 193.37.68.73)
4. Relay: обновлён go-libp2p v0.38→v0.47 (совместимость с Kubo 0.40)
5. Desktop: Pinner3 добавлен в Peering + Bootstrap
6. Desktop: StaticRelays, Peering, Bootstrap теперь применяются в applyKuboConfig
7. Desktop: ForceReachabilityPrivate + Routing.Type autoclient
8. Desktop: Pre-registration на relay ДО запуска Kubo демона
9. Desktop: GOLOG_LOG_LEVEL=autorelay=debug + stderr→warn для диагностики
10. Relay: QUIC отключён — TCP-only (go-libp2p v0.47 QUIC несовместим с Kubo 0.40.1)
11. Relay: улучшено логирование ACL (AllowReserve ALLOWED/DENIED с деталями)
12. Desktop: убран QUIC из Peering.Peers для relay (предотвращает QUIC connection reuse)

Статус на момент закрытия: relay задеплоен TCP-only на mail (193.37.68.73:41001), health-check
проходит, Desktop подтвердил прохождение Reserve().

### API POST /api/admin/pin-servers — нет pinQueueUrl

CreateServerSchema не включает `pinQueueUrl`/`pinQueueSecret`. При добавлении нового пинера через
API нужно либо обновить схему, либо добавлять через psql. (⚠️ дублирует открытый пункт выше —
перенесён как единственный незакрытый техдолг в активный `PLAN.md`.)

## Инфраструктура: IPFS пинеры (снимок состояния, 2026-04-10 — 2026-06-14)

Два активных пинера + relay на mail. Pinner2 списан (OOM, плохой HDD).

**Pinner1 (mail.letar.best, 193.37.68.73):**

- Kubo v0.40.1, FlatFS datastore (1.9 GB RAM — мало для PebbleDS)
- Swarm: `/ip4/193.37.68.73/tcp/43001` + QUIC
- API: `https://ipfsstor1.letar.best` (порт 5011), pin-queue на 42080
- 492 GB диск (~440 GB свободно после очистки)
- PeerId: `12D3KooWLJ3juXbEmfhBu4YTWBKQJCkgC5k9N8SMeBqTzscSxq9j`
- Docker-compose v1 на сервере (важно при пересборке)

**Pinner3 (188.127.235.38):**

- Kubo v0.40.1, **FlatFS datastore** (мигрирован с PebbleDS 2026-04-10 — PebbleDS вызывал зависания pin/add)
- 500 GB HDD + SSD cache, 4GB RAM
- Swarm: `/ip4/188.127.235.38/tcp/4001` + QUIC
- API: `https://ipfsstor3.letar.best` (порт 5001 localhost only), pin-queue на 42080
- Caddy auto-HTTPS (НЕ NPM — API v2.14 сломан)
- PeerId: `12D3KooWP5hrqw8HHXUGaepSSRhsa8isoTAbcnRnKkjgHhWRLxiV`

**Relay (mail.letar.best):**

- go-libp2p с `WithInfiniteLimits()`, кастомный бинарник
- Swarm: `/ip4/193.37.68.73/tcp/41001`
- PeerId: `12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA`
- Registration API: `POST http://193.37.68.73:41080/register`
- Запись в БД PinServer: id=`relay-mail`, role=RELAY

### Архитектура пиннинга

- **Шардирование:** каждое аниме закреплено за одним пинером (поле `Anime.pinnedOnId`)
- **Pin-queue:** Go сервис, последовательный пиннинг, переподключение стрима до 50 раз при обрыве, TTL фильтр state.json
- **Resilience:** после обрыва pin/add стрима блоки остаются в datastore Kubo, retry продолжает с места
- **Desktop sync:** читает `/api/pin-servers/public` при старте, обновляет Bootstrap/Peering.Peers, periodic reconnect раз в 30 мин

### Ограничения HDD

- Bulk pinning ~5 GB/h — потолок
- Последовательный пиннинг (1 CID за раз) обязателен
- PebbleDS на малой RAM (<4GB) даёт зависания pin/add — использовать FlatFS
- Routing.Type=none, Provide disabled — снижает random I/O

### Планируемая миграция Pinner3 (~апрель-май 2026)

Переезд на VPS [tnahosting.net](https://tnahosting.net/hybrid-vps/) — 1TB HDD RAID10 с SSD кэшем, 24 GB ECC RAM.
Ожидаемый эффект: SSD кэш покроет hot reads, RAID10 даст 200+ MB/s, 24 GB RAM позволит вернуть
PebbleDS с cacheSize 8-12 GB. ⚠️ **Дата плана прошла (сейчас 2026-09-08), статус неизвестен** —
перенесено как открытый вопрос в активный `PLAN.md`.

## Авторизация (Ключница / Better Auth OIDC) — выполнено

- **Better Auth hub-client** — вход через Ключница (`auth.letar.best`) по OIDC (`signIn.oauth2({ providerId: 'letar-auth' })`)
- **RP-initiated logout** — выход также завершает сессию в Ключнице (`endSessionUrl`)
- **Rate limit** — глобальный лимит поднят до 100 req/60s (был 10 — исчерпывался `useSession()` на каждом рендере). Кастомные правила: `/sign-in/*` 5/900s, `/sign-up/*` 3/3600s
- **Auth UX** — кнопка «Войти» в хедере сразу отправляет на Ключницу (без промежуточной страницы); `callbackURL` = текущий путь
- **returnTo фикс** — `sign-in/page.tsx` возвращает на `/` по умолчанию (не на `/browse`)
- **UserMenu** — универсальный компонент из `@letar/ui`: кнопка «Войти» / dropdown с профилем, Ключницей, доп. пунктами и Выйти; применён в десктопном хедере
- **MobileAuthSection** — самодельная auth-секция в мобильном drawer заменена на `MobileAuthSection` из `@letar/ui` (2026-06-26)
- **Owner migration (Этап 8.5)** — `kami@letar.best` присвоен ADMIN роль; 1155 Anime, 144 UserLibraryItem, 2901 Distribution, 1144 PinJob, 1226 ModerationLog перенесены; старые аккаунты удалены (2026-06-11)

## Возрастной фильтр (ageRating) — от animatrona desktop

Animatrona desktop (v0.48.0) добавил поле `ageRating` в модель Anime. Shikimori рейтинг: g, pg, pg_13, r, r_plus, rx.

- Незарегистрированные пользователи: каталог показывает ТОЛЬКО `ageRating ∈ {g, pg, pg_13}`
- Регистрация: поле «Дата рождения» на sign-up + `/complete-profile`
- Зарегистрированные: фильтр по возрасту (<13: g,pg; 13-16: +pg_13; 17+: всё)
- Ручной фильтр `ageRating` в `GET /api/anime` (не ZenStack policy — нельзя вычислять возраст)
- Backfill для существующих аниме, бейджи ageRating на карточках, баннер дозаполнения birthDate

## Фаза 2: UI/UX Polish (аудит 2026-03-16) — выполнено

- 🔴 P0: loading.tsx для всех страниц, error.tsx для критичных маршрутов, мобильная навигация (drawer)
- 🟠 P1: Chakra Dialog вместо `confirm()`, hardcoded цвета → CSS variables, active route indicator,
  empty states лидерборда, кастомная 404
- 🟡 P2: миграция форм на `@letar/forms`, skeleton loaders, semantic tokens в chapter list,
  responsive chapter list, breadcrumbs, консистентность цветов, debounced поиск
- 💡 P3: секция «Продолжить просмотр», keyboard shortcuts overlay, watch progress indicators,
  рекомендации «Похожие аниме»

## Фаза 2.5: Редизайн профиля (аудит 2026-04-09, закрыт 2026-09-07)

Страница `/profile` была перегружена — 7 секций в sidebar, таблица на 153+ аниме без пагинации.

- 🔴 P0: таблица → карточки с пагинацией (Grid `AnimeCard`, debounced-поиск), sidebar → табы
  («Мои аниме»/«Статистика»/«Настройки»), серверная пагинация 20/страницу
- 🟠 P1: колонка «Статус» → бейджи только при реальном миксе статусов, «Моя библиотека» → пункт
  таба, аватар — загрузка фото через `@letar/image-upload` (детали — `CHANGELOG.md` v0.11.13),
  mobile sidebar-скролл снят как побочный эффект P0
- 🟡 P2: статистика раздач как progress bar (`RatioProgressBar`), кнопки «Библиотека»/«API ключи»
  в табах, обложки+жанры+эпизоды в переиспользуемом `AnimeCard`. Пункт «Breadcrumbs» решён как
  неактуальный: `/profile` — корневой маршрут личного кабинета, не «глубокий»

⚠️ Чек-лист отставал от кода на день — большинство пунктов P0/P1 оказались уже реализованы в
`profile-client.tsx` при проверке 2026-09-07, отмечены задним числом по факту чтения кода.

## Фаза 2 (ранее): Социальный UX — выполненные пункты

- Секция «Продолжить просмотр» на главной странице
- Неавторизованные — только 1-й эпизод, остальные с замком и ссылкой на авторизацию
- Комментарии к аниме (модель AnimeComment, API CRUD, вкладка с ответами)

## Фаза 3: Социальные функции — выполненные пункты

- Профили пользователей (публичные) — `/profile/[userId]`
- Ссылки на профиль из лидерборда и карточки модерации
- Статистика загрузок — viewCount, libraryCount, avgRating; сортировка
- Рейтинг загрузчиков — uploaderScore + uploaderRank, ранги, прогресс-бар, вкладка «Рейтинг»

## Фаза 4: Расширенная модерация — выполненные пункты

- Дедупликация PENDING заявок по shikimoriId
- Обновления своих аниме через модерацию (PENDING кандидат на замену)
- Конкурирующие заявки — бейдж "⚔ N конкурентов"
- Логирование действий модераторов (ModerationLog, таб «Лог»)
- Массовые операции (batch-модерация, debounce 300ms)
- Diff названий эпизодов «старое → новое»

## Фаза 5: Интеграции — выполненные пункты

- Shikimori синхронизация — OAuth вход, импорт user_rates, маппинг, «Привязанные аккаунты»
- QR-код для подключения mobile (`animatrona://<host>?key=<apiKey>&type=tracker`)
- RSS фиды для новых релизов (`/api/rss/feed.xml`, `/api/rss/genre/[slug]`)
- Hover preview скриншотов на карточках эпизодов
- Очистка устаревших пинов (CidHistory, автоотмена QUEUED, API+UI очистки)

## Технические улучшения — выполненные пункты

- Кэширование списков (Redis) — лидерборд 15м, профиль 5м, жанры 5м, invalidate при мутациях
- Redis для онлайн-статуса раздач — heartbeat с TTL 1ч, счётчик сидов, admin UI
- Базовый E2E-сьют (`apps/animatrona-tracker-e2e`, 15 тестов Playwright) — публичный каталог,
  sign-in/sign-up, `dev-session` по конвенции `createDevSessionRoute`, доступ к `/admin`. Часть
  тиража N (корневой `PLAN.md` §18.7) — подготовка перед подключением к staging-e2e-гейту

## Техдолг: закрыто (архив)

- **Запрещённый Chakra `as=` на `Icon` — 194 вхождения в 33 файлах** — см. полную запись в
  [PLAN_COMPLETED.md](./PLAN_COMPLETED.md) («Чистка запрещённого Chakra `Icon as=`»).
- **Дубли в `implicitDependencies`** — см. полную запись в
  [PLAN_COMPLETED.md](./PLAN_COMPLETED.md) («Чистка конфига»).

---

**Диапазон:** версии 0.1.0 — 0.9.0, а также все разделы `PLAN.md`, помеченные `✅`/`[x]` до
2026-09-08 (кроме событий 2026-08-08 и позже — они остаются в основном
[PLAN_COMPLETED.md](./PLAN_COMPLETED.md)).
