# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [3.39.2] — 2026-08-25

### Fixed: подсказки валидации форм были на английском

`FormI18nProvider` из `@letar/forms` не был подключён. Добавлен `FormI18nProvider locale="ru"`
в `src/app/_components/providers.tsx`. Разбор класса бага —
[.claude/docs/letar-forms-missing-i18nprovider-english-hints.md](/.claude/docs/letar-forms-missing-i18nprovider-english-hints.md).

## [3.39.1] — 2026-08-25

### Refactor: `RoleHeader` — общий хедер кабинетов admin/coach/poet

По итогам аудита дублирования (`.claude/docs/header-drawer-dedup-audit.md`) три почти
идентичных файла (`admin-header.tsx`, `coach-header.tsx`, `poet-header.tsx` — одинаковая
разметка Box→Container→Flex, одинаковый мобильный `Drawer.Root` с `Drawer.Context`
render-prop) сведены к общему `RoleHeader` (`app/_components/header/role-header.tsx`).
Различия между ролями — `colorPalette` (`brand`/`teal`), заголовки, `navItems`, `rootHref`
и `rightContent` — вынесены в пропы. Исходные три файла стали тонкими обёртками.
Живая проверка (dev-сессия admin@grandslamcup.ru): гамбургер открывает Drawer с верным
заголовком и списком пунктов, активный пункт подсвечен `brand.subtle`/`brand.fg`, клик по
пункту закрывает Drawer и переходит по ссылке.

## [3.39.0] — 2026-08-25

### Refactor: `schema.zmodel` разбит на 8 доменных файлов

`schema.zmodel` (1613 строк) декомпозирован на `schema/users.zmodel`, `schema/geo.zmodel`,
`schema/competition.zmodel`, `schema/teams.zmodel`, `schema/matches.zmodel`,
`schema/judging.zmodel`, `schema/content.zmodel`, `schema/social.zmodel` — циклические
cross-file импорты между ними (см.
`.claude/docs/zenstack-multifile-schema-circular-imports.md`). Корневой `schema.zmodel`
теперь только импортирует доменные файлы и держит `datasource`/`generator`/`plugin`-блоки.
`zenstack generate` не изменил ни одного сгенерированного файла (`src/generated/`,
`prisma/`) — декомпозиция чисто структурная, поведение не менялось.

## [3.38.7] — 2026-08-19

### Refactor: глубина нажатия кнопок и ссылок на общую `pressScale` (`@letar/ui`)

`buttonRecipe`/`linkRecipe` переведены с литеральных `scale(...)` на общую шкалу `pressScale`
из `@letar/ui` — та же лестница, что у domwellbes (эталон) и driving-school. Значения по шагам
изменились (кнопка `xs`: 0.9→0.95, `sm`: 0.9→0.96, `lg`: 0.97→0.98, `xl`: 0.98→0.985; ссылка:
0.9→0.96) — проверено резолвом через прямой импорт recipe (см.
`.claude/docs/interactive-press-feedback.md#проверка-без-браузера`, dev-сервер не поднимался
из-за несвязанной проблемы с БД). `iconButtonRecipe` на общую шкалу не переведён — иконка мельче
нижнего шага `pressScale`, ей нужно более заметное проседание; расхождение задокументировано
JSDoc-комментарием на месте.

## [3.38.6] — 2026-08-19

### Refactor: `useMatchSSE` на общем `useEventSource`

`useMatchSSE` переведён с ручного `new EventSource(...)` на общий `useEventSource`
(`@letar/hooks`) — дедупликация SSE-подключений по монорепо. Линейный backoff (3с × попытка,
до 30с, максимум 10 попыток) и набор именованных событий матча сохранены без изменений.

## [3.38.5] — 2026-08-14

### Removed

- **Мёртвый локальный `header/user-menu.tsx`** — `public-header.tsx` уже использовал `UserMenu`
  из `@letar/ui` (с `extraItems` под роли тренера/поэта/счетовода/ведущего), а мобильная
  версия — `MobileAuthSection`. Локальный дубль нигде не импортировался, удалён при аудите
  консолидации меню аккаунта по монорепо.

