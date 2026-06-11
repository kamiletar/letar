# Animatrona Tracker — План развития

# Новые вводные.

## Черновик (новые идеи)

- [ ] **Покадровая перемотка на паузе** — при паузе кнопки/горячие клавиши +/- 5 кадров. Shaka Player: `video.currentTime += frameDuration` или seek по кадрам через `requestVideoFrameCallback`

## Шардирование пиннинга ✅ (2026-04-10)

Переход от полного резервирования (все CID на все пинеры) к шардированию — каждое аниме на одном пинере.

- [x] **Модель Anime: `pinnedOnId`** — привязка к PinServer, миграция `add_pinned_on_sharding`
- [x] **`autoPinAnime()` → шардирование** — выбирает наименее загруженный ONLINE сервер, при обновлении CID перепиннит на том же сервере
- [x] **Автоочистка старого CID** — `syncPinJobStatuses()` при переходе в PINNED unpinит старый CID из CidHistory
- [x] **Убран `replicaCount`** из `/api/admin/pin/[animeId]` и `/api/admin/moderate-anime/[id]`
- [x] **153 PUBLISHED аниме распределены 77/76** между pinner1 и pinner3

## Публичный API пин-серверов ✅ (2026-04-10)

Endpoint для автосинхронизации Kubo config в desktop Animatrona app — без хардкода адресов.

- [x] **`GET /api/pin-servers/public`** — публичный, без авторизации, `Cache-Control: max-age=300`
- [x] **Enum `PinServerRole`** (PINNER/RELAY/GATEWAY) + поле `role` в модели
- [x] **Поле `swarmAddrs String[]`** — multiaddrs для bootstrap/peering (TCP + QUIC)
- [x] **Relay как запись PinServer** (id=`relay-mail`) с role=RELAY
- [x] **`peeringRole`** выводится из role: RELAY→peering, PINNER→both, GATEWAY→bootstrap
- [x] **Desktop sync реализован PurpleForge** — читает endpoint, синхронизирует Bootstrap/Peering.Peers
- [x] **Periodic reconnect** в desktop — сбрасывает зависшие QUIC bitswap сессии (не отключаем QUIC, решение через reconnect)

## Pin-queue резилиентность ✅ (2026-04-10)

Исправления в `infra/animatrona-pin-queue/` (Go сервис).

- [x] **Переподключение стрима pin/add** до 50 раз (`maxStreamReconnects`) — Kubo обрывает pin/add стрим через ~4 мин, блоки остаются в datastore, новый pin/add продолжает с места
- [x] **TTL фильтр state.json** — при `load()` отбрасываются `pinned`/`failed` старше 24h (COMPLETED_TTL_HOURS)
- [x] **Удалена папка `infra/animatrona-pinner2/`** — сервер списан (OOM, плохой HDD)
- [x] **Обновлён `infra/animatrona-pinner/setup.sh`** — pinner3 и gateway добавлены в Peering.Peers, pinner3 в bootstrap

## Заметки по инфраструктуре пинеров (для pinner4+)

### PebbleDS миграция (Kubo v0.40.0)

1. Помимо config нужно перезаписать `$IPFS_PATH/datastore_spec` файл с новой конфигурацией PebbleDS
2. Удалить старые `blocks/` и `datastore/` директории перед запуском
3. `Provide` формат: `{"Strategy": "disabled", "DHT": {"Interval": "0"}}` (НЕ `Reprovider` — deprecated FATAL)

### HTTPS — Caddy вместо NPM

NPM v2.14.0 сломал API для headless setup (sqlite хак + API создания proxy → 500 Internal Error).
Используй **Caddy** — автоматический Let's Encrypt, один Caddyfile, zero UI.
См. `infra/animatrona-pinner3/Caddyfile` и `docker-compose.npm.yml`

### Relay Reservation — QUIC отключён, TCP-only (TESTING)

