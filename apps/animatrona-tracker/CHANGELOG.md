# Changelog — Animatrona Tracker

Все важные изменения в проекте документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
проект следует [Semantic Versioning](https://semver.org/lang/ru/).

---

## [0.11.8] — 2026-08-21

### Исправлено

- `POST /api/anime` ловил в `catch` Prisma-коды `P2002`/`P2004`, а приложение сидит на ZenStack v3
  ORM (`error.reason`/`error.dbErrorCode`, не Prisma P-коды) — обе ветки никогда не срабатывали,
  конфликт публикации одного и того же `directoryCid` всегда падал как общая ошибка 500 вместо 409.

### Добавлено

- Тест на гонку публикации: два параллельных `POST /api/anime` с одинаковым `directoryCid`
  реально бьются об unique-констрейнт в dev-БД, проверяет 201+409 (не 500) — см.
  [route.spec.ts](/apps/animatrona-tracker/src/app/api/anime/route.spec.ts).

## [0.11.5] — 2026-08-19

### Исправлено

- Dev-сервер мог отдавать 500 из-за `@tanstack/devtools-ui@0.7.0` (импортирует `use` из
  `solid-js/web`, чего нет в серверной сборке этого пакета). Добавлен webpack-алиас
  `@tanstack/devtools-ui: false` для серверной половины графа сборки всегда, для клиентской —
  только в production. Разбор — PLAN.md §51.

## [0.11.4] — 2026-08-13

### Исправлено

- **Гидратационный мисматч `autoSkipEnabled` и `trackMode`:** оба читали `localStorage`
  синхронно в инициализаторе `useState` — на клиенте это уже первый (гидратирующий) рендер,
  сервер рендерит дефолт. Дефолт теперь совпадает на сервере и первом клиентском рендере,
  сохранённое значение подтягивается в `useEffect`. См.
  `.claude/docs/ssr-hydration-persisted-state.md`.

## [0.11.2] — 2026-05-14

### Исправлено

- **500 при повторной публикации аниме:** убрано уникальное поле `manifestCid` из модели `Anime` — Desktop больше не получает constraint violation при повторном publish того же аниме
- Все функции и API-роуты переведены с `manifestCid` на `directoryCid` как единственный IPFS-идентификатор
- Убран N+1 fallback в `pinning.ts`, упрощён `library/sync` (поиск только по `directoryCid` + `shikimoriId`)

---

## [0.11.1] — 2026-04-10

### Исправлено

- После логина через Ключницу (или прямой OAuth через Google/Яндекс/VK на `/sign-in`) пользователь возвращается на ту страницу, с которой начал вход. `signInWithLetarAuth()` без аргумента автоматически подставляет `window.location.pathname + search`, а страница `/sign-in` читает параметр `?returnTo=` с фоллбэком на `/browse`.

---

## [0.11.0] — 2026-04-09

### Добавлено

- **Async аудит сиротских пинов:** POST /api/admin/audit-pins/run запускает фоновую задачу, GET /status возвращает прогресс. Без HTTP таймаутов
- **Полная синхронизация библиотеки:** сбор ВСЕХ CIDs из БД + глубокий обход IPFS манифестов (AnimeManifest → EpisodesDocument → EpisodeManifest → sub-documents: chapters, thumbnails, encoding, animeInfo, relations, franchiseGraph, episodePreviews)
- **GC после unpin:** автоматический repo/gc на Kubo после распиновки, обновление usedBytes в БД
- **UI аудита в админке:** секция «Аудит пинов» на вкладке пин-серверов с кнопками per-server, прогресс-бар с фазами, результат с ошибками

### Рефакторинг

- Вынесены `getKuboPins()` и `unpinCid()` в `src/lib/audit-pins-utils.ts` для переиспользования
- Старый POST /api/admin/audit-pins упрощён до dry-run only

---

## [0.10.1] — 2026-04-09

### Добавлено

- **QR-код для подключения mobile:** кнопка «QR для мобильного» при создании API ключа, диалог с SVG QR-кодом формата `animatrona://<host>?key=<apiKey>&type=tracker`, совместимый с Desktop

---

## [0.10.0] — 2026-04-09

### Добавлено

- **Возрастной фильтр (ageRating):** поле `ageRating` в модели Anime, извлекается из IPFS AnimeInfo при импорте
- **Дата рождения (birthDate):** поле в User, форма при регистрации + страница дозаполнения /complete-profile для OAuth
- **Фильтрация каталога по возрасту:** без birthDate — g/pg/pg_13, <13 — g/pg, 13–16 — g/pg/pg_13, 17+ — всё
- **Бейджи ageRating:** цветные бейджи на карточках каталога (0+/PG/13+/17+/18+)
- **Баннер дозаполнения:** в header для пользователей без birthDate
- **Backfill API:** POST /api/admin/backfill-age-rating — заполнить ageRating для существующих аниме из IPFS
- **API birthDate:** POST /api/user/birth-date — установить дату рождения

---

## [0.9.2] — 2026-04-09

### Исправлено

- **watch-progress от mobile:** инференс `duration` из модели `AnimeEpisode` если клиент передал 0 — mobile не отправлял duration, из-за чего прогресс терялся в summary
- **watch-progress:** не затирает существующий `duration > 0` нулём при update (защита от mobile-клиентов)
- **summary endpoint:** учитывает записи с `duration=0` для `lastEpisode` (ранее пропускались)
- **getEnhancedPrisma:** передаётся полный user с `role` вместо `{ id } as never` во всех watch-progress endpoints

---

## [0.9.1] — 2026-03-27

### Исправлено

- **Мобильные табы:** админ-панель, страница аниме и лидерборд — горизонтальный скролл вместо обрезки, иконки скрыты на мобиле
- **Фильтры каталога:** на мобиле свёрнуты в Collapsible с кнопкой "Фильтры" (вместо полноширинного блока)
- **Статистика профиля:** responsive Grid (1 колонка на узких экранах)
- **Error pages:** responsive padding и maxW для мобильных экранов
- **Breadcrumbs:** overflow protection с горизонтальным скроллом

---

## [0.9.0] — 2026-03-19

### Добавлено

- **Redis для онлайн-статуса раздач:** heartbeat от Desktop пишет в Redis с TTL 1ч, пир без heartbeat >1ч = офлайн
- **Онлайн сиды на странице аниме:** "N сидов" с иконкой в hero-секции
- **Admin seeds:** показывает "N онлайн / M всего" из Redis, сводка с общим кол-вом онлайн

---

## [0.8.0] — 2026-03-19

### Добавлено

- **Очистка старых пинов:** модель CidHistory отслеживает замены directoryCid
- **Автоотмена QUEUED пинов:** при обновлении CID QUEUED пины старого CID удаляются из очереди (PINNING не трогаем)
- **API:** `POST /api/admin/cleanup-old-pins` — очистка пинов старше 30 дней (dry-run + безопасные проверки)
- **API:** `GET /api/admin/cleanup-old-pins` — статус ожидающих очистки
- **Админка:** кнопка "Очистить старые пины" на вкладке Pin Jobs с badge
- **RSS фиды:** `GET /api/rss/feed.xml` — 50 последних релизов (RSS 2.0, кэш 15 мин)
- **RSS по жанру:** `GET /api/rss/genre/[slug]` — фильтрация по жанру
- **RSS мета-теги:** `<link rel="alternate">` в `<head>` + иконка RSS в каталоге

---

## [0.7.0] — 2026-03-18

### Добавлено

- **Статистика загрузок:** viewCount, libraryCount, avgRating на аниме — бейджи в каталоге, сортировка по популярности/рейтингу
- **Рейтинг загрузчиков:** uploaderScore + uploaderRank, формула из публикаций/зрителей/библиотек/рейтинга/IPFS, ранги (Новичок → Легенда)
- **Лидерборд:** страница `/leaderboard` с вкладкой загрузчиков, прогресс-бар до следующего ранга
- **API:** `POST /api/admin/recalc-stats` — пересчёт всех денормализованных счётчиков
- **Redis кэширование:** лидерборд 15м, профиль 5м, жанры 5м, инвалидация при мутациях
- **Shikimori синхронизация:** OAuth вход, импорт user_rates в библиотеку, маппинг статусов/оценок
- **Hover preview скриншотов:** cycling 500ms на карточках эпизодов, индикаторы-точки, slideshow (LightboxViewer)
- **Диалог тех. информации:** кодек, разрешение, битность, preset — данные из IPFS manifest
- **Модерация:** аудит-лог ModerationLog, таб "Лог" в админке, cursor-пагинация

---

## [0.6.1] — 2026-03-17

### Улучшено

- **Модерация:** кнопка «Просмотреть» ведёт на `/anime/{directoryCid}`, «Текущая раздача» — на `/anime/{shikimoriId}`
- **Модерация:** Directory CID — кликабельные ссылки на IPFS Gateway
- **Модерация:** блок сравнения показывает только отличия

### Исправлено

- **Плеер:** ссылки `/watch/` для PENDING замен используют CUID аниме
- **Плеер:** передача роли пользователя в ZenStack для доступа к PENDING аниме

---

## [0.6.0] — 2026-03-17

### Добавлено

- **Комментарии к аниме:** модель AnimeComment с ответами (1 уровень вложенности)
- **API:** GET/POST `/api/comments`, PATCH/DELETE `/api/comments/[id]` — полный CRUD
- **UI:** вкладка «Комментарии» на странице аниме

---

## [0.5.8] — 2026-03-17

### Добавлено

- **Рекомендации:** вкладка «Похожие» — подбор по пересечению жанров с ранжированием

---

## [0.5.6] — 2026-03-17

### Добавлено

- **Breadcrumbs** на страницах `/anime/[id]`, `/profile/library`, `/profile/api-keys`
- **Debounced поиск** в каталоге (400мс)

---

## [0.5.5] — 2026-03-16

### Исправлено

- **API:** `manifestCid` принимается из payload десктопа (fallback на `directoryCid`)

---

## [0.5.1] — 2026-03-16

### Исправлено

- **Плеер:** скрыт навбар на `/watch/` — полный экран

### Добавлено

- **Плеер:** VideoInfo оверлей (клавиша I)

---

## [0.1.0] — 2026-01-30

### Добавлено

- Инфраструктура: Next.js 16, Chakra UI v3, ZenStack, Better Auth, Docker
- API публикации аниме из Animatrona (API Key auth)
- Каталог, детальная страница, плеер, профиль, модерация
- Модели: User, Anime, AnimeEpisode, ApiKey, Content, Rating, Report