## [3.37.3] — 2026-07-12

### Fixed

- **Превентивный фикс `ERR_DLOPEN_FAILED: libvips-cpp.so`** — после прод-инцидента в `mandala`
  (см. корневой `PLAN.md` Сессия №70/№71) добавлен `outputFileTracingIncludes` в
  `next.config.mjs`: Next.js standalone tracer не подхватывает `.so`-файл, который `sharp`
  грузит через `dlopen()`. Глоб `./node_modules/.bun/@img+sharp-libvips-*/**/*.so*` без
  привязки к версии переживёт апдейт `sharp`/`bun.lock`.

## [3.37.2] — 2026-07-03

### Fixed — CookieBanner падал с ContextError вне ChakraProvider

- **layout.tsx**: `CookieBanner` (использует `Box`, `Button`, `Checkbox` из Chakra) рендерился **до** `<Providers>`, то есть вне `<ChakraProvider>`. Пока `shown === false` компонент возвращал `null` и баг не проявлялся (у пользователей с уже сохранённым cookie-согласием) — но при первом визите или после очистки localStorage баннер пытался отрисовать Chakra-компоненты без контекста → `Uncaught ContextError: useContext returned undefined` → крах всей страницы. `CookieBanner` перенесён внутрь `<Providers>`. Не связано с сегодняшними правками consent-гейта SW — предсуществующий баг, обнаружен случайно при диагностике.
- Проверены остальные 8 приложений с `CookieBanner` из `@letar/ui` (studio, svoichuzhie, aprel8008, driving-school, imot, premium-rosstil, auth-hub, dsperevod) — везде корректно внутри провайдера, баг локальный для grandslamcup.

## [3.37.1] — 2026-07-02

### Fixed — Снятие уже установленного Service Worker при отказе от согласия

- **service-worker-registration.tsx**: при `isAccepted === false` теперь снимается **любой** уже активный SW через `navigator.serviceWorker.getRegistration('/')`, а не только тот, что зарегистрировал сам компонент (`registrationRef.current` был пуст при каждом маунте и не видел SW, установленный до внедрения consent-гейта в 3.37.0). У пользователей, посещавших сайт раньше, старый SW продолжал перехватывать fetch-запросы независимо от согласия.

## [3.37.0] — 2026-07-02

### Fixed — Согласие пользователя перед регистрацией Service Worker

- **service-worker-registration.tsx**: Service Worker больше не регистрируется автоматически при заходе на сайт. Регистрация теперь происходит только после явного согласия пользователя (`useOfflineConsent` из `@letar/hooks`), при отзыве согласия — `unregister()`. Ранее SW молча прекачивал статику приложения (~46 МБ) без ведома пользователя.
- **offline-consent-banner.tsx**: новый баннер снизу экрана с кнопками «Включить оффлайн» / «Не сейчас», по образцу `apps/mandala`. Повторный показ через 7 дней после отказа.
- **package.json**: `@letar/hooks` добавлен в `implicitDependencies`.
- **Документация**: правило обязательного consent-паттерна перед регистрацией SW задокументировано в `.claude/docs/pwa-offline.md` для всех будущих PWA-приложений.

## [3.36.0] — 2026-05-17

### Added — Фаза 15: Самоорганизация товарищеских матчей (ТЗ)

- **PLAN.md**: добавлена «Фаза 15 — Самоорганизация товарищеских матчей: поиск счетовода и ведущего». Описаны: биржа волонтёров (`ServiceVolunteer`), модель откликов (`VolunteerApplication`), модель отзывов (`VolunteerReview`), новые поля в `FriendlyMatchRequest`, флоу 5 шагов (вызов → принятие → биржа → отклик → подтверждение + авто-создание матча), 9 server actions, таблица уведомлений (push / email / Telegram), чеклист 11 фаз.
- **PRESENTATION.md**: добавлен раздел «Самоорганизация товарищеских матчей: биржа счетоводов и ведущих (Фаза 15)» с mermaid-диаграммой флоу, таблицей профиля волонтёра и описанием преимуществ для оргкомитета.