**Проблема:** Desktop Kubo (v0.40.1) не получал relay reservation. Reserve() проваливался с пустой ошибкой `{}` за 130мс, relay не видел входящий stream.

**Корневая причина (гипотеза):** Несовместимость QUIC stream negotiation между go-libp2p v0.47 (relay) и Kubo 0.40.1 (Desktop). Peering подключался через QUIC первым, AutoRelay переиспользовал эту connection, и circuit relay v2 stream не проходил.

**Что сделано:**

1. ✅ Pin-queue: swarm connect к провайдерам перед pin/add (`PROVIDER_PEERS` env)
2. ✅ Pin-queue: heartbeat-регистрация пинеров на relay (`RELAY_REGISTER_URL` env)
3. ✅ Relay: external address fix (Docker анонсировал 127.0.0.1 вместо 193.37.68.73)
4. ✅ Relay: обновлён go-libp2p v0.38→v0.47 (совместимость с Kubo 0.40)
5. ✅ Desktop: Pinner3 добавлен в Peering + Bootstrap
6. ✅ Desktop: StaticRelays, Peering, Bootstrap теперь применяются в applyKuboConfig
7. ✅ Desktop: ForceReachabilityPrivate + Routing.Type autoclient
8. ✅ Desktop: Pre-registration на relay ДО запуска Kubo демона
9. ✅ Desktop: GOLOG_LOG_LEVEL=autorelay=debug + stderr→warn для диагностики
10. ✅ Relay: QUIC отключён — TCP-only (go-libp2p v0.47 QUIC несовместим с Kubo 0.40.1)
11. ✅ Relay: улучшено логирование ACL (AllowReserve ALLOWED/DENIED с деталями)
12. ✅ Desktop: убран QUIC из Peering.Peers для relay (предотвращает QUIC connection reuse)

**Текущий статус (2026-03-25):**

- Relay задеплоен TCP-only на mail (193.37.68.73:41001)
- Health: `{"addrs": ["/ip4/193.37.68.73/tcp/41001"], "status": "ok"}`
- **Ожидает тестирования Desktop** — нужно пересобрать Desktop с обновлённым kubo-config и проверить, что Reserve() проходит

**Верификация:**

1. Пересобрать Desktop (kubo-config.ts обновлён — убран QUIC из relay Peering)
2. Запустить Desktop → проверить логи autorelay
3. На relay: `docker logs -f animatrona-relay` → должен показать `AllowReserve ALLOWED`
4. Desktop должен объявить relay-адрес в своих multiaddrs

### API POST /api/admin/pin-servers — нет pinQueueUrl

CreateServerSchema не включает `pinQueueUrl`/`pinQueueSecret`. При добавлении нового пинера через API нужно либо обновить схему, либо добавлять через psql.

Мы сделали animatrona-web, полноценный плеер библиотеки пользователя (моей)
В неё можно найти плеер, страницу аниме, группировку франшиз и прочее

## Список дел

### Баги

- [x] **Баннер «Укажите дату рождения» не исчезал после сохранения** — Better Auth кэшировал сессию в cookie 5 мин (`cookieCache`). Route handler `/api/user/birth-date` теперь удаляет `better-auth.session_data` cookie после обновления → следующий запрос перечитывает сессию из БД
- [x] **Счётчик «Аниме» в профиле завышен** — включал HIDDEN (архивные после `approve_replacement`). Добавлен фильтр `status: { not: 'HIDDEN' }` в запросы профиля
- [x] **Двойной хедер на странице профиля** — `ProfileClient` рендерил собственный nav-блок поверх глобального `Header`. Удалён лишний блок и неиспользуемые импорты

- [x] **Не сохраняются данные о просмотре от animatrona-mobile** — tracker-side: инференс duration из AnimeEpisode, защита от перезаписи нулём, summary учитывает записи без duration. Mobile-side фиксы (duration в onSave, sync queue) → уведомлён координатор

### Пин-серверы

