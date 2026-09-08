# Changelog — Animatrona Tracker

Все важные изменения в проекте документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
проект следует [Semantic Versioning](https://semver.org/lang/ru/).

---

## [0.11.23] — 2026-09-08

### Добавлено

- **Кнопка «Поделиться» с тайм-кодом и дорожками в плеере серии** — строит ссылку
  `?t=<секунды>&audio=<index>&sub=<index|off>`, открывающую эпизод точно с этого момента и с теми
  же выбранными дорожками. `useShare()` из `@letar/ui` (уже была в библиотеке) — нативный
  `navigator.share` на мобильных, фоллбэк на копирование в буфер на десктопе.
- **Кнопка «Поделиться» на страницах аниме и франшизы** (`ShareAnimeButton`) — канонический URL
  без тайм-кода.
- **Персистентность ручного выбора аудио/субтитров per-anime** (`localStorage`) — при переходе на
  новый эпизод без сохранённого прогресса подставляется последний осознанный выбор пользователя
  для этого аниме, а не дефолт манифеста. Точная позиция по уже начатым эпизодам и раньше
  сохранялась в БД (`/api/watch-progress`) — этот слой закрывает случаи, которые БД не покрывала.

## [0.11.22] — 2026-09-08

### Изменено

- **`AnimeRelation.relationKind` переведён со `String` на общий `enum RelationKind`**
  (`libs/zenstack-fragments/src/animatrona.zmodel`, дедуп с `animatrona`). До этого трекер писал
  значения в нижнем регистре (`sequel`, `prequel`...) вперемешку с фоллбэком `OTHER` в верхнем —
  теперь везде UPPER_SNAKE_CASE, как у Desktop. Прод-данные (656 строк) нормализованы вручную
  (`UPDATE ... SET relationKind = UPPER(relationKind)`) перед миграцией.
- **`ipfs-resolver.ts` → `resolveRelations()`** теперь нормализует `link.relation` в верхний
  регистр перед записью — раньше писал как есть из Shikimori (нижний регистр).

### Исправлено

- **`relationLabels` в `related-section.tsx`** не содержал ключ `character` — 8 реальных связей
  на проде рендерились как «Другое». Добавлен лейбл «Персонажи».

## [0.11.21] — 2026-09-08

### Изменено

- **WatchStatus консолидирован в общий фрагмент.** Локальный `enum WatchStatus` в
  `schema/library.zmodel` заменён импортом из `libs/zenstack-fragments/src/animatrona.zmodel`
  (`@letar/zenstack-fragments`) — дедуп с `animatrona`/`animatrona-ipfs-player`, значения и
  поведение не изменились. `project.json` дополнен `implicitDependencies` и `inputs` для
  `zenstack:generate`, чтобы Nx корректно инвалидировал кэш при правке фрагмента.

## [0.11.20] — 2026-09-08

### Добавлено

- **Кастомный IPFS Gateway в настройках профиля реально применяется.** Бэкенд (`User.customGateway`,
  `/api/profile/settings`, `getGateway()`) существовал и раньше, но нигде не применялся — не было
  ни поля ввода в UI, ни передачи `userSettings` в вызовы `getIpfsUrl`/`getVideoUrl` по приложению.
  Добавлены: поле ввода в `/profile` → «Настройки», клиентский хук `useIpfsGateway()`
  (`lib/use-ipfs-gateway.ts`, источник — `useSession().user.customGateway`), `useMediaUrlHelpers()`
  в `lib/media-url.ts` для плеера. Подключено во все точки построения IPFS URL: карточка эпизода,
  метаданные аниме (студии/персонал/персонажи), диалог кодирования, видео-плеер, серверный
  fallback-прокси `/api/ipfs/[...path]`. После сохранения — `authClient.getSession({
  disableCookieCache: true })`, новый gateway применяется без перезагрузки страницы.

## [0.11.19] — 2026-09-08

### Исправлено

- **`POST /api/admin/pin-servers` — `CreateServerSchema` не принимал `role`/`swarmAddrs`/
  `pinQueueUrl`/`pinQueueSecret`.** Блокировало добавление нового пин-сервера (например pinner4)
  через API — приходилось вставлять запись напрямую через psql. Схема и тело `prisma.pinServer.create`
  дополнены всеми полями модели `PinServer`, которых не было в исходной версии эндпоинта.

## [0.11.18] — 2026-09-08

### Проверено

- **`use-shaka-player.ts` — аудит на дублирование с `useShakaPlayer` (`@letar/video-player-react`)
  завершён: НЕ дубль.** Общая только форма («это Shaka Player init»); владение состоянием
  расходится по-настоящему (у lib-хука play/pause/time/volume живут снаружи, в вызывающем
  компоненте + `usePlayerState`, у тrekера — внутри самого хука) плюс тrekер-специфичные фичи
  (детект первого декодированного кадра для лоадера, детект блокировки autoplay, покадровая
  перемотка). Заодно нашлась третья копия — локальный `useShakaPlayer.ts` в `animatrona` —
  оказалась мёртвым кодом (удалена в `animatrona` v0.55.65). Разбор —
  [shaka-player-hook-dedup-audit.md](/.claude/docs/shaka-player-hook-dedup-audit.md).

## [0.11.17] — 2026-09-08

### Исправлено

- **Дублирование `getShakaFrameRate`/`FRAME_STEP_COUNT` с `animatrona`** — `use-shaka-player.ts`
  повторял инлайном ровно ту же логику определения fps активной дорожки Shaka (`frame-step-utils.ts`
  в `apps/animatrona`), только без `try/catch` на случай неготового плеера. Утилита вынесена в
  `@letar/video-player-core` (реэкспортирована из `@letar/video-player-react`), оба приложения
  переведены на общий импорт. `animatrona-folder-player` (третий потребитель библиотеки) своей
  копии не имел — там нет режима покадровой перемотки.

## [0.11.16] — 2026-09-08

### Исправлено

- **Дублирование `use-keyboard-shortcuts.ts` с общим хуком `@letar/video-player-react`** —
  локальный хук горячих клавиш (добавлен в v0.11.15 вместе с покадровой перемоткой) почти
  дословно повторял `useKeyboardShortcuts` из `libs/video-player-react`, которым уже пользуются
  `animatrona` и `animatrona-folder-player`. Общий хук расширен опциональными параметрами
  (`isPlaying` — гейтит `Shift+←/→` на `stepFrame` только при `isPlaying === false`,
  `toggleTrackMode` — клавиша `T`, `showShortcuts`/`setShowShortcuts` — `?` и `Escape`), полностью
  обратно совместимо: оба существующих потребителя эти параметры не передают, их поведение не
  изменилось. `tracker-video-player.tsx` переведён на общий хук, локальный дубль удалён.
  Playback-speed переведена с индексного `handlePlaybackSpeedChange(speed)` внутри хука на
  `adjustPlaybackSpeed(delta)`-обёртку в компоненте — тот же паттерн, что уже был в
  `apps/animatrona/renderer/.../VideoPlayer.tsx`. Тесты расширены в
  `libs/video-player-react/src/hooks/useKeyboardShortcuts.spec.ts`.

## [0.11.15] — 2026-09-08

### Добавлено

- **Покадровая перемотка на паузе** (`Shift+←`/`Shift+→`, шаг 5 кадров) — работает только когда
  видео на паузе (иначе выполняется обычная перемотка на 10 секунд теми же стрелками). Новый
  `stepFrame()` в `use-shaka-player.ts` ставит видео на паузу и сдвигает `currentTime` на
  `frames / frameRate` секунд; `frameRate` берётся у активного видеотрека через
  `player.getVariantTracks()`, дефолт 24fps, если Shaka его не сообщает. Задокументировано в
  оверлее горячих клавиш (`?`).

## [0.11.14] — 2026-09-08

### Добавлено

- **Гейт `theme:check`** — подключён через `nx g @letar/generators:theme-check-integrate`
  (запускается перед `lint`). Приложение не имело каталога `src/theme/` — палитра/recipes живут
  в одном файле `src/app/_components/ui/provider.tsx`, поэтому `themePrefix` указывает на файл
  напрямую (тот же приём, что у `apps/kami`), а не на директорию.

### Исправлено

- **Глубина нажатия (`_active.transform: scale()`) в `provider.tsx`** — 14 значений сверены со
  шкалой `pressScale` (`@letar/ui`) и приведены к её шагам (`buttonRecipe`, `linkRecipe`,
  `tabsRecipe`, `menuRecipe`, `accordionRecipe`); три легитимных исключения (мелкие поверхности
  чекбокса/радио/close-триггера тега, рост thumb слайдера при захвате) оставлены как есть с
  пояснительным комментарием и занесены в `allowedMatches` скрипта проверки.
- **Сырые `transition="prop Ns"` шорткаты** в 9 файлах (`anime-comparison-block.tsx`,
  `episode-card.tsx`, `video-section.tsx`, `profile-public-client.tsx`, `anime-card.tsx`,
  `player-header.tsx`, `tracker-video-player.tsx`, `continue-watching-section.tsx`,
  `home-page-client.tsx`) — разбиты на `transitionProperty`+`transitionDuration`.
- **`rgba(0,0,0,0.7)` в градиенте `player-header.tsx`** — заменён на CSS-переменную семантического
  токена `var(--chakra-colors-black-alpha-700)`.

## [0.11.13] — 2026-09-07

### Добавлено

- **Загрузка аватара профиля** — клик по кругу-аватару в sidebar `/profile` открывает выбор
  файла (JPEG/PNG/WebP, до 5MB), обрабатывается через `@letar/image-upload`
  (`processUploadImage`: EXIF-ротация, ресайз 256×256 cover, перекодирование в WebP) и
  сохраняется в `uploads/avatars/<userId>/<uuid>.webp` через `createLocalDiskBackend`
  (защита от path traversal — `resolveUploadPath` внутри бэкенда). Раздача — новый
  `GET /api/files/[...path]` (`createUploadsRoute`, без прямого доступа к `uploads/`).
  Server Action `uploadAvatarAction` обновляет `User.image` через `getEnhancedPrisma`.
- **Progress bar для ratio раздач** — `RatioProgressBar` в табе «Статистика»: зелёный при
  ratio ≥ 1, оранжевый ниже, визуально капается на 100% при значениях выше нормы.

### Изменено

- **`PLAN.md` § Фаза 2.5 (редизайн профиля)** — чек-лист был устаревшим: большинство пунктов
  P0/P1 (таблица→карточки, sidebar→табы, пагинация, обложки в карточках) оказались уже
  реализованы в коде, отмечены задним числом по факту чтения `profile-client.tsx`.

## [0.11.12] — 2026-09-04

### Изменено

- **`Content.category`/`Content.quality`/`Report.reason`: `String` → `enum`** (задача от
  `forms-coordinator-dev`, последний блокер удаления legacy comment-directive парсера форм) —
  заведены `ContentCategory`, `VideoQuality`, `ReportReason` с `///`-doc-комментариями на
  значениях (лейблы для `select` теперь генерируются автоматически из enum, без
  `@form.props({ options: [...] })`). Значения квалификации переименованы в валидные
  идентификаторы (`P480`/`P720`/`P1080`/`P4K` вместо `480p`/`720p`/`1080p`/`4K`) — без `@map`,
  так как обе таблицы (`Content`, `Report`) пустые в dev-БД (модели legacy, нигде не используются
  в коде приложения — проверено грепом), сохранять обратную совместимость строковых значений не
  требовалось. `nx zenstack:generate` + `nx db:push` прогнаны, `typecheck:tsgo`/`lint` зелёные.

## [0.11.11] — 2026-09-04

### Исправлено

- **Мёртвая директива `@form.options` в `schema/content.zmodel`** — несуществующий ключ
  парсер `@letar/zenstack-form-plugin` молча игнорировал (`catch {}`), опции `select`-полей
  (`Content.category`, `Content.quality`, `Report.reason`) никогда не попадали в сгенерированную
  Zod-схему. Заменено на рабочий `@form.props({ options: [...] })` (легитимный escape-кейс:
  массив объектов нельзя выразить через `@meta`-синтаксис Фазы 3 — грамматика ZModel роняет
  `zenstack generate` на `ObjectExpr` внутри `@meta`). Формы `Content`/`Report` сейчас нигде в UI
  не рендерятся (legacy), баг был неактивен, но `nx zenstack:generate` теперь корректно
  прокидывает `fieldProps.options` во все три поля — проверено по сгенерированным
  `Content.form.ts`/`Report.form.ts`.

## [0.11.10] — 2026-09-04

### Добавлено

- `public/llms.txt` (llmstxt.org) — курируемый обзор сайта для AI-агентов: публичные разделы
  (каталог, карточки, франшизы, первый эпизод без входа), разделы за авторизацией, RSS и
  публичные JSON-эндпоинты, правила, которые агент иначе выведет неверно (IPFS вместо
  сервера, возрастной гейт по дате рождения). Заведён отдельным решением владельца при
  сохранённом `Disallow: /` в `robots.ts` — файл адресован агентам по прямой ссылке, не
  поисковым краулерам. Паттерн — [llms-txt-pattern.md](/.claude/docs/llms-txt-pattern.md).

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

Продолжение в [CHANGELOG_2026_09_08.md](./CHANGELOG_2026_09_08.md) (версии 0.1.0 — 0.6.1)