## [3.35.0] — 2026-05-17

### Added — Фаза 8: Альбомы стихов поэта

- **БД**: новые модели `Album` и `AlbumPoem` (pivot) с ZenStack access policies. Миграция `add_album`.
- **API**: `POST /api/upload/album-cover` — загрузка обложки альбома (реализована по аналогии с `/api/upload/poem-cover`).
- **Server Actions** (`my/poems/_actions/album.action.ts`): `createAlbumAction`, `updateAlbumAction`, `deleteAlbumAction`, `toggleAlbumPublishAction`, `addPoemToAlbumAction`, `removePoemFromAlbumAction`, `reorderAlbumPoemsAction`, `getMyAlbumsAction`, `getAlbumForEditAction`.
- **Публичный профиль поэта**: сетка альбомов (`PlayerAlbumsList` + `AlbumPoster`) перед списком стихов. Плитки «Разное» (стихи без альбома) и «Все альбомы (N)» появляются по условию.
- **Страница альбома** `/{citySlug}/players/{slug}/albums/{albumSlug}`: hero с обложкой, год, автор, нумерованный список стихов.
- **Страница всех альбомов** `/{citySlug}/players/{slug}/albums`: сетка постеров без ограничения на 4.
- **Редирект** `/players/{slug}/albums/{albumSlug}` → `/{citySlug}/players/{slug}/albums/{albumSlug}` по аналогии с poems.
- **Личный кабинет поэта** `/my/poems`: хаб со списком альбомов (статус, кол-во стихов, кнопки публикации/редактирования/удаления), кнопка «Новый альбом».
- **Создание/редактирование альбома** `/my/poems/albums/new` и `/my/poems/albums/[albumId]/edit`: форма метаданных + `AlbumPoemSelector` с двумя колонками и сортировкой стрелками.
- **Админка**: в карточке игрока `/admin/players/[id]` добавлена секция «Альбомы» со статусами и счётчиком стихов.
- **Seed-скрипт** `prisma/seed.ts`: создаёт начальную новость «Мы запустили сайт!» (идемпотентный upsert). Команда: `nx db:seed grandslamcup`.
- **Nx target** `db:seed` добавлен в `project.json`.
- Telegram: встроенные чаты (PLAN.md Фаза 13) и канальный автопостинг оформлены как Phase 13.

## [3.34.2] — 2026-05-17

### Fixed — скриншоты презентации заменены на насыщенные сущности продакшена

- Удалены кривые / неинформативные скриншоты: 404-страница `/moscow`, простыня правил (`11-rules.png`), SPb-дубликаты, корневой city-selector, пустой live-матч 0:0 (Прогрев vs Солянка/Ладья).
- **Добавлены реальные результаты**: завершённый матч **Маски 290 : 279 НЕНАХОД НОГИ** с составами обеих команд и победным стихотворением (`08-match-finished.png`).
- **Детальный протокол матча** — пара-за-парой расписание, оценки текста и подачи от каждого судьи, накопительный счёт (`09-match-protocol.png`).
- **Команда «Маски»** заменила «Кашалот» как наиболее насыщенный профиль: 42 поэта в составе, 6 матчей в истории, домашняя площадка (`15-team-profile.png`).
- **Поэт Александра Айрапетова** — самый насыщенный профиль (206 КБ HTML, 9 выступлений с конкретными оценками текста / подачи по парам), заменила минимальный профиль (`14-player-profile.png`).
- Добавлен мобильный скриншот завершённого матча (`mobile-06-match-finished.png`).
- Итог: 15 экранов desktop + 6 мобильных, все с реальными данными московского сезона 2.

## [3.34.1] — 2026-05-17

### Refined — Фаза 12 «Android-приложение»: чаты и уведомления — обязательный минимум MVP