- [x] **Флаг MAINTENANCE для пин-серверов** — кнопка «На паузу» / «Включить» на карточке в админке (PATCH API)
- [x] **Cleanup threshold** — порог 1 день вместо 30, проверяет только PUBLISHED аниме
- [x] **fix pin-queue unpin** — всегда вызывает `pin rm` на Kubo (ранее удалял из очереди без `pin rm`)
- [x] **Аудит сиротских пинов** — POST /api/admin/audit-pins (dry-run работает, нашёл 284+211 сиротских)

- [x] **Async unpin сиротских пинов + полная синхронизация библиотеки с пин-серверами**

  **Проблема:** Оба пин-сервера переполнены (pinner1: 447/492 GB, pinner3: 467/493 GB). Аудит нашёл 284+211 сиротских пинов, но HTTP unpin таймаутится (Nginx 60 сек, 495 последовательных pin rm на HDD).

  **Что нужно:**
  1. **Async endpoint** — POST /api/admin/audit-pins/run запускает фоновую задачу, возвращает jobId. GET /api/admin/audit-pins/status?jobId=xxx — прогресс и результат. Без HTTP таймаута.
  2. **Полная синхронизация** — не только `directoryCid` из PUBLISHED аниме, но ВСЕ CID из библиотеки пользователя (аналог desktop orphan-audit): directoryCid → manifest → episodesDocument → episode manifests → audioTracks CID, subtitleTracks CID, fontCids, thumbnails, screenshots. Только так можно корректно определить какие блоки действительно сиротские.
  3. **GC после unpin** — автоматически вызвать `repo/gc` на Kubo после завершения unpin. На HDD может занять 10-30 мин.
  4. **UI в админке** — кнопка «Аудит пинов» на вкладке пин-серверов, прогресс-бар, результат (N сиротских, N распинено, N ошибок, освобождено X GB).
  5. **Health check обновление usedBytes** — после GC обновить usedBytes в БД через `repo/stat`.

  **Контекст:**
  - Desktop orphan-audit: `apps/animatrona/main/services/ipfs/orphan-audit.ts` — эталонная реализация
  - Desktop нашёл и удалил 3147 сиротских пинов из 35744
  - На пин-серверах pin ls через bash зависает (HDD), нужен NDJSON stream parsing
  - pin-queue уже исправлен (unpin → pin rm на Kubo), новые сироты не будут накапливаться
  - Текущий endpoint `/api/admin/audit-pins` работает для dry-run, но unpin таймаутится

- [x] трекер регистрирует раздачи и ведёт учёт сидов, нужна роль модератора
- [x] аниматрона десктоп высылает на трекер информацию о своих раздачах
- [x] модератор проверяет и одобряет раздачу, после чего раздача появляется в публичном интерфейсе плеера
- [x] для одобренной раздачи нужна возможность её запинить
- [x] управление пин-серверами (Kubo API), пиннинг на конкретном или автовыбор наименее загруженного
- [x] автопиннинг при одобрении (опционально, ADMIN), health check серверов, retry упавших заданий
- [x] автоматический пиннинг на нескольких серверах с выбором количества
- [x] сравнение аудиодорожек и субтитров при замене (данные из IPFS манифестов)
- [x] lazy-сравнение под спойлер (Collapsible) + загрузка треков по клику через API
- [x] optimistic updates в модерации (карточка исчезает мгновенно)
- [x] batch-модерация (debounced batch endpoint вместо N параллельных запросов)
- [x] LRU-кеш для IPFS fetch + unmountOnExit для polling вкладок
- [x] DB Pool увеличен до max: 20

## Авторизация (Ключница / Better Auth OIDC)

### Выполнено ✅

