# План разработки Kami

Персональный сайт-портфолио фронтенд-архитектора.

## Легенда

- ✅ Готово
- 🚧 В работе
- ⏳ Запланировано

---

## Баги / технический долг

- [x] ⚠️ prismaAdapter/ZenStack — закрыто (2026-08-31): полный OAuth sign-in прогнан живьём
      (локальный `auth-hub` + локальный `kami`, `OIDC_CLIENT_ID`/`SECRET`/`DISCOVERY_URL`
      добавлены в `.env.local`). Путь создания нового аккаунта (OAuth-коллбэк → `User`+`Account`
      через `prismaAdapter(ZenStackClient)`) пройден без единого пустого 500 — `User`/`Account`
      реально созданы, сверено прямым запросом к `DATABASE_URL`. Код `auth.ts`/`prisma.ts` не
      менялся, фикс не требуется. Подробности —
      `.claude/docs/better-auth-prismaadapter-zenstack-incompatibility.md`.

- [x] ⚠️ **Приложение полностью не запускается (500 на всех страницах, включая `/`)** — исправлено
      2026-08-25. Три независимые причины:
      1. `src/lib/auth-client.ts` — `genericOAuthClient()` убран из better-auth 1.7 (см.
      `.claude/docs/better-auth-1.7-oidc-provider-removed.md`). Переведено на
      `createAuthClientWithOAuth()` из `@letar/auth/client` (тот же паттерн, что уже
      использовали hub-client-приложения) — `signIn.oauth2()` остаётся тонким алиасом над
      `signIn.social()`.
      2. `src/lib/auth.ts` — `mode: 'hub-client'`/`rateLimit.storage` ошибочно резолвились в
      оверлоад `HubProviderAuthProfile`. Настоящая причина — **не** рассинхрон контракта
      `createAuth`, а известная особенность TS: объектный литерал со спредом условного
      выражения (`...(process.env.REDIS_URL && {...})`) внутри аргумента оверлоаднутой дженерик-
      функции ломает резолюцию оверлоада целиком, и TS репортит ошибки от последнего
      (не подошедшего) варианта вместо реального. Фикс — заменить спред на прямое
      `secondaryStorage: process.env.REDIS_URL ? createRedisStorage(...) : undefined`.
      3. `@better-auth/core@1.7.1` сделал `getAndDelete`/`increment` в `SecondaryStorage`
      обязательными (были опциональными в 1.6.x) — `createRedisStorage` в `libs/auth` их не
      реализовывал, что и было второй причиной провала того же оверлоада. Добавлены оба метода
      через `GETDEL`/`INCR`+`EXPIRE`.
      Заодно `createAuthClientWithOAuth()` в `libs/auth` сделан дженериком по `Option` (сохраняет
      типы плагинов вроде `organizationClient()` в возвращаемом клиенте) и получил проброс
      `fetchOptions`. Проверено: `nx typecheck:tsgo kami`, `nx lint kami`, `nx test @letar/auth` —
      зелёные; `/` и `/ru/consulting` открываются в браузере без 500 и без ошибок в консоли.

- [x] ⚠️ `nx build kami` иногда падает с потоком `[Better Auth]: Discovery fetch failed for
      "letar-auth"` — разобрано 2026-09-02, не баг: `genericOAuth`-плагин better-auth делает
      discovery-fetch синхронно в момент `betterAuth({...})` (внутри `init()`, вызывается при
      импорте `lib/auth.ts`, не лениво на первый запрос), поэтому `next build` требует сетевой
      доступности `auth.letar.best` во время сборки. В разобранном прогоне фактический
      fatal-краш был от другого источника (Keystatic → `api.github.com`, `ECONNRESET`) — не от
      OIDC. Код не менялся, фикс не требуется — это ограничение better-auth, затрагивающее все
      hub-client приложения (kami/time/aprel8008/domwellbes). Подробности —
      `.claude/docs/nextjs-build-time-oidc-discovery-network-dependency.md`.

---

## Фаза 1: Фундамент (MVP)

### Инфраструктура

- ✅ Инициализация проекта в Nx
- ✅ Настройка i18n (next-intl, RU/EN)
- ✅ trailingSlash в URL
- ✅ Создать ТЗ (TZ.md)
- ✅ Настройка Chakra UI v3
- ✅ Темизация (светлая/тёмная)

### Компоненты

- ✅ Header (лого, навигация, переключатели)
- ✅ Footer (соцсети, копирайт)
- ✅ LanguageSwitcher (RU/EN)
- ✅ ThemeSwitcher (light/dark/system)
- ✅ MobileMenu (hamburger)

### Страницы

- ✅ Главная с Matrix-эффектом (Canvas)
- ✅ Hero-секция с анимациями
- ✅ Страница "О себе"

### Инфраструктура деплоя