- Добавлен раздел «Обязательная функциональность MVP» с явным ядром из 5 частей: (1) полная интеграция чатов Фазы 9 с Telegram-уровнем UX, (2) 16 категорий push-уведомлений с разделением на FCM Notification Channels, (3) тренировки с inline-кнопками RSVP в шторке, (4) уведомления о матчах с интеграцией Яндекс.Карт, (5) чат-функциональность уровня Telegram.
- **Таблица 16 категорий push** с триггерами, важностью и каналами FCM: `CHAT_MESSAGE`, `CHAT_MENTION`, `TRAINING_INVITE/REMINDER/CANCELLED`, `MATCH_REMINDER/LINEUP_PUBLISHED/RESULT`, `ROSTER_APPLICATION/APPROVED/REJECTED`, `VIDEO_TAG`, `POEM_PUBLISHED`, `MODERATION_PENDING`, `FRIENDLY_MATCH_REQUEST`, `SYSTEM_ANNOUNCEMENT`.
- **Android Direct Reply API** — ответ на сообщение в чате прямо из шторки уведомлений без открытия приложения.
- **Notification Channels** позволяют пользователю отключать категории по отдельности через системные настройки Android.
- **Тихие часы** (DND) с настройкой диапазона в `/settings/notifications`.
- Добавлены плагины `@capacitor/badge` (счётчик на иконке) и `@capacitor-community/keep-awake` (не выключать экран в live-матче).
- PRESENTATION.md: для оргкомитета чётко зафиксированы «три кита» приложения — чаты, уведомления о сообщениях, уведомления о тренировках/матчах.

## [3.34.0] — 2026-05-17

### Added — ТЗ на Фазу 12 «Android-приложение для поэтов, тренеров и организаторов» в PLAN.md

- **Стратегия Capacitor 6 поверх существующего PWA** — 95% UI работает «as is», добавляется доступ к нативным API через 12 плагинов. Этап 2 (по фидбеку) — React Native для критичных экранов.
- Новое Nx-приложение `apps/grandslamcup-android/` со структурой Capacitor + Android Studio проект.
- **Push через FCM** — расширение `PushSubscription` полями `fcmToken`, `platform`. Те же события (чаты, тренировки, видео) приходят надёжно на MIUI / EMUI.
- **Аутентификация** через Better Auth с сохранением сессии в Android Keystore + опциональный biometric prompt при повторном запуске.
- **App Links** через `assetlinks.json` — ссылки на матчи / поэтов / тренировки из Telegram открываются в приложении.
- **Распространение:** RuStore (P0), Google Play (P1), APK с сайта (P2).
- CI/CD через GitHub Actions с автосборкой AAB при теге `grandslamcup-android-v*`.
- Опциональный этап 10: отдельное минимальное React Native приложение `grandslamcup-judge` только для голосования жюри в зале.
- Что **не делаем сразу**: iOS (отдельная фаза), экраны скорера / ведущего / проектора (это планшет/ноутбук, не телефон).
- Чек-лист из 10 фаз разработки.

### Updated — PRESENTATION.md

- Добавлен раздел «Android-приложение для поэтов, тренеров и организаторов (Фаза 12)» с Mermaid-диаграммой стратегии Capacitor → нативные API → магазины.
- Обновлён раздел «Мобильные приложения» в видении: Android теперь в активной разработке.

## [3.33.0] — 2026-05-17

### Added — ТЗ на Фазу 11 «Видео матчей и каналы поэтов / команд» в PLAN.md

- 6 типов видео (`MATCH_FULL`, `MATCH_HIGHLIGHTS`, `PERFORMANCE`, `PLAYER_OWN`, `TEAM_OWN`, `NEWS`) с привязкой к матчу, выступлению, поэту или команде.
- 5 внешних провайдеров (YouTube, VK Video, RuTube, Telegram, Vimeo) через embed + опциональный direct upload коротких клипов (≤ 60 сек, ≤ 50 МБ).
- **Модель `VideoTag`** — отметка поэта в видео с таймкодами `startSec` / `endSec`. На странице поэта видео появляются автоматически с deeplink на нужный фрагмент.
- **Парсер URL** `src/lib/video-parser.ts` для всех 5 провайдеров с Vitest-покрытием.
- Public UI: секции «Видео» на страницах матча, поэта, команды + общая лента `/[citySlug]/videos`.
- Кабинеты: `/poet/videos` (личный канал), `/coach/videos` (канал команды), `/admin/matches/[id]/videos` с компонентом `video-tagger.tsx` для отметки поэтов с автоподстановкой таймкода через YouTube IFrame / VK Video API.
- SEO: JSON-LD `VideoObject` + `og:video` для красивого шеринга.
- Антифрод: whitelist провайдеров, rate-limit 10 видео/час, жалобы, опциональный антивирус для native upload.
- Чек-лист из 9 фаз разработки.