- [x] **Better Auth hub-client** — вход через Ключница (`auth.letar.best`) по OIDC (`signIn.oauth2({ providerId: 'letar-auth' })`)
- [x] **RP-initiated logout** — выход также завершает сессию в Ключнице (`endSessionUrl`)
- [x] **Rate limit** — глобальный лимит поднят до 100 req/60s (был 10 — исчерпывался `useSession()` на каждом рендере). Кастомные правила: `/sign-in/*` 5/900s, `/sign-up/*` 3/3600s
- [x] **Auth UX** — кнопка «Войти» в хедере сразу отправляет на Ключницу (без промежуточной страницы); `callbackURL` = текущий путь
- [x] **returnTo фикс** — `sign-in/page.tsx` возвращает на `/` по умолчанию (не на `/browse`)
- [x] **UserMenu** — универсальный компонент из `@letar/ui`: кнопка «Войти» / dropdown с профилем, Ключницей, доп. пунктами и Выйти; применён в десктопном хедере
- [x] **Owner migration (Этап 8.5)** — `kami@letar.best` присвоен ADMIN роль; 1155 Anime, 144 UserLibraryItem, 2901 Distribution, 1144 PinJob, 1226 ModerationLog перенесены; старые аккаунты удалены (2026-06-11)

### Pending ⏳

- [ ] **`/sync-env` OIDC vars** — переменные `BETTER_AUTH_OIDC_ISSUER` и OIDC client ID/secret добавлены вручную на s2, но не попали в локальный `.env.docker.enc`. Нужно: `/sync-env pull animatrona-tracker` → re-encrypt SOPS

---

## Текущая версия: v0.11.0

Веб-платформа для просмотра аниме из IPFS. Каталог с полными страницами аниме (портированы из animatrona-web), франшизы с 3 режимами визуализации, видеоплеер (Shaka + SubtitlesOctopus), прогресс просмотра в БД, облачная библиотека пользователя, trackMode per-anime.

---

## Реализовано ✅

### Инфраструктура

- [x] Next.js 16 + App Router
- [x] Chakra UI v3
- [x] ZenStack 3.2 + PostgreSQL
- [x] Better Auth (OAuth: Google, Yandex, VK)
- [x] Docker-compose для production

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

- [x] `POST /api/anime` — публикация из Animatrona (API Key auth)
- [x] `GET /api/anime` — список аниме с фильтрами и пагинацией
- [x] `POST /api/admin/pin/[animeId]` — запинить аниме на сервере
- [x] `POST /api/admin/unpin/[animeId]` — распинить аниме с сервера
- [x] `GET /api/admin/pin-jobs` — список заданий на пиннинг
- [x] `GET/POST /api/admin/pin-servers` — управление пин-серверами
- [x] `POST /api/admin/pin-servers/health-check` — проверка доступности серверов
- [x] `POST /api/admin/pin-jobs/[jobId]/retry` — повтор упавших заданий
- [x] `POST /api/admin/pin-jobs/sync` — синхронизация статусов с Kubo/pin-queue
- [x] `POST /api/admin/moderate-anime/[id]` — модерация с опциональным автопином
- [x] `POST /api/admin/moderate-anime/batch` — batch-модерация (debounced)
- [x] `GET /api/admin/track-diff` — загрузка аудио/субтитров из IPFS манифестов
- [x] `GET /api/pin-servers/public` — публичный API для синхронизации Kubo config в desktop app (без авторизации)
- [x] `POST /api/distributions` — регистрация раздачи (Desktop API Key)
- [x] `PATCH /api/distributions/[id]` — обновление heartbeat раздачи
- [x] `GET/POST /api/watch-progress` — прогресс просмотра (upsert каждые 5 сек)
- [x] `GET /api/watch-progress/continue` — последние незавершённые для "Продолжить"
- [x] `GET/POST /api/user/library` — облачная библиотека пользователя
- [x] `POST /api/user/library/sync` — синхронизация библиотеки Desktop ↔ Tracker
- [x] `GET /api/ipfs/[...path]` — fallback IPFS прокси
- [x] `GET /api/comments` — список комментариев к аниме (cursor-пагинация)
- [x] `POST /api/comments` — создание комментария/ответа
- [x] `PATCH /api/comments/[id]` — редактирование своего комментария
- [x] `DELETE /api/comments/[id]` — удаление (автор/модератор/админ)
- [x] `GET /api/admin/moderation-log` — аудит-лог модерации (cursor-пагинация)
- [x] `POST /api/admin/cleanup-old-pins` — очистка устаревших пинов (30+ дней)
- [x] `GET /api/admin/cleanup-old-pins` — статус ожидающих очистки
- [x] `POST /api/admin/recalc-stats` — пересчёт viewCount/libraryCount/avgRating/uploaderScore
- [x] `GET /api/rss/feed.xml` — RSS 2.0 фид (50 последних релизов, кэш 15 мин)
- [x] `GET /api/rss/genre/[slug]` — RSS фид по жанру
- [x] `GET /api/leaderboard` — лидерборд загрузчиков (с Redis кэшем)