- ✅ Docker-конфигурация (Dockerfile.production, docker-compose.production.yml)
- ✅ Nginx Proxy Manager
- ✅ SSL (Let's Encrypt)

---

## Фаза 2: Контент

### База данных

- ✅ Настройка Prisma + ZenStack
- ✅ Модель Skill (навыки)
- ✅ Модель SkillCategory (категории)
- ✅ Модель Project (проекты)
- ✅ Модель HireRequest (заявки на работу)
- ✅ Сиды для начальных данных

### Страницы

- ✅ CV / Резюме (данные из kasper.green, имя: Ками Летар)
- ✅ Навыки (из БД)
- ✅ Проекты (из БД)
- ✅ ~~Который час?~~ → перенесено в приложение `time`

### Блог

- ✅ Настройка Keystatic
- ✅ Markdoc с рендерингом
- ✅ Список статей
- ✅ Страница статьи
- ✅ RSS-фид

### SEO

- ✅ Meta-теги
- ✅ Open Graph
- ✅ Structured Data (JSON-LD)
- ✅ sitemap.xml
- ✅ robots.txt
- ✅ humans.txt

---

## Фаза 3: Интерактивность

### Аутентификация

- ✅ Auth.js v5 с PrismaAdapter
- ✅ GitHub OAuth
- ✅ Google OAuth
- ✅ Yandex OAuth
- ✅ Email/password регистрация с БД
- ✅ Страницы Sign In / Sign Up (двухколоночный UI)
- ✅ Формы через @letar/forms + Zod v4
- ✅ Telegram OAuth (HMAC верификация)
- ✅ Email верификация (Nodemailer + Yandex SMTP)
- ✅ Страница verify-email с авто-логином
- ✅ Magic Link (вход по ссылке без пароля)
- ✅ **Миграция на Better Auth** (Auth.js в maintenance mode с сентября 2025)
  - ✅ Заменить next-auth на better-auth (betterAuth + prismaAdapter)
  - ✅ Обновить route handler `/api/auth/[...all]`
  - ✅ Миграция схемы БД (emailVerified: DateTime → Boolean, camelCase)
  - ✅ Обновить клиентские хуки (createAuthClient + magicLinkClient)
  - ✅ Плагины: emailVerification, magicLink, genericOAuth (Yandex)
  - ✅ Плагин organizations (команды, участники, приглашения)
  - ✅ Rate limiting (database storage, strict rules, IP headers)
  - ⏳ Плагин: 2FA

### Командные опросы (Team Surveys)

- ✅ Модели: TeamSurvey, TeamSurveyQuestion, TeamSurveyResponse, TeamSurveyAnswer
- ✅ Типы вопросов: TEXT, SINGLE_CHOICE, MULTI_CHOICE, RATING, SCALE
- ✅ Access control через ZenStack (owner/admin управляет, members читают)
- ✅ UI: TeamInvite (приглашение команды после HireRequest)
- ✅ UI: AcceptInvitation (принятие приглашения)
- ✅ UI: Survey (заполнение опроса)
- ✅ UI: Results (агрегированные результаты с графиками)

### Форма "Позвать на работу"

- ✅ Многошаговый wizard (7 шагов) — Form.Steps из @letar/forms
- ✅ Модель HireRequest в schema.zmodel
- ✅ Валидация (@letar/forms + Zod v4)
- ✅ Сохранение прогресса (localStorage через stepPersistence)
- ✅ Email-уведомления (HIRE_NOTIFY_EMAIL)

---

## Фаза 4: PWA и Polish

### PWA

- ✅ Service Worker (ручной, sw.template.js)
- ✅ Manifest.json (динамический manifest.ts)
- ✅ Офлайн-страница
- ✅ Web Share Target
- ✅ Удалён Serwist (не совместим с Turbopack в Next.js 16+)
- ✅ Ручной SW: `sw.template.js` + `update-sw-version.mjs` (как в pravda)

### UX

- ✅ Аудит `_active: scale()` в теме на `pressScale` (`@letar/ui`) — не применимо (2026-09-06):
  `apps/kami/src/theme/` не существует (kami использует общий `@letar/chakra-provider` без
  локальных recipe-оверрайдов), `grep -rn "_active.*scale(" apps/kami/src` — ноль совпадений.
  Задача описана в [press-scale-audit-task.md](/.claude/docs/press-scale-audit-task.md)
- ✅ Микро-анимации (Framer Motion)
- ✅ Accessibility audit (SkipLink, ARIA landmarks)
- ✅ Performance optimization (dynamic imports, React.memo, Prisma select)

---

## Фаза 5: Консалтинг

### Страницы

- ✅ Страница услуг консалтинга
- ✅ Описание направлений консалтинга (архитектура, код-ревью, аудит, менторинг)
- ✅ Тарифы и форматы работы (почасовая, проектная, ретейнер)
- ✅ FAQ по консалтингу

### База данных

- ✅ Модель ConsultingService (услуги)
- ✅ Модель ConsultingRequest (заявки на консультацию)
- ✅ Модель ConsultingSession (проведённые сессии)
- ✅ Модель Testimonial (отзывы клиентов)
- ✅ Модель ConsultingCase (кейсы проектов)
- ✅ Модель AvailabilityRule (правила доступности)
- ✅ Модель BookedSlot (забронированные слоты)

### Форма заявки на консультацию

- ✅ Простая форма (тип услуги, описание задачи, бюджет, сроки)
- ✅ Валидация (@letar/forms + Zod v4)
- ✅ Email-уведомления о новых заявках
- ✅ Календарь для выбора слота (система бронирования: AvailabilityRule, BookedSlot, SlotPicker)

### Дополнительно

- ✅ Отзывы клиентов (Testimonial модель + TestimonialCard/TestimonialsSection)
- ✅ Кейсы консалтинговых проектов (ConsultingCase модель + CaseCard/CasesSection)
- ✅ Интеграция с Google Calendar API (SlotPicker с реальными слотами из Google Calendar)
- ⏳ Интеграция с платёжной системой (опционально)

---

## Фаза 6: Расширения

- ✅ AI-чатбот (Claude + Vercel AI SDK v6, плавающий виджет)
- ✅ Админ-панель (/admin: dashboard, requests, testimonials, cases, slots, learning, skills)
- ✅ Списки прочитанного/изученного (LearningItem модель, /learning страница)
- ✅ Комментарии в блоге (BlogComment модель с вложенными ответами)
- ✅ Yandex Metrica (YandexMetrika компонент, NEXT_PUBLIC_YM_COUNTER_ID)
- ✅ Admin Learning CRUD (/admin/learning/new, /admin/learning/[id])
- ✅ Admin Skills CRUD (/admin/skills — навыки, /admin/skills/categories — категории)
- ✅ UserProvider контекст (серверная сессия → React Context: isAdmin, roles, user)
- ✅ OnlyFor использует useUser() вместо useSession() (без запросов к БД)
- ✅ Загрузка произвольных файлов (/admin/files — любой формат, макс. 500MB, модель UploadedFile)
- ✅ Matrix Rain: мультиязычные рецепты (переработка заставки) — уже реализовано в
  `matrix-rain.tsx` (`RECIPES`), даже шире плана: 16 рецептов (все перечисленные письменности +
  бонусом телугу, маратхи, греческий, бенгальский, двоичный и hex-код), случайное назначение
  рецепта на столбец при инициализации и при каждом сбросе капли. Просто не было отмечено в
  PLAN.md. Попутно убран забытый отладочный `console.log(fontSize)` (единственная причина
  оставшегося lint-warning в этом файле).

---

## Фаза 6b: Тест личности (Quiz)

### Базовая инфраструктура

- ✅ Модели: QuizSession, QuizAnswer, QuizQuestion, UserQuizAchievement, QuizLeaderboardEntry, QuizSkippedQuestion
- ✅ 1955 вопросов в БД (1665 оригинальных + 290 новых BAR/PAG/DPR)
- ✅ Seeded PRNG для воспроизводимого порядка вопросов
- ✅ Bilingual (RU/EN): все вопросы, сценарии, опции переведены

### 13 шкал личности

- ✅ 10 базовых DSM-5: PAR, SZD, SZT, ANT, BOR, HIS, NAR, AVD, DEP, OBC
- ✅ BAR — Переменчивый Маятник (Биполярное аффективное расстройство)
- ✅ PAG — Упрямый Партизан (Пассивно-агрессивный)
- ✅ DPR — Задумчивый Философ (Депрессивный тип личности)

### Скоринг и нормализация

- ✅ Точная формула TZ v2: `normalized = raw / actual_max × 100`
- ✅ max_scores_per_question.json (макс. баллы для каждого из 1955 вопросов)
- ✅ Индикаторы достоверности шкал (insufficient/low/moderate/high)
- ✅ BAR-фильтр: предупреждения BAR ≥ 40%, BOR+BAR, DPR+BAR
- ✅ Кризисный блок (телефон доверия 8-800-2000-122) при BAR/DPR/BOR ≥ 60%

### UI

- ✅ Radar Chart 13 осей с форматом «Прилагательное Существительное»
- ✅ Топ-3 карточки с whenHigh блоками (балл ≥ 40%)
- ✅ «Ваша суперсила» — развёрнутый позитивный профиль топ-1 типа
- ✅ Взаимодействие топ-2 типов (динамика, сильные стороны, риски, совет)
- ✅ Модификаторы BAR/PAG/DPR при балле ≥ 40%
- ✅ Дисклеймер с чекбоксом перед тестом
- ✅ Сокращённый дисклеймер в подвале результатов

### Пропуск вопросов

- ✅ Кнопка «Пропустить» (outline/md)
- ✅ Таблица QuizSkippedQuestion (sessionId, questionId)
- ✅ Мягкое напоминание при > 30% пропусков (toast, один раз)
- ✅ Пропущенные не участвуют в нормализации

### Исключение повторов

- ✅ getRandomQuestionsAction исключает отвеченные + пропущенные вопросы
- ✅ Запрос через JOIN к QuizAnswer + QuizSkippedQuestion

### Контент

- ✅ 13 позитивных профилей «Светлые стороны» (~2000 зн., RU+EN)
- ✅ 45 парных взаимодействий типов (RU+EN)
- ✅ 3 модификатора настроения BAR/PAG/DPR (RU+EN)
- ✅ Страница /quiz/for-professionals (руководство для психологов, RU+EN)

### Геймификация

- ✅ 18 достижений (сессии, ответы, результаты, специальные)
- ✅ 15 рангов (5 тиров × 3 уровня, XP-система)
- ✅ Лидерборд (/quiz/leaderboard)

### Порционное прохождение (TZ v2)

- ✅ UI: прогресс-бар «127/1955 — 6.5%» (на интро, в процессе, на результатах)
- ✅ Индикаторы достоверности на радаре (затемнение для insufficient/low)
- ✅ Кнопка «Пройти ещё N вопросов» (подгрузка новых с сервера)
- ✅ Сохранение прогресса серверно (getQuizProgressAction + накопительные баллы)
- ✅ Предупреждения о шкалах с недостаточной точностью
- ✅ Накопительный профиль на интро (по всем ответам через все сессии)
- ✅ Стратифицированное перемешивание (вопросы из разных блоков в каждой порции)

---

## Фаза 7: Кросс-постинг в соцсети

### Этап 1: Telegram + VK ✅

- ✅ Модель SocialPlatform (настройки платформ, токены, Json config)
- ✅ Модель CrossPost (логи публикаций, статусы)
- ✅ Enum SocialPlatformType (TELEGRAM, VK, LINKEDIN, TWITTER, FACEBOOK, INSTAGRAM, BLUESKY, MASTODON)
- ✅ Enum CrossPostStatus (PENDING, PUBLISHED, FAILED)
- ✅ Миграция `20260319232255_add_social_crosspost`
- ✅ Сервис telegram.ts (Bot API через прокси tg-proxy.letar.best)
- ✅ Сервис vk.ts (VK API wall.post, прямой доступ)
- ✅ Типы types.ts (PublishResult, BlogPostData, TelegramConfig, VKConfig)
- ✅ Server Action publishPost(postSlug, platformIds[])
- ✅ Server Action retryPost(crossPostId)
- ✅ Server Action getPostPublications(postSlug)
- ✅ Server Action getEnabledPlatforms()
- ✅ Страница настройки платформ (/admin/social)
- ✅ Страница логов публикаций (/admin/social/logs) с фильтрами по статусу
- ✅ Кнопка "Опубликовать в соцсети" на странице блог-поста (PublishButton)
- ✅ Пункт "Соцсети" в admin sidebar (Share2 иконка)

### Этап 2: Прокси-сервис и дополнительные платформы

- ✅ Настройка Telegram прокси на mail.letar.best (tg-proxy.letar.best → api.telegram.org, SSL)
- ✅ Настройка Facebook прокси на mail.letar.best (fb-proxy.letar.best → graph.facebook.com, SSL)
- ✅ Facebook (Graph API v21.0) — через прокси на mail.letar.best
- ✅ Сид-данные для SocialPlatform (Telegram, VK, Facebook — заготовки `enabled: false`,
  `config: {}`, `upsert` по `type` не перетирает то, что потом настроят в админке)
- ⏳ Node.js + Express прокси-сервис для заблокированных API
- ⏳ LinkedIn (Share API) — через прокси на mail.letar.best
- ⏳ X/Twitter (API v2)
- ⏳ Facebook (Graph API)
- ⏳ Instagram (Graph API)
- ⏳ Bluesky (AT Protocol)
- ⏳ Mastodon (ActivityPub)
- ⏳ Docker + деплой прокси на mail.letar.best

### Прямые интеграции (из РФ)

- ⏳ Яндекс Дзен (Publisher API)

---

## Фаза 8: Вынос компонентов

- ✅ Вынести "Который час?" в отдельное приложение (отдельный домен, своя стилистика) — уже
  сделано в прошлой сессии (см. `CHANGELOG.md` v0.7.0 "Added" / позже "Removed" отсюда), просто не
  было отмечено здесь. Приложение живёт как `apps/time`, в исходниках kami не осталось ни ссылок
  на `whatHour`/`what-hour`, ни самого компонента — сверено грепом при обнаружении задачи.

---

## Фаза 9: Аудиоплеер — визуализации и UX

### 9.1 Визуализации (swap + цвет)

- ✅ **Поменять местами** `AudioSpectrumVisualizer` и `AudioSpectrogram` (2026-09-06):
  - `AudioSpectrogram` (сонограмма) → фон на весь экран (`position="absolute" inset={0}`)
  - `AudioSpectrumVisualizer` (матрица букв) → внутрь `Card.Body` (высота ~100px)
  - `audio-page-client.tsx` обновлён: фоновый Box теперь у сонограммы, матрица — внутри Card.Body
  - `AudioSpectrumVisualizer` получил проп `height?: number` (default 100), абсолютное
    позиционирование убрано из рендера
  - `AudioSpectrogram` получил `height?: number` без default — если не передан, `height: '100%'`
    и `borderRadius: 'none'`
  - `fadeOpacity={0.08}` для матрицы в карточке

- ✅ **Цвет по высоте (эквалайзер)** в `AudioSpectrumVisualizer` (2026-09-06):
  - Убран фиксированный `color` проп, цвет вычисляется по Y-позиции символа:
    `hue = 185 - yNorm * 55` (185° голубой вверху → 130° зелёный внизу), `lum` зависит от темы
  - deps `useCallback` обновлены: `color` убран, добавлен `isLight`
  - Проверено: `nx lint kami`, `nx typecheck:tsgo kami` — зелёные. Живая проверка в браузере
    заблокирована локальным окружением (`auth-hub` dev-сервер для OIDC-discovery падал/не
    стабилизировался при параллельном перезапуске превью), не связано с самими правками.

### 9.2 Сонограмма до воспроизведения (офлайн анализ)

- ✅ **Статичная сонограмма до старта** (2026-09-06):
  - `useOfflineSpectrogram` — рендерит трек через `OfflineAudioContext` + `AnalyserNode` с
    планированием `suspend(t)` на 300 равномерных точках по длительности; на каждой паузе снимает
    срез `getByteFrequencyData()` (75% полезного спектра, `fftSize=2048` — как в живом рендере),
    затем `resume()`. Отдаёт массив `Uint8Array[]` (300 столбцов) одним куском после полного
    анализа
  - `AudioSpectrogram` получил `staticColumns?: Uint8Array[] | null` — рисует их растянутыми на
    всю ширину canvas одним изображением, пока воспроизведение ни разу не стартовало
    (`hasStartedRef`). После первого play статичная картина больше не перерисовывается — живой
    scroll-рендер естественно перекрывает её слева направо по мере воспроизведения
  - Проверено: `nx lint kami`, `nx typecheck:tsgo kami` — зелёные
  - **Упрощения относительно исходного описания задачи** (сознательно, чтобы не раздувать
    непроверенную вслепую фичу): прогрессивная отрисовка по мере вычисления не сделана — картина
    появляется одним кадром после полного анализа (300 столбцов, для трека в несколько минут это
    доли секунды в фоне); живая проверка в браузере не проведена — заблокирована тем же
    флаки-крашем Nx-графа при параллельном `nx dev` (см. фоновую задачу `task_85cc78c4`)

### 9.3 Waveform peaks на seekbar

- ✅ **Отображение формы волны** на полосе прокрутки (2026-09-06):
  - `useAudioPeaks` — decode через `fetch` + `AudioContext.decodeAudioData`, сведение первого
    канала до 400 пиков (max амплитуды по чанкам), независимо от ширины canvas
  - `AudioWaveform` — чисто презентационный canvas-компонент (`pointerEvents="none"`, чтобы клики
    проходили сквозь него к `<input type="range">` под ним), ResizeObserver на родителя
  - Прогресс воспроизведения цветом: сыгранная часть — зелёным (`#047857`/`#00FF41` по теме,
    как в `AudioSpectrumVisualizer`), оставшаяся — серым
  - Hover-тултип с временем — трекается в `audio-player.tsx` через `onMouseMove` на обёртке
    seekbar (bubbling от `<input>`), а не внутри самого canvas-компонента — иначе
    `pointerEvents="none"` глушит и мышиные события на нём тоже
  - Проверено: `nx lint kami`, `nx typecheck:tsgo kami` — зелёные (оба раза). Живая проверка в
    браузере не удалась — окружение (Browser-превью) дважды одновременно остановило и `kami`, и
    `auth-hub` без ошибки в логах приложений, независимо от кода; не переиспользовал это как
    доказательство бага в правках.
  - Не сделано в этой сессии: 9.2 (офлайн-сонограмма до старта воспроизведения) — из плана
    вынесен один общий `decodeAudioData`, но офлайн FFT-анализ для статичной картинки до play
    заметно сложнее и рискованнее без возможности живой проверки; оставлено как отдельная задача

### 9.4 Кнопка Fullscreen

- ✅ **Развернуть на весь экран** (2026-09-04):
  - `Maximize`/`Minimize` иконка (lucide-react) в `AudioPlayer` рядом с громкостью
  - `document.documentElement.requestFullscreen()` / `document.exitFullscreen()` — таргет
    `documentElement`, а не локальный контейнер плеера: `header`/`footer` уже рендерятся как
    семантические теги (`Box as="header"`/`as="footer"`), поэтому `:fullscreen header,
    :fullscreen footer { display: none }` в `global.css` работает без доп. id/ref
  - `fullscreenchange` event → синхронизация иконки (в т.ч. выход через Esc)

### 9.5 Постер + сонограмма: slide-анимация

**Концепция** (из описания пользователя):

- Блок 1 (слева): обложка квадратная, высота = высота экрана
- Блок 2 (справа от обложки): сонограмма = весь трек (статичная до старта, live после)
- До воспроизведения: обложка видна, сонограмма начинается правее
- При нажатии Play: сонограмма начинает "выталкивать" постер влево (`translateX` синхронно с `currentTime`)
- Активный момент (текущее время) = фиксированная позиция в центре экрана, трек скроллится под ней
- Оформление активной точки: тонкая вертикальная линия с градиентом или пульсация

**Реализация (v1, см. `poster-sonogram-slider.tsx`):**

- ✅ Горизонтальный контейнер `overflow: hidden` — высота **не** во весь экран, а `320px`
  (переключаемый доп. вид на странице аудио, а не замена всего макета — см. упрощения ниже)
- ✅ Обложка: `width = height` (квадрат), `flex-shrink: 0`
- ✅ Сонограмма: `width = duration * pxPerSecond`, но `pxPerSecond` **динамически уменьшается**
  для длинных треков так, чтобы ширина canvas не превышала `MAX_TRACK_WIDTH = 12000px` — вместо
  честной виртуализации (см. упрощения)
- ✅ Единая формула `translateX = containerWidth/2 - coverWidth - currentTime*pxPerSecond`,
  работающая без ветвления и на `currentTime = 0` (даёт «обложка видна, сонограмма правее» само
  собой — граница cover/сонограмма как раз и есть точка `t=0`)
- ✅ `requestAnimationFrame`, мутирующий `style.transform` через ref напрямую (без React state) —
  как и у соседних `AudioSpectrogram`/`AudioSpectrumVisualizer`
- ✅ Центральная линия — `Box` с вертикальным градиентом, `position: absolute`, `left: 50%`
- ✅ Перемотка — pointer-drag прямо по слайдеру (`setPointerCapture`, дельта X → дельта времени),
  не через отдельный range-инпут
- ✅ Отдельная "live" ветка не нужна: `useOfflineSpectrogram` уже даёт полный офлайн-анализ трека
  целиком (Фаза 9.2), поэтому эта картина не меняется при воспроизведении — только скроллится

**Упрощения v1 (сознательно, ради контролируемого риска без live-проверки):**

- Не замена основного вида страницы, а переключаемый вид (кнопка "Постер + волна трека" /
  "Обычный вид") — стандартная раскладка (фон-спектрограмма + плеер) остаётся дефолтной,
  риск нового компонента не выходит за пределы отдельной вкладки
- Высота `320px`, не `100vh` — эффект тот же, но не захватывает весь экран поверх остального
  контента страницы
- **Виртуализация не реализована** — вместо рисования только видимой области canvas берёт весь
  трек целиком, но с потолком по общей ширине (`MAX_TRACK_WIDTH`), так что для очень длинных
  треков `pxPerSecond` падает ниже 100px/сек (менее детальная картина, зато без риска для
  памяти/GPU браузера на любых длительностях)
- Live-проверка в браузере не выполнена: в dev-БД нет ни одной записи `AudioFile` (таблица
  пуста), загрузка тестового аудио требует входа через реальный OAuth (Ключница), которого нет
  под рукой в этой сессии — только `nx lint`/`nx typecheck:tsgo` (оба зелёные) и подтверждение,
  что dev-сервер kami поднимается и компилируется без ошибок

### 9.6 Butterchurn (Milkdrop 2) — fullscreen визуализация

**Концепция:** кнопка «Визуализация» открывает fullscreen с butterchurn — точный порт WinAmp Milkdrop 2 на WebGL. UI/UX продумывается отдельно.

- ✅ **Установка:** `bun add butterchurn butterchurn-presets` (в `apps/kami/package.json`,
  ambient-типы в `src/types/butterchurn.d.ts` — пакеты не публикуют `.d.ts`)
- ✅ **Интеграция:**
  - Новый компонент `ButterchurnVisualizer` — WebGL canvas на весь экран
  - Получает тот же `AnalyserNode` (общий через `getAnalyzer()` из `audio-page-client`) через
    `visualizer.connectAudio(analyzer)` — не пробрасывает FFT-массивы вручную, butterchurn сам
    читает их из подключённого `AudioNode`
  - Инициализация: `butterchurn.createVisualizer(audioCtx, canvas, { width, height, pixelRatio })`
  - Рендер — `visualizer.render()` в `requestAnimationFrame`-лупе (без ручной передачи FFT — см. выше)
  - Смена пресетов: `visualizer.loadPreset(preset, blendTime)` — плавный переход между пресетами
- ✅ **Пресеты:** случайный стартовый + кнопка "следующий" (циклический перебор по списку имён из
  `butterchurn-presets`). Список с превью-миниатюрами не делали — потребовал бы пререндер
  скриншотов каждого из ~100 пресетов, не оправдано для v1
- ✅ **Fullscreen режим:**
  - `document.documentElement.requestFullscreen()` при открытии (мягкий catch — политика браузера
    может отклонить, тогда работает как fixed-оверлей на весь viewport без скрытия браузерного UI)
  - При выходе (Esc / кнопка ×) — `document.exitFullscreen()` + `fullscreenchange`-listener
    закрывает компонент при выходе из fullscreen любым способом
  - Скрытие header/footer через уже существующий `:fullscreen` CSS (заведён в Фазе 9.4)
- ✅ **Кнопка запуска:** `<Button variant="ghost">` с иконкой `Wand2` рядом с существующей кнопкой
  переключения вида (Фаза 9.5), подпись "Визуализация"
- ✅ **Производительность:** `next/dynamic(..., { ssr: false })` — WebGL-бандл с ~100 пресетами
  грузится только по клику на кнопку, не в основном чанке страницы
- Сложность: **средняя** (~3–4 часа)

**Live-проверка не выполнена** — та же причина, что и в Фазе 9.5: dev-БД без записей `AudioFile`,
нет OAuth-логина под рукой в этой сессии. Подтверждено только `nx typecheck:tsgo`/`nx lint`
(оба зелёные, без новых предупреждений).

### 9.7 Hydra — VJ live-coding режим

**Концепция:** отдельный режим визуализации для тех, кто знает что такое live-coding. Открывается fullscreen с редактором кода Hydra и живой визуализацией реагирующей на трек. Для начинающих — встроенная инструкция (написать попросить VJ-друга).

- ✅ **Установка:** `bun add hydra-synth` (standalone без iframe), ambient-типы в
  `src/types/hydra-synth.d.ts` — пакет не публикует `.d.ts`
- ✅ **Интеграция:**
  - Новый компонент `HydraVisualizer` — WebGL canvas + `<Textarea>` (не monaco-editor —
    достаточно лёгкого редактора без подсветки синтаксиса, не тянуть многосоткилобайтный бандл
    ради этого режима)
  - `hydra-synth` инициализируется с `{ canvas, detectAudio: false, autoLoop: false }` —
    **важное отступление от плана:** `detectAudio: false` уже само по себе не создаёт
    `synth.a`/не запрашивает микрофон (проверено по исходникам пакета), а `autoLoop: false`
    добавлен намеренно — у пакета нет метода остановки собственного внутреннего `raf-loop`,
    без этого флага визуализация продолжала бы рендериться в фоне после закрытия компонента.
    Рендер-луп ведём сами (`requestAnimationFrame` + `hydra.tick(dt)`), как и в Butterchurn
  - Аудио пробрасывается вручную: `window.a = { fft: [...] }` — тот же объект каждый кадр
    обновляется из `AnalyserNode.getByteFrequencyData()`, разбит на 4 полосы (не через
    несуществующий `hydra.a.setBins(fftData)` — метод `setBins` в реальном API принимает
    только количество полос, а не сам массив значений; см. правку плана выше)
  - Пользователь пишет код в редакторе, визуализация обновляется по Ctrl+Enter (`hydra.eval()`
    оборачивается в try/catch — у пакета исполнение через голый `globalThis.eval` без
    внутренней обработки ошибок, иначе синтаксическая ошибка в коде пользователя уронит React)
  - 3 стартовых пресета с реакцией на звук — не видно пустого экрана при открытии
- ✅ **Встроенная инструкция** (сворачиваемый текстовый блок внутри режима, кнопка "Подсказка") —
  краткая шпаргалка по синтаксису и `a.fft[0..3]`, написана мной как временная версия
- ⏳ **Полноценная инструкция и страница `/audio/vj-guide`** — НЕ реализованы, требуют внешнего
  автора (VJ-друг, как и было запланировано) и Keystatic-контента; временная встроенная
  подсказка закрывает минимальный кейс "не смотреть в непонятный экран"
- ✅ **Пресеты для старта:** 3 штуки (пульс баса, калейдоскоп от высоких, вороной-поле от
  середины) — все на `a.fft[...]`, как в примере плана
- ✅ **Сохранение кода:** `localStorage` (`kami-hydra-code`) — автосохранение при каждом успешном
  `Ctrl+Enter`/выборе пресета
- Сложность: **средняя** (~4–5 часов) + отдельная задача написания инструкции (не сделана)

**Live-проверка не выполнена** — та же причина, что и в Фазах 9.5/9.6: dev-БД без записей
`AudioFile`, нет OAuth-логина под рукой в этой сессии. Подтверждено только
`nx typecheck:tsgo`/`nx lint` (оба зелёные, без новых предупреждений).

### 9.8 Другие библиотеки (для оценки)

✅ **Оценка проведена, решение: не подключать ни одну из двух — оставить кастомную реализацию.**

- **wavesurfer.js v7.12.11** (без рантайм-зависимостей, `dist` ~1.4 МБ нераспакованный — waveform
  - spectrogram-плагин + timeline + zoom):
  * Мог бы заменить пп. 9.2 (офлайн-сонограмма) и 9.3 (waveform-пики в сайдбаре) готовым решением
  * **Против:** уже реализованная кастомная сонограмма — не просто waveform, а спектрограмма с
    подобранной teal-цветовой схемой под тему сайта (Фаза 9.2) плюс переиспользуется в
    Фазе 9.5 (постер+слайдер) — под неё пришлось бы городить кастомный рендерер плагина
    wavesurfer поверх готового, то есть выигрыша от библиотеки не остаётся, только рефактор
    ради рефактора. Полный рефактор `AudioPlayer` (как и предупреждал сам пункт плана) —
    неоправданный риск регресса на уже работающем и трижды переиспользуемом компоненте
    (9.2 → фон плеера, 9.3 → сайдбар прогресса, 9.5 → слайдер постера)

- **audiomotion-analyzer v4.5.4** (без зависимостей, `dist` ~300 КБ — EQ bars/area/line с
  градиентами):
  - Мог бы заменить Matrix Rain (Фаза 6/9.1) как более "стандартный" эквалайзер
  - **Против:** Matrix Rain — не временная заглушка, а осознанный авторский выбор эстетики
    (16 языковых/письменностных рецептов, см. Фазу 6) и уже реализованная, отлаженная
    аудио-реактивная визуализация. Замена на типовые EQ-бары была бы понижением
    оригинальности ради "стандартности" — обратный компромисс тому, что нужен персональному
    сайту

**Итог:** обе библиотеки хороши как быстрый старт с нуля, но здесь кастомные реализации Фаз
6/9.1–9.3/9.5 уже написаны, работают и несут собственную визуальную идентичность сайта —
подключение библиотек ради самого факта подключения не оправдано. Пакеты не устанавливались.

---

## Фаза 10: Раздел "Ссылки" (закладки из Android Share)

**Идея:** нажал "Поделиться" на статье (Habr и т.п.) на Android → ссылка сразу сохраняется в Kami. Публичный раздел со списком ссылок, с категориями и метками.

### Web Share Target → сохранение ссылки

- ✅ Route `/share` (POST, обрабатывает `share_target` из `manifest.ts`: `title`, `text`, `url`) — `src/app/share/route.ts`
- ✅ Парсинг `text`/`url` — Android иногда кладёт URL в `text`, а не в `url` (regex-извлечение ссылки из текста)
- ✅ Автозаполнение `title` из `<title>` страницы по ссылке (fetch + парсинг `<title>`, если Android не передал title)
- ✅ После сохранения — редирект в `/admin/links` (без отдельной формы подтверждения — упрощение, см. ниже)
- ✅ `proxy.ts`: `/share` исключён из `next-intl` middleware (аналогично `/api/`) — иначе Android получал бы 307 на `/ru/share` и терял POST-тело

### Модель данных

- ✅ Модель `Link` в `schema/links.zmodel`: `url`, `title`, `description?`, `category: String?`, `tags: String[]`, `createdAt`, `read: Boolean`
  — плоские поля по образцу `LearningItem` (без отдельных моделей `LinkTag`/`LinkCategory` — свободные метки, расширяемость не требует отдельной таблицы)
- ✅ Access control — приватный раздел (`@@allow('all', auth() != null && 'ADMIN' in auth().roles)`), не публичный

### UI

- ✅ `/admin/links` — список сохранённых ссылок (домен, категория/метки, статус прочитано, удаление)
- ✅ Публичный `/links` — витрина с фильтром по категории/метке (клик по чипу, без JS) и
  полнотекстовым поиском (GET-форма, работает без JS) по заголовку/описанию/URL, пагинация
  (`ADMIN_PAGE_SIZE` — тот же размер страницы, что и в админке)
  - **Смена access policy:** модель `Link` была полностью приватной (`@@allow('all', ...ADMIN)`);
    для публичной витрины разделил на `@@allow('read', true)` + `@@allow('create,update,delete',
    ...ADMIN)` — теперь все сохранённые ссылки читаемы без авторизации, пишет только владелец
  - `export const dynamic = 'force-dynamic'` — обязательно для публичной страницы,
    показывающей данные из админки (см. `nextjs-apps.md`)
- ✅ Карточка ссылки: favicon-превью (сервис Google `s2/favicons`, всегда возвращает иконку —
  даже дефолтную для неизвестных доменов, не нужен fallback на ошибку загрузки) в
  `/admin/links` и публичной `/links`. Inline-редактирование категории/меток прямо в строке
  таблицы `/admin/links` (клик по бейджам → два `Input` + Сохранить/Отмена, без перехода на
  отдельную страницу) — новый server action `updateLinkClassificationAction`
- ✅ `/admin/links/tags` — массовое переименование/удаление категорий и меток сразу у всех
  ссылок (не отдельный справочник — категории/метки остались свободными строками в `Link`,
  список и счётчики считаются "на лету" из текущих значений). Переименование категории —
  обычный `updateMany` (scalar-поле); переименование/удаление метки — построчный проход
  (`tags: String[]` — Postgres-массив, `updateMany` не меняет элемент внутри массива, но для
  масштаба личной коллекции ссылок это не проблема). Ссылка на страницу — из `/admin/links`
  (`headerExtra` слот `AdminPageLayout`), без отдельного пункта в сайдбаре (как и `SkillCategory`)

**Упрощения первого слайса (см. коммит):** нет мини-формы подтверждения после Share (сразу
редирект в список). Живая проверка в браузере выполнена частично: подтверждены routing-контракты
(`GET /share` → 405 без locale-редиректа, `/admin/links` корректно редиректит неавторизованного
на вход, таблица `Link` создана в БД) — полный аутентифицированный проход через реальный OAuth
(Ключница) не пройден в этой сессии (нет тестовых учётных данных под рукой). Публичная `/links`,
favicon-превью и inline-редактирование тегов не проверены живьём по той же причине (в dev-БД нет
ни одной записи `Link`) — только `nx typecheck:tsgo`/`nx lint` (оба зелёные).

### PWA

- ✅ `share_target` в `manifest.ts` уже настроен (см. Фаза 4)
- ✅ Офлайн-очередь: если шаринг произошёл без сети — сохранить в IndexedDB и синхронизировать.
  Реализовано на уровне Service Worker (`public/sw.template.js`), не через `pwa-offline`
  skill (`useOfflineForm`/`useSyncQueue`) — та обвязка рассчитана на отправку из React-дерева,
  а POST `/share/` от Android Share Target приходит сразу в SW, минуя JS-код приложения.
  Без npm-зависимостей — сырой `indexedDB` API (`sw.template.js` раздаётся как статика, не
  проходит сборку). Ветка `POST /share/` в `fetch`-обработчике → `handleShareSubmit`: пробует
  `fetch(request)` как обычно, при сетевой ошибке — читает форму из клона запроса и складывает
  в IndexedDB (`kami-share-queue` / `pending`), регистрирует `Background Sync`
  (`self.registration.sync.register`), отдаёт inline HTML-страницу подтверждения. Синхронизация
  — три канала: событие `sync` (тег `kami-sync-share-queue`, когда браузер поддерживает
  Background Sync API), `activate` при обновлении SW, и opportunistic-флаш при любой успешной
  навигации (fallback для браузеров без Background Sync, напр. Firefox for Android). Честное
  ограничение: живая проверка (реальное Android-устройство + отключение сети) в этой сессии не
  выполнена — только `nx typecheck:tsgo`/`nx lint` (оба зелёные), логика проверена чтением кода

### Загрузка остальных категорий файлов через Share

**Идея:** не только ссылки — через тот же Android Share Sheet можно прислать в Kami файл (картинку, PDF, документ и т.п.), и он попадёт в общий раздел с категориями и метками, как ссылки.

- ⏳ Расширить `share_target` в `manifest.ts`: добавить `files` в `params` (mime-типы: `image/*`, `application/pdf`, и др. по необходимости), `enctype: 'multipart/form-data'` для файлового шаринга (нужен отдельный `action`, т.к. у `GET`/`text` шаринга другой enctype — либо два share_target нельзя, см. ограничение спеки, нужно проверить можно ли иметь общий `/share/` route с веткой по `Content-Type`)
- ⏳ **Ветвление по типу файла (уточнение владельца, 2026-09-06):** расшаренный аудиофайл (`audio/*`)
  должен попадать НЕ в общий `UploadedFile`/раздел ссылок, а прямо в существующую модель
  `AudioFile` и раздел `/audio` — тот же путь, что и обычная загрузка через `/admin/audio`.
  Роут `/share` должен определять MIME расшаренного файла и направлять `audio/*` в
  audio-пайплайн (парсинг тегов/обложки, см. существующий аплоадер), а остальные типы
  (картинки, PDF, документы) — в общий `UploadedFile`/`Link`-подобный раздел ниже
- ⏳ Переиспользовать модель `UploadedFile` (уже есть, см. Фаза 6 `/admin/files`) — добавить к ней `category`/`tags` (те же `LinkTag`/категории, что у `Link`, либо общая модель меток на оба типа) — для НЕ-аудио файлов
- ⏳ Объединённый раздел — `Link` (ссылки) и `UploadedFile` (файлы, не аудио) показываются в одном списке `/links` с фильтром по типу (ссылка/файл) + категории/метке, либо общая модель `SavedItem` с полем `type: LINK | FILE`. Аудио в эту витрину не входит — оно уже целиком живёт в `/audio`
- ⏳ **Раздел "Видео"** — отдельная категория, подход обсудим отдельно (пользователь расскажет детали позже)

---

## Обновления

| Дата       | Изменение                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 2025-12-08 | Создан план, настроен i18n                                                                           |
| 2025-12-08 | Chakra UI v3, Header/Footer, Matrix-эффект, Hero, E2E тесты                                          |
| 2025-12-08 | Страница "О себе" с компонентами StatCard и FeatureCard                                              |
| 2025-12-08 | База данных: Prisma + ZenStack, модели, сиды, страница навыков                                       |
| 2025-12-08 | Страница проектов, SEO (meta, OG, sitemap, robots)                                                   |
| 2025-12-08 | Блог: Keystatic + Markdoc, список статей, страница статьи                                            |
| 2025-12-23 | Добавлена Фаза 5: Консалтинг                                                                         |
| 2025-12-23 | Страница CV/Резюме, страница "Который час?" (UNIX эпоха)                                             |
| 2025-12-23 | RSS-фид для блога, JSON-LD разметка, Auth.js v5 с GitHub OAuth                                       |
| 2025-12-23 | Полная авторизация с БД: OAuth (GitHub, Google, Yandex), email/password                              |
| 2025-12-23 | Telegram OAuth, email верификация (Nodemailer), страница verify-email                                |
| 2025-12-27 | Docker-конфигурация: Dockerfile.production, docker-compose.production.yml                            |
| 2025-12-27 | Magic Link: вход по ссылке без пароля                                                                |
| 2025-12-27 | Форма "Позвать на работу": 7-шаговый wizard с Form.Steps, email-уведомления                          |
| 2025-12-27 | PWA: Serwist, manifest.ts, Service Worker, офлайн-страница, Web Share Target                         |
| 2025-12-27 | UX: Framer Motion анимации (Hero, StatCard, FeatureCard, motion компоненты)                          |
| 2025-12-27 | Accessibility: SkipLink, ARIA landmarks (banner, navigation, contentinfo)                            |
| 2025-12-27 | Performance: dynamic import Hero, React.memo карточки, Prisma select                                 |
| 2025-12-27 | Consulting: страница услуг, модели ConsultingService/Request, форма заявки                           |
| 2025-12-27 | Consulting: email-уведомления о новых заявках (HTML-шаблон, MailHog для dev)                         |
| 2025-12-27 | Google Calendar API: интеграция SlotPicker с реальными слотами                                       |
| 2025-12-27 | Yandex Metrica: компонент аналитики с NEXT_PUBLIC_YM_COUNTER_ID                                      |
| 2025-12-27 | Админ-панель: dashboard, requests, testimonials, cases, slots, learning                              |
| 2025-12-27 | Комментарии в блоге: BlogComment модель с вложенными ответами                                        |
| 2025-12-27 | Списки изученного: LearningItem модель, публичная /learning страница                                 |
| 2025-12-27 | AI-чатбот: Claude + Vercel AI SDK v6, плавающий виджет ChatWidget                                    |
| 2025-12-31 | Добавлена Фаза 7: Кросс-постинг в соцсети (Telegram, VK, X, FB, IG и др.)                            |
| 2025-12-31 | Запланирована миграция на Better Auth (Auth.js в maintenance mode)                                   |
| 2026-01-01 | ✅ Миграция на Better Auth: схема БД, auth.ts, actions, client, удалены старые verify pages          |
| 2026-01-01 | ✅ Замена Serwist на ручной SW: sw.template.js, update-sw-version.mjs (совместимость с Turbopack)    |
| 2026-01-03 | ✅ Рефакторинг: KamiForm (createForm + extraSelects), унификация форм на KamiForm                    |
| 2026-01-03 | ✅ Рефакторинг: консолидация labels (kami-form/labels.ts), устранение дублирования в admin           |
| 2026-01-03 | ✅ Рефакторинг: UI токены (bg.panel, bg.subtle, border.subtle, fg.muted вместо hardcoded RGB)        |
| 2026-01-03 | ✅ Аудит i18n: toaster, CONTACT, RSS Feed, форматирование дат — всё уже корректно                    |
| 2026-01-03 | ✅ Better Auth organizations: команды, участники, приглашения                                        |
| 2026-01-03 | ✅ Team Surveys: опросы для оценки кандидата командой работодателя                                   |
| 2026-01-03 | ✅ Rate limiting: database storage, strict rules, IP headers, client error handling                  |
| 2026-01-03 | ✅ Forms audit: zenstack-form-plugin, i18n labels, SelectSurveyQuestionType, generated labels        |
| 2026-02-01 | ✅ Admin Learning CRUD: /admin/learning/new, /admin/learning/[id] (создание/редактирование)          |
| 2026-02-01 | ✅ Admin Skills CRUD: /admin/skills (навыки), /admin/skills/categories (категории навыков)           |
| 2026-02-01 | ✅ Skill startYear: поле года начала практики, автоматический расчёт опыта                           |
| 2026-03-20 | ✅ Quiz v2: 3 новые шкалы (BAR/PAG/DPR), 290 вопросов, 13 осей на радаре                             |
| 2026-03-20 | ✅ Quiz: формула TZ v2, BAR-фильтр, кризисный блок, дисклеймер                                       |
| 2026-03-20 | ✅ Quiz: светлые стороны, взаимодействия типов (45 пар), модификаторы                                |
| 2026-03-20 | ✅ Quiz: пропуск вопросов (QuizSkippedQuestion), исключение повторов                                 |
| 2026-03-20 | ✅ Quiz: все переводы RU→EN (1649 текстов + 1450 вопросов), деплой на прод                           |
| 2026-03-21 | ✅ Quiz: стратифицированное перемешивание, убрано досрочное завершение порции                        |
| 2026-03-21 | ✅ Фаза 7 Этап 1: кросс-постинг Telegram + VK (модели, сервисы, actions, admin UI, PublishButton)    |
| 2026-03-21 | ✅ Фаза 7: Facebook кросс-постинг, прокси tg-proxy/fb-proxy на mail.letar.best с SSL                 |
| 2026-06-16 | Запланирована Фаза 10: раздел "Ссылки" — сохранение через Android Share Target, категории, метки     |
| 2026-06-16 | Фаза 10 расширена: загрузка остальных категорий файлов через Share, раздел "Видео" — детали позже    |
| 2026-08-12 | ✅ GlitchTip (§70) + staging окружение впервые заведено (§18.7 M2), Keystatic NODE_ENV-баг           |
| 2026-08-19 | 🔍 Аудит setRequestLocale/SSG: найден root cause, почему все страницы `ƒ Dynamic` (см. техдолг ниже) |
| 2026-08-24 | ✅ §18.7 M2 e2e-гейт закрыт — staging e2e 150/150, добавлен в `E2E_GATED_APPS`                       |
| 2026-09-04 | ✅ Фаза 9.4: кнопка fullscreen в AudioPlayer, скрытие header/footer через `:fullscreen`              |
| 2026-09-06 | ✅ Фаза 9.1–9.3: swap визуализаций+цвет, офлайн-сонограмма, waveform-пики в сидбаре player           |
| 2026-09-06 | ✅ Фаза 10 (первый слайс): `/share` route, модель `Link`, `/admin/links` — см. упрощения в разделе   |
| 2026-09-06 | ✅ Фаза 9.5 (v1): постер+сонограмма slide, переключаемый вид, без виртуализации (см. упрощения)      |
| 2026-09-06 | ✅ Фаза 8 отмечена (уже сделана ранее) + Фаза 7 Этап 2: сид-данные SocialPlatform                    |
| 2026-09-06 | ✅ Фаза 6 Matrix Rain отмечена (уже реализована), убран забытый `console.log`                        |
| 2026-09-06 | ✅ Фаза 9.6: Butterchurn fullscreen-визуализация (WebGL, ~100 пресетов), см. упрощения               |
| 2026-09-06 | ✅ Фаза 9.7: Hydra VJ live-coding режим — редактор+пресеты+localStorage, инструкция-страница ⏳      |
| 2026-09-06 | ✅ Фаза 9.8: оценка wavesurfer.js/audiomotion-analyzer — решение оставить кастом, не устанавливать   |
| 2026-09-06 | ✅ Фаза 10: публичная `/links` (фильтры+поиск+пагинация), `Link` стал публично читаемым              |
| 2026-09-06 | ✅ Фаза 10: favicon-превью карточки + inline-редактирование категории/меток в `/admin/links`         |
| 2026-09-06 | ✅ Фаза 10: `/admin/links/tags` — массовое переименование/удаление категорий и меток                 |
| 2026-09-06 | ✅ Фаза 10: офлайн-очередь Share Target — IndexedDB + Background Sync в `sw.template.js`             |

## Техдолг: setRequestLocale не даёт SSG — root layout вызывает getSession() безусловно

По аналогии со studio/aira-web проверялась гипотеза «страницам не хватает `setRequestLocale`
в `page.tsx`, из-за чего `next build` печатает `ƒ` вместо `●`/`○`». Гипотеза не подтвердилась.

`nx build kami` показывает `ƒ Dynamic` **для всех** роутов `[locale]/*`, включая те, что уже
вызывали `setRequestLocale` до этой сессии (`about`, `cv`, `page` (главная), `blog`,
`blog/[slug]`, `learning`, `skills`, `projects`, `privacy`, `terms`, `data-deletion`). Добавление
`setRequestLocale` в ещё пять кандидатов (`hire`, `offline`, `403`, `(auth)/sign-up`,
`auth/signin`) и разбор `consulting/page.tsx` на серверную обёртку + клиентский компонент маркер
не изменили — правки отменены (`git checkout`), в коде ничего не осталось.

**Причина:** `src/app/[locale]/layout.tsx` (корневой layout, общий для всего дерева) вызывает
`getSession()` безусловно — `Promise.all([getMessages(), getSession(), isAdmin()])` — чтобы
собрать `UserContextValue` для `UserProvider`/шапки на каждой странице. `getSession()` из
`@letar/auth/server` (`createSessionHelpers`) внутри делает `await headers()`
(`libs/auth/src/server/session.ts:36`) — это Dynamic API Next.js, которое форсирует динамический
рендеринг для всего маршрута, где вызывается, включая общего предка. Раз вызов в корневом
layout — весь `[locale]`-поддерево не может стать SSG независимо от `setRequestLocale` в
конкретной `page.tsx`.

Это тот же класс причины, что нашли в aboi (`requireAdmin()` на layout), но на уровень выше:
не гейт конкретного раздела, а общий header/user-context на **всём** сайте.

**Что нужно, чтобы вернуться к SSG хотя бы для части страниц** (не сделано в этой сессии —
архитектурное изменение вне объёма задачи «добавить setRequestLocale»):

- Либо вынести получение сессии для шапки в клиентский компонент (fetch на клиенте /
  `authClient.useSession()`), либо
- Partial Prerendering (Next.js PPR, экспериментальная фича) — статический shell + динамический
  slot для user-context, либо
- Явно смириться с тем, что весь сайт рендерится динамически (SSR каждый запрос) — тогда
  `setRequestLocale` всё равно стоит добавлять по мере правок каждой страницы ради корректной
  работы `getTranslations`/`getLocale` без предупреждений next-intl в dev, но не ради SSG-маркера.

## Техдолг: подключить theme:check

Гейт сырых цветов/теней/transition в UI-коде (`nx g @letar/generators:theme-check-integrate
kami`, генератор `libs/generators`, обёртка над `@letar/theme-check`) пока не подключён. Уже
подключено: domwellbes, studio, aboi. **Особый случай:** у kami нет каталога `src/theme/`
(использует общий `@letar/chakra-provider` без локальных оверрайдов) — генератор в этом случае
не находит `themePrefix`, и все найденные HEX/rgba формально считаются «вне темы» (87 находок по
замеру 2026-08-19, часть из них — легитимные значения общей темы, не баги). Перед первым прогоном
свериться с разбором «kami — особый случай» в `.claude/docs/theme-hardcode-gate-coverage.md`, не
заносить находки в allowlist не глядя. Подключать по одному, не пакетно.
