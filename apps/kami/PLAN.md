# План разработки Kami

Персональный сайт-портфолио фронтенд-архитектора.

## Легенда

- ✅ Готово
- 🚧 В работе
- ⏳ Запланировано

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
- ⏳ Matrix Rain: мультиязычные рецепты (переработка заставки)
  - Каждый столбец — текст рецепта на одном из языков/письменностей
  - Языки: японский (суши), китайский (пекинская утка), корейский (кимчи), арабский (хумус), иврит (шакшука), деванагари (бирьяни), тайский (том-ям), грузинский (хинкали), эфиопский/геэз (инджера), тамильский (доса), тибетский (масляный чай)
  - Программирование: JavaScript (фрагменты кода), BrainFuck (программа)
  - Случайный порядок столбцов при каждой загрузке (перемешивание языков)
  - Вдохновение: в оригинальной Matrix авторы спрятали рецепт суши в символах

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
- ⏳ Сид-данные для SocialPlatform (Telegram, VK, Facebook конфиги)
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

- ⏳ Вынести "Который час?" в отдельное приложение (отдельный домен, своя стилистика)

---

## Обновления

| Дата       | Изменение                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------- |
| 2025-12-08 | Создан план, настроен i18n                                                                        |
| 2025-12-08 | Chakra UI v3, Header/Footer, Matrix-эффект, Hero, E2E тесты                                       |
| 2025-12-08 | Страница "О себе" с компонентами StatCard и FeatureCard                                           |
| 2025-12-08 | База данных: Prisma + ZenStack, модели, сиды, страница навыков                                    |
| 2025-12-08 | Страница проектов, SEO (meta, OG, sitemap, robots)                                                |
| 2025-12-08 | Блог: Keystatic + Markdoc, список статей, страница статьи                                         |
| 2025-12-23 | Добавлена Фаза 5: Консалтинг                                                                      |
| 2025-12-23 | Страница CV/Резюме, страница "Который час?" (UNIX эпоха)                                          |
| 2025-12-23 | RSS-фид для блога, JSON-LD разметка, Auth.js v5 с GitHub OAuth                                    |
| 2025-12-23 | Полная авторизация с БД: OAuth (GitHub, Google, Yandex), email/password                           |
| 2025-12-23 | Telegram OAuth, email верификация (Nodemailer), страница verify-email                             |
| 2025-12-27 | Docker-конфигурация: Dockerfile.production, docker-compose.production.yml                         |
| 2025-12-27 | Magic Link: вход по ссылке без пароля                                                             |
| 2025-12-27 | Форма "Позвать на работу": 7-шаговый wizard с Form.Steps, email-уведомления                       |
| 2025-12-27 | PWA: Serwist, manifest.ts, Service Worker, офлайн-страница, Web Share Target                      |
| 2025-12-27 | UX: Framer Motion анимации (Hero, StatCard, FeatureCard, motion компоненты)                       |
| 2025-12-27 | Accessibility: SkipLink, ARIA landmarks (banner, navigation, contentinfo)                         |
| 2025-12-27 | Performance: dynamic import Hero, React.memo карточки, Prisma select                              |
| 2025-12-27 | Consulting: страница услуг, модели ConsultingService/Request, форма заявки                        |
| 2025-12-27 | Consulting: email-уведомления о новых заявках (HTML-шаблон, MailHog для dev)                      |
| 2025-12-27 | Google Calendar API: интеграция SlotPicker с реальными слотами                                    |
| 2025-12-27 | Yandex Metrica: компонент аналитики с NEXT_PUBLIC_YM_COUNTER_ID                                   |
| 2025-12-27 | Админ-панель: dashboard, requests, testimonials, cases, slots, learning                           |
| 2025-12-27 | Комментарии в блоге: BlogComment модель с вложенными ответами                                     |
| 2025-12-27 | Списки изученного: LearningItem модель, публичная /learning страница                              |
| 2025-12-27 | AI-чатбот: Claude + Vercel AI SDK v6, плавающий виджет ChatWidget                                 |
| 2025-12-31 | Добавлена Фаза 7: Кросс-постинг в соцсети (Telegram, VK, X, FB, IG и др.)                         |
| 2025-12-31 | Запланирована миграция на Better Auth (Auth.js в maintenance mode)                                |
| 2026-01-01 | ✅ Миграция на Better Auth: схема БД, auth.ts, actions, client, удалены старые verify pages       |
| 2026-01-01 | ✅ Замена Serwist на ручной SW: sw.template.js, update-sw-version.mjs (совместимость с Turbopack) |
| 2026-01-03 | ✅ Рефакторинг: KamiForm (createForm + extraSelects), унификация форм на KamiForm                 |
| 2026-01-03 | ✅ Рефакторинг: консолидация labels (kami-form/labels.ts), устранение дублирования в admin        |
| 2026-01-03 | ✅ Рефакторинг: UI токены (bg.panel, bg.subtle, border.subtle, fg.muted вместо hardcoded RGB)     |
| 2026-01-03 | ✅ Аудит i18n: toaster, CONTACT, RSS Feed, форматирование дат — всё уже корректно                 |
| 2026-01-03 | ✅ Better Auth organizations: команды, участники, приглашения                                     |
| 2026-01-03 | ✅ Team Surveys: опросы для оценки кандидата командой работодателя                                |
| 2026-01-03 | ✅ Rate limiting: database storage, strict rules, IP headers, client error handling               |
| 2026-01-03 | ✅ Forms audit: zenstack-form-plugin, i18n labels, SelectSurveyQuestionType, generated labels     |
| 2026-02-01 | ✅ Admin Learning CRUD: /admin/learning/new, /admin/learning/[id] (создание/редактирование)       |
| 2026-02-01 | ✅ Admin Skills CRUD: /admin/skills (навыки), /admin/skills/categories (категории навыков)        |
| 2026-02-01 | ✅ Skill startYear: поле года начала практики, автоматический расчёт опыта                        |
| 2026-03-20 | ✅ Quiz v2: 3 новые шкалы (BAR/PAG/DPR), 290 вопросов, 13 осей на радаре                          |
| 2026-03-20 | ✅ Quiz: формула TZ v2, BAR-фильтр, кризисный блок, дисклеймер                                    |
| 2026-03-20 | ✅ Quiz: светлые стороны, взаимодействия типов (45 пар), модификаторы                             |
| 2026-03-20 | ✅ Quiz: пропуск вопросов (QuizSkippedQuestion), исключение повторов                              |
| 2026-03-20 | ✅ Quiz: все переводы RU→EN (1649 текстов + 1450 вопросов), деплой на прод                        |
| 2026-03-21 | ✅ Quiz: стратифицированное перемешивание, убрано досрочное завершение порции                     |
| 2026-03-21 | ✅ Фаза 7 Этап 1: кросс-постинг Telegram + VK (модели, сервисы, actions, admin UI, PublishButton) |
| 2026-03-21 | ✅ Фаза 7: Facebook кросс-постинг, прокси tg-proxy/fb-proxy на mail.letar.best с SSL              |