### Страницы

- [x] `/` — Landing page с категориями
- [x] `/anime` — Каталог аниме
- [x] `/anime/[id]` — Детальная страница аниме
- [x] `/browse` — Каталог всего контента
- [x] `/watch/[animeId]/[episode]` — Видеоплеер (Shaka + SubtitlesOctopus)
- [x] `/profile/library` — Библиотека пользователя
- [x] `/profile` — Профиль пользователя
- [x] `/profile/api-keys` — Управление API ключами
- [x] `/admin` — Модерация (табы: модерация, пин-серверы, задания, раздачи, лог, очистка пинов)
- [x] `/leaderboard` — Лидерборд загрузчиков
- [x] `/profile/[userId]` — Публичный профиль пользователя
- [x] `/sign-in`, `/sign-up` — Авторизация

---

## Завершено недавно ✅

### Фаза 1.5: Портирование из animatrona-web ✅

| Задача                                                 | Статус  | Приоритет |
| ------------------------------------------------------ | ------- | --------- |
| manifest-loader (загрузка из IPFS)                     | ✅ Done | P0        |
| Внешние ссылки + malId/anilistId                       | ✅ Done | P1        |
| Полная страница аниме (hero, tabs, episodes, about)    | ✅ Done | P1        |
| Связанные аниме + видео (Related, VideoSection)        | ✅ Done | P1        |
| Франшизы (граф React Flow + список + таймлайн)         | ✅ Done | P1        |
| Видеоплеер IPFS (Shaka + SubtitlesOctopus)             | ✅ Done | P1        |
| Прогресс просмотра в БД (WatchProgress)                | ✅ Done | P1        |
| Nginx proxy_cache для gateway (шрифты, JSON, картинки) | ✅ Done | P2        |
| Облачная библиотека (Cloud Library + sync)             | ✅ Done | P1        |

### Фаза 1: MVP доработки

| Задача                              | Статус  | Приоритет |
| ----------------------------------- | ------- | --------- |
| Счётчик категорий на главной        | ✅ Done | P2        |
| Кастомный IPFS Gateway в настройках | ⏳ TODO | P3        |
| Полнотекстовый поиск                | ✅ Done | P2        |

---

## Backlog 📋

### Возрастной фильтр (ageRating) — от animatrona desktop

**Контекст:** В Animatrona desktop (v0.48.0) добавлено поле `ageRating` в модель Anime. Shikimori рейтинг: g, pg, pg_13, r, r_plus, rx. В AnimeInfo (IPFS) поле `ageRating` уже есть и заполняется.