### Updated — PRESENTATION.md

- Добавлен раздел «Планирование тренировок команды (Фаза 10)» с Mermaid-диаграммой потока: доступности → тепловая карта → топ-5 предложений → создание тренировки → RSVP.
- Добавлен раздел «Видео матчей и каналы поэтов / команд (Фаза 11)» с Mermaid-диаграммой источников и потребителей видео.

## [3.32.0] — 2026-05-17

### Added — ТЗ на Фазу 10 «Планирование тренировок команды» в PLAN.md

- Игроки размечают свободные интервалы на 14 дней вперёд (drag-to-select календарь).
- Тренер видит **тепловую карту доступности** команды 14 × 24 (дни × часы) с цветовой градацией от пустого к насыщенно-зелёному.
- **Алгоритм оптимального слота** (`src/lib/training-scheduler.ts`) с timeline-sweep — находит непрерывные интервалы, где `available(t) ≥ minPlayers`, сортирует по числу участников, «уютному» времени (19:00–21:00) и дальности от запланированных матчей. Возвращает топ-5 предложений с пояснением.
- 3 новые модели БД (`PlayerAvailability`, `TrainingSession`, `TrainingAttendance`), 2 enum (`TrainingStatus`, `AttendanceStatus`).
- Server Actions для игрока (upsert/clear доступности, RSVP) и тренера (создать/изменить/отменить тренировку, запросить подсказки).
- Уведомления push / email / Telegram при создании, изменении и за 24 ч / 2 ч до тренировки.
- iCal-экспорт тренировок (`/api/schedule/ical?include=trainings`).
- Чек-лист из 9 фаз разработки + E2E-сценарий.

## [3.31.0] — 2026-05-17

### Added — презентация платформы для оргкомитета Москвы

- Новый документ `docs/PRESENTATION.md` — подробный обзор всех возможностей платформы по ролям (зритель, поэт, тренер, жюри, скорер, ведущий, организатор, админ), турнирной логики, архитектуры и видения развития. Включает Mermaid-диаграммы (роли и доступ, 11-шаговый Wizard матча, иерархия сезонов, расчёт оценок, карта типов чатов) и демо-сценарий для встречи. Подготовлен для печати в PDF, импорта в Notion или просмотра на GitHub.
- Скриншоты для презентации в `docs/screenshots/` — 21 экран desktop (главная, таблица, расписание, сетка, команды, поэты, профили, площадки на карте, live-матч, проектор, голосование, правила, дисциплина, оргкомитет) + 5 мобильных видов. Все сняты через Playwright с production-сайта (московский сезон 2).

### Added — ТЗ на Фазу 9 «Чаты и сообщения» в PLAN.md

- 10 типов чатов (`PRIVATE`, `TEAM`, `MATCH`, `CITY`, `GENERAL`, `COACHES`, `ORGANIZERS`, `TEAM_ORGANIZERS`, `PLATFORM_FEEDBACK`, `DEV_SUPPORT`).
- Полная схема БД (`Chat`, `ChatParticipant`, `ChatMessage`, `MessageReaction`) с ZenStack-политиками доступа.
- Архитектура UI (роут-группа `(chats)/chats/`), Server Actions, real-time через SSE + Socket.IO (порт 3017), уведомления через push / email / Telegram.
- Эталон — `apps/driving-school/src/app/(chats)/chats/` (4 модели БД, 22 компонента, 21 server action).
- Чек-лист из 9 фаз разработки.

---

Продолжение в ./CHANGELOG_2026_04_14.md
