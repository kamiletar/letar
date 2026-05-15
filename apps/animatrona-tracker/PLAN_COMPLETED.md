# Выполненные задачи — Animatrona Tracker

## Версия 0.9.0 (2026-03-19)

### Redis для онлайн-статуса раздач

- Heartbeat от Desktop → Redis SET с TTL 1ч (без записи в PostgreSQL)
- Пир без heartbeat >1ч = офлайн (TTL истёк)
- Страница аниме показывает "N сидов онлайн"
- Admin seeds: "N онлайн / M всего", сводка с общим кол-вом онлайн
- `src/lib/redis-distributions.ts` — setOnline, isOnline, getOnlineForAnime, getOnlineCount

## Версия 0.8.0 (2026-03-19)

### Очистка старых IPFS пинов

- Модель CidHistory — отслеживание замен directoryCid
- Автоотмена QUEUED пинов при обновлении CID (PINNING не трогаем)
- API очистки пинов старше 30 дней с dry-run и safety checks
- Кнопка в админке (вкладка Pin Jobs)

### RSS фиды

- `/api/rss/feed.xml` — 50 последних релизов (RSS 2.0, кэш 15 мин)
- `/api/rss/genre/[slug]` — фид по жанру
- Мета-тег `<link rel="alternate">` + иконка RSS в каталоге

## Версия 0.7.0 (2026-03-18)

### Статистика и рейтинги

- viewCount, libraryCount, avgRating — денормализованные счётчики на аниме
- uploaderScore + uploaderRank — формула рейтинга загрузчиков
- Лидерборд `/leaderboard` с прогресс-барами
- API пересчёта `POST /api/admin/recalc-stats`

### Shikimori синхронизация

- OAuth провайдер для Shikimori
- Импорт user_rates в библиотеку трекера
- Маппинг статусов и оценок
- Секция «Привязанные аккаунты» в профиле

### Hover preview эпизодов

- Cycling скриншотов 500ms при наведении
- Индикаторы-точки, slideshow (LightboxViewer)
- Диалог технической информации (кодек, разрешение из IPFS)

### Redis кэширование

- Лидерборд 15 мин, профиль 5 мин, жанры 5 мин
- Инвалидация при мутациях

### Модерация

- ModerationLog — аудит-лог с cursor-пагинацией
- Таб "Лог" в админке

## Версия 0.6.x (2026-03-17)

### Комментарии

- Модель AnimeComment (ответы 1 уровень)
- API CRUD с cursor-пагинацией
- Вкладка на странице аниме

### UX Polish

- Рекомендации "Похожие аниме" по жанрам
- Breadcrumbs, debounced поиск
- Loading/error boundaries для всех маршрутов
- Мобильная навигация (drawer)
- "Продолжить просмотр" на главной
- Watch progress indicators в каталоге

## Версия 0.5.x (2026-03-16)

### Портирование из animatrona-web

- Manifest-loader (загрузка из IPFS)
- Полная страница аниме (hero, tabs, episodes, about)
- Франшизы (React Flow граф + список + таймлайн)
- Видеоплеер (Shaka + SubtitlesOctopus)
- Прогресс просмотра в БД
- Облачная библиотека (sync Desktop ↔ Tracker)

### Модерация

- Batch-модерация с debounce
- Дедупликация PENDING по shikimoriId
- Конкурирующие заявки, diff треков
- Автопиннинг при одобрении
- Pin-queue интеграция с прогрессом

## Версия 0.1.0 (2026-01-30)

### Инфраструктура

- Next.js 16, Chakra UI v3, ZenStack, Better Auth, Docker
- API публикации из Animatrona (API Key auth)
- Каталог, плеер, профиль, модерация

---

**Последнее обновление:** 2026-03-19