- [x] **Незарегистрированные пользователи:** каталог показывает ТОЛЬКО аниме с `ageRating ∈ {g, pg, pg_13}` (до 13 лет). Остальные полностью скрыты
- [x] **Регистрация:** поле «Дата рождения» (`birthDate`) на sign-up + форма дозаполнения /complete-profile
- [x] **Зарегистрированные пользователи:** фильтр по возрасту (<13: g,pg; 13-16: g,pg,pg_13; 17+: всё)
- [x] **API каталога:** ручной фильтр `ageRating` в GET /api/anime (вместо ZenStack policy — нельзя вычислять возраст)
- [x] **IPFS → БД:** ageRating извлекается из AnimeInfo/manifest при импорте
- [x] **Backfill:** POST /api/admin/backfill-age-rating для существующих аниме
- [x] **UI:** бейджи ageRating на карточках каталога, баннер дозаполнения birthDate в header
- ~~**animatrona-web:** выводится из эксплуатации, не реализуем~~

### Фаза 2: UI/UX Polish (аудит 2026-03-16)

#### 🔴 Критичные (P0)

- [x] **loading.tsx для всех страниц** — skeleton screens: `app/loading.tsx`, `app/anime/loading.tsx`, `app/anime/[id]/loading.tsx`, `app/profile/loading.tsx`, `app/profile/library/loading.tsx`, `app/leaderboard/loading.tsx`, `app/admin/loading.tsx`
- [x] **error.tsx для критичных маршрутов** — error boundaries: `app/error.tsx`, `app/anime/[id]/error.tsx`, `app/watch/[animeId]/[episode]/error.tsx`, `app/admin/error.tsx`
- [x] **Мобильная навигация (hamburger + drawer)** — drawer с полной навигацией на mobile

#### 🟠 Важные (P1)

- [x] **Заменить `confirm()` на Chakra Dialog** — стилизованный Dialog с кнопками Отмена/Удалить
- [x] **Hardcoded цвета в franchise-graph.css** — заменены на CSS variables Chakra (`--chakra-colors-*`)
- [x] **Active route indicator в header** — bold + brand.500 для активного маршрута
- [x] **Empty states для лидерборда** — иконка + описание вместо просто текста
- [x] **Кастомная 404 страница** — `app/not-found.tsx` со стилизацией

#### 🟡 Улучшения (P2)

- [x] **Формы: миграция на @letar/forms** — `add-pin-server-dialog.tsx` и `api-keys-client.tsx` мигрированы на Form API с Zod-схемами, per-field валидацией и Form.Field.Password
- [x] **Skeleton loaders вместо Spinner** — seeds-tab и pin-jobs-tab заменены на skeleton layout
- [x] **Плеер: semantic tokens в chapter list** — `bg.panel`/`border.muted`/`fg.muted` вместо gray.\*
- [x] **Плеер: responsive chapter list** — responsive minW/maxH для mobile
- [x] **Breadcrumbs для глубоких маршрутов** — `/anime/[id]`, `/profile/library`, `/profile/api-keys`, каталог
- [x] **Консистентность цветов** — проверено: `color="white"` используется только на overlay (оправдано)
- [x] **Debounced поиск в каталоге** — 400мс debounce вместо form submit

#### 💡 Идеи (P3)

- [x] **"Продолжить просмотр" — первая секция** — для залогиненных первая секция с poster + progress bar
- [x] **Keyboard shortcuts overlay в плеере** — по `?` показывается overlay со всеми горячими клавишами
- [x] **Watch progress indicators в каталоге** — progress bar + бейдж "N/M эп." на карточках (каталог + главная)
- [x] **Рекомендации "Похожие аниме"** — вкладка на странице аниме с ранжированием по пересечению жанров
- [ ] **PWA / Offline support** — Service Worker + offline fallback page

### Фаза 2.5: Редизайн профиля (аудит 2026-04-09)

Страница `/profile` перегружена — 7 секций в sidebar, таблица на 153+ аниме без пагинации.

#### 🔴 Критичные (P0)

- [ ] **Таблица аниме → карточки с пагинацией** — заменить Table на Grid карточек с обложками (как в каталоге), добавить поиск/фильтр/пагинацию. 153 записи рендерятся сразу — проблема производительности и UX
- [ ] **Sidebar → табы** — разделить профиль на табы: «Мои аниме», «Статистика & Раздачи», «Настройки». Sidebar оставить только для карточки профиля (аватар, имя, роль). Сейчас 7 карточек sidebar ~ 800px вертикально
- [ ] **Пагинация списка аниме** — серверная пагинация через searchParams (как в каталоге), 20 аниме на страницу

#### 🟠 Важные (P1)

- [ ] **Удалить бесполезную колонку "Статус"** — все 153 записи "Опубликован" = визуальный шум. Показывать статус только если есть разные (PENDING/PUBLISHED mix)
- [ ] **Карточка "Моя библиотека" → пункт навигации** — целая карточка в sidebar для одной ссылки. Переместить в табы или header
- [ ] **Аватар — загрузка фото или gravatar fallback** — сейчас просто буква на цветном круге, выглядит как заглушка
- [ ] **Mobile: sidebar скроллится до бесконечности** — на мобилке 7 карточек идут перед контентом. С табами проблема уйдёт

#### 🟡 Улучшения (P2)

- [ ] **Статистику раздач визуализировать** — progress bar для ratio, мини-графики
- [ ] **Breadcrumbs** — сейчас только кнопка «← Аниме», нужны полноценные breadcrumbs
- [ ] **Кнопки "Библиотека" и "API ключи"** — в header/табы вместо sidebar карточек
- [ ] **Обложки + жанры + эпизоды** — в карточке аниме (как в каталоге) вместо голого текстового списка

### Фаза 2 (ранее): Социальный UX

- [x] Секция "Продолжить просмотр" на главной странице
- [x] Неавторизованные пользователи могут смотреть только 1-й эпизод; остальные — с замком и ссылкой на авторизацию
- [x] Комментарии к аниме (модель AnimeComment, API CRUD, вкладка на странице аниме с ответами)
- [ ] Уведомления о новых эпизодах

### Фаза 3: Социальные функции

- [x] Профили пользователей (публичные) — `/profile/[userId]` с аватаром, ролью, статистикой, опубликованными аниме
- [x] Ссылки на профиль из лидерборда и карточки модерации
- [x] Статистика загрузок — viewCount, libraryCount, avgRating на аниме; бейджи в каталоге и на странице; сортировка по популярности/рейтингу
- [x] Рейтинг загрузчиков — uploaderScore + uploaderRank; формула из публикаций, зрителей, библиотек, рейтинга, IPFS раздачи; ранги (Новичок → Легенда); прогресс-бар на профиле; вкладка "Рейтинг" на лидерборде; API пересчёта
- [ ] Подписка на пользователей

### Фаза 4: Расширенная модерация

- [ ] Очередь модерации с предпросмотром видео
- [x] Дедупликация PENDING заявок по shikimoriId (тот же пользователь → обновление вместо дубликата)
- [x] Обновления своих аниме тоже через модерацию (PENDING кандидат на замену → одобрить + запинить)
- [x] Конкурирующие заявки: бейдж "⚔ N конкурентов" на карточке при одинаковом shikimoriId
- [x] Логирование действий модераторов — модель ModerationLog, таб "Лог" в админке, cursor-пагинация
- [x] Массовые операции (batch-модерация с debounce 300ms)
- [x] Diff названий эпизодов: показывает "старое → новое"

### Фаза 5: Интеграции

- [x] Shikimori синхронизация — OAuth вход, импорт user_rates в библиотеку, маппинг статусов/оценок, секция «Привязанные аккаунты» в профиле
- [ ] Shikimori экспорт (push оценок/статусов обратно)
- [ ] MAL синхронизация
- [x] **QR-код для подключения mobile** — диалог с QR-кодом (`animatrona://<host>?key=<apiKey>&type=tracker`) на странице API ключей, показывается при создании ключа
- [ ] **Passkey-ссылка для подключения трекера** — одноразовая ссылка с токеном, при открытии в Animatrona Desktop автоматически добавляет трекер в настройки программы (URL + API Key). Поток: трекер генерирует ссылку → пользователь кликает → Animatrona Desktop перехватывает deep link → трекер добавлен
- [x] RSS фиды для новых релизов — `/api/rss/feed.xml` + `/api/rss/genre/[slug]`, RSS 2.0 XML, кэш 15 мин, автодетект в `<head>`, иконка RSS в каталоге
- [x] Hover preview скриншотов на карточках эпизодов — cycling 500ms, индикаторы-точки, slideshow (LightboxViewer), диалог информации о кодировании (из IPFS manifest)
- [x] Очистка устаревших пинов — CidHistory отслеживает замены directoryCid, автоотмена QUEUED пинов при замене CID, API очистки пинов старше 30 дней, кнопка в админке
- [ ] Telegram бот для уведомлений

---

## Технические улучшения

- [ ] Rate limiting для API
- [x] Кэширование списков (Redis) — лидерборд 15м, профиль 5м, жанры 5м, invalidate при мутациях
- [x] Redis для онлайн-статуса раздач — heartbeat в Redis с TTL 1ч, счётчик сидов на странице аниме, обновлённый admin UI
- [ ] Мониторинг (Sentry)
- [ ] E2E тесты
- [ ] **Filecoin Cold Storage** — бесплатное холодное хранилище для каталога, автовосстановление, донаты в FIL. [ТЗ](docs/FILECOIN_COLD_STORAGE.md)

---

## Инфраструктура: IPFS пинеры

### Текущее состояние (2026-04-10)

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

**Ожидаемый эффект:**

- SSD кэш покроет hot reads (index, метаданные)
- RAID10 даст 200+ MB/s sequential throughput
- 24 GB RAM → можно вернуть PebbleDS с cacheSize 8-12 GB
- Пиннинг и раздача ограничены сетью, не диском

**При миграции:**

- Поднять Kubo с PebbleDS + все текущие оптимизации
- Обновить `PinServer.swarmAddrs` в БД трекера — desktop подхватит через `/api/pin-servers/public`
- Обновить Peering конфиг на relay, pinner1, gateway

---

## Конфигурация

| Параметр        | Значение                      |
| --------------- | ----------------------------- |
| Порт dev        | 3009                          |
| Порт production | 3010                          |
| Порт PostgreSQL | 5439                          |
| Домен           | animatrona-tracker.letar.best |
| IPFS Gateway    | gateway.letar.best            |

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                     Animatrona Desktop                           │
│  (публикует AnimeManifest → tracker через API Key)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Animatrona Tracker                             │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 16         │  PostgreSQL      │  IPFS Gateway          │
│  ├── /api/anime     │  ├── Anime       │  (для просмотра)       │
│  ├── /anime/[id]    │  ├── Episode     │                        │
│  └── /profile       │  └── ApiKey      │                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Пользователь                                │
│  (смотрит через браузер → IPFS Gateway → HLS плеер)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dev-аккаунт

Для локальной разработки создан seed с dev-пользователем:

```
Email: admin@dev.local
Пароль: admin123
Роль: ADMIN
```

Запуск: `nx db:seed animatrona-tracker`

⚠️ `.env.local` должен содержать `BETTER_AUTH_URL=http://localhost:3009` (порт dev-сервера, не production 3010).

## Команды разработки

```bash
# Запуск
nx dev animatrona-tracker

# База данных
nx zenstack:generate animatrona-tracker
nx db:push animatrona-tracker
nx db:seed animatrona-tracker
nx db:studio animatrona-tracker

# Проверки
nx format animatrona-tracker
nx lint animatrona-tracker
nx typecheck:tsgo animatrona-tracker

# Сборка
nx build animatrona-tracker
```

---

**Последнее обновление:** 2026-06-11 (сессия: 3 багфикса — баннер birthDate, счётчик профиля, двойной хедер)
