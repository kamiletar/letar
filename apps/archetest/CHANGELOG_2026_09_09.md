# Changelog (Архив до 2026-09-09)

> Продолжение основного CHANGELOG.md
> Версии: 0.27.20 — 0.26.0

## [0.27.20] - 2026-09-09

### Fixed

- `package.json`: `@letar/forms` не был объявлен ни в `dependencies`, ни в
  `nx.implicitDependencies`, хотя реально импортируется — граф Nx не видел это ребро. Добавлен
  в `dependencies` (`workspace:*`).

## [0.27.19] - 2026-09-05

### Fixed

- **`safety-net.spec.ts` — регрессия на всех трёх браузерах, root cause не текстовый, а
  исчерпание банка вопросов.** После коммита `6c36a0ea` (явная проверка совпадения текста
  варианта перед кликом) деплой-агент увидел падение на chromium/firefox/webkit разом на
  финальной проверке текста safety-net-сообщения (`element(s) not found`, не таймаут) —
  ложно похоже на регрессию от той правки. Настоящая причина: `getRandomQuestionsAction`
  исключает уже отвеченные/пропущенные вопросы (`excludeIds`) навсегда для фиксированного
  `TEST_EMAIL`, а DPR/BAR/BOR — маленькие шкалы (43/17/53 вопроса из 2126). После многих
  диагностических прогонов этого e2e-теста (см. тред `797` в agent-mail) все три корзины для
  этого пользователя опустели одновременно — сессия получала 0 вопросов по триггерным шкалам,
  `normalized` (защищённое деление) был 0, safety-net не мог сработать ни при каком выборе
  ответов. Фикс — тест сбрасывает прогресс перед стартом квиза через уже существующую
  продовую self-service фичу 152-ФЗ (`deleteMyQuizDataAction`, кнопка «Удалить мои
  результаты» на `/settings`), а не заведением нового тестового пользователя (осознанно
  отвергнуто раньше — «без плодения тестовых пользователей в staging»). Проверено живьём
  против staging: 21/21 на всех трёх браузерах.

## [0.27.18] - 2026-09-04

### Changed

- Директивы форм в `schema.zmodel` переведены на основной синтаксис `@meta("form.*", value)`
  (`libs/zenstack-form-plugin` v3.0.0) — кодмодом, 2 директивы (`ProfessionalLead.name`/`email`),
  без ручных правок. Старый `///`-комментарийный синтаксис оставался рабочим, но deprecated.

## [0.27.17] - 2026-09-03

### Changed

- Локальный паттерн `window.location.origin` (в состоянии + `useEffect`) в `dev/qr/page.tsx` и
  `express-results.tsx` заменён на общий хук `useClientOrigin()` из `@letar/hooks` — тот же
  паттерн уже дедуплицирован в `grandslamcup` (2026-09-03).

## [0.27.16] - 2026-09-03

### Fixed

- Снятие регистрации Service Worker на `/express` шло по `registrationsRef` (снапшот с текущей
  загрузки страницы), а не по `navigator.serviceWorker.getRegistrations()` — воркер,
  зарегистрированный в прошлой сессии браузера (или до появления консент-гейта), в ref не попадал,
  и отзыв согласия ничего не снимал. Тот же баг уже был найден и починен в studio/grandslamcup/mandala
  (2026-09-03); archetest отличался только тем, что регистрирует SW сразу на двух scope
  (`/express`, `/en/express`). Локальный компонент заменён на общий `ServiceWorkerRegistration`
  (`@letar/ui` → `useOfflineServiceWorker`, `libs/hooks`), который уже поддерживает множественные
  scope и снимает регистрацию через `getRegistrations()`.

## [0.27.15] - 2026-09-02

### Fixed

- `robots.ts` разрешал индексацию на staging (`archetest-stage.s3.letar.best`) — гейт строился
  из хардкод-константы без проверки, что сайт реально крутится на боевом домене. Переведено на
  `@letar/seo` (`isProductionDomain()`), `NEXT_PUBLIC_BASE_URL` добавлена в
  `docker-compose.staging.yml`/`docker-compose.production.yml` и `.env.staging.enc`/
  `.env.docker.enc` — тот же паттерн, что и в `pravda`/`aira-web` (§33 `PLAN-INFRA-2.md`).

## [0.27.14] - 2026-09-02

### Fixed

- Деплой миграции `Account.issuer` backfill был заблокирован e2e-гейтом неделю — `OfflineConsentBanner`
  (`libs/ui`, `zIndex: "banner"`) перехватывал клик по чекбоксу согласия на `/express` у
  `StickyActionBar`. Фикс в `libs/ui` (не в самом archetest) — см.
  [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).

## [0.27.13] - 2026-09-02

### Added

- `public/llms.txt` — карта публичных разделов для LLM-агентов (llmstxt.org), см.
  [.claude/docs/llms-txt-pattern.md](../../.claude/docs/llms-txt-pattern.md).

## [0.27.12] - 2026-08-31

### Fixed

- `better-auth` `prismaAdapter()` получал голый ZenStack `orm` вместо нативного `PrismaClient` —
  `POST /api/auth/sign-up/email`/`sign-in/email` стабильно давали пустой `500` без единой строки
  в логах. Отдельный `prismaAuth`-клиент через `createLazyPrismaAuthClient` (`@letar/auth/server`)
  по образцу mandala/domwellbes/svoichuzhie/dsperevod/studio/aboi. Заодно
  `src/app/api/consent/route.ts` переведён на `getEnhancedPrisma` — брал тот же сломанный
  ре-экспорт из `lib/prisma.ts`. См.
  [better-auth-prismaadapter-zenstack-incompatibility](/.claude/docs/better-auth-prismaadapter-zenstack-incompatibility.md).

## [0.27.11] - 2026-08-25

### Fixed

- `Account.issuer` — добавлено в общий ZenStack-фрагмент `AccountFields`
  (`libs/zenstack-fragments`), better-auth 1.7.1 требует это поле при создании/обновлении
  `Account` (регистрация, сброс пароля). `db:push` прогнан, live sign-up не проверялся в этой
  сессии. См. [better-auth-1.7-account-issuer-field](/.claude/docs/better-auth-1.7-account-issuer-field.md).

## [0.27.10] - 2026-08-25

### Fixed

- Ссылка «← Назад на главную» на `/for-professionals` — вынесена в `TouchLink` (`@letar/ui`),
  задаёт `minH="2.75rem"` для соответствия WCAG 2.5.5 (touch target). Остальные короткие ссылки в
  приложении (карточка «странице кабинета», согласие с политикой) — инлайновые ссылки внутри
  предложения, подпадают под исключение WCAG 2.5.5 «target is in a sentence or block of text» и
  оставлены без изменений; ссылки с `target="_blank"` (DOI-источники, политика конфиденциальности)
  вне скоупа по условию задачи.

## [0.27.8] - 2026-08-21

### Fixed

- `config.matcher` в `proxy.ts` заменён с вызова `buildIntlMatcher()` на литерал массива — Next.js
  статически парсит `config.matcher` через AST на build-time без исполнения модуля, вызов функции
  ломал `next build`.

## [0.27.6] - 2026-08-20

### Changed

- **`useAnimatedScores`** (`hexagram-chart.tsx`) — `globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches`
  заменено на `prefersReducedMotion()` из `@letar/hooks` (аудит дублей по монорепо). Вызов
  остался внутри того же `useEffect`, менялся только источник чтения matchMedia.

## [0.27.5] - 2026-08-19

### Fixed

- Бесконечный редирект на `/sign-in` после успешного входа через Ключницу. `signInWithLetarAuth()`
  вызывался без явного `callbackURL` — дефолт берёт текущий URL страницы, а на `/sign-in` это
  всегда сама `/sign-in`. Тот же баг, что был найден и исправлен в `studio` (см. корневой
  `PLAN.md` §41 addendum). `callbackURL` теперь передаётся явно.

## [0.27.4] - 2026-08-13

### Fixed

- **`QuizIntro`: гидратационный мисматч `disclaimerAccepted`** — `useState`-инициализатор читал
  `localStorage` синхронно (на первом клиентском рендере), а сервер рендерил дефолт из БД.
  Теперь дефолт совпадает на сервере и первом клиентском рендере, сохранённое согласие
  подтягивается в `useEffect`. См. [ssr-hydration-persisted-state.md](/.claude/docs/ssr-hydration-persisted-state.md).

## [0.27.3] - 2026-08-12

### Changed

- **`ShareResultButton` переведён на общий `useShare` из `@letar/ui`** — тот же паттерн
  (`navigator.share` + молчаливый выход на `AbortError` + fallback-копирование), что был
  реализован здесь и независимо продублирован в `aprel8008/ShareComic`, вынесен в хук.

## [0.27.2] - 2026-08-12

### Changed

- **`ShareResultButton` — фолбэк-копирование переведено на `useCopyToClipboard` из `@letar/ui`**
  (`navigator.share` остался приоритетным путём); попутно получил fallback на
  `execCommand('copy')`, которого раньше не было.

## [0.27.0] - 2026-07-29

### Changed

- **UX чекбокса согласия (`DisclaimerConsent`) — переехал в липкую панель, техдолг
  из PLAN.md закрыт.** Раньше чекбокс был последним элементом 4-абзацного дисклеймера
  в конце прокручиваемого текста — пользователь должен был долистать до самого низа,
  чтобы его увидеть (замечание Kami 2026-07-29: «Чекбокс за пределами экрана и
  непонятно, что нужно делать»). Теперь: полный текст ужат до одной строки-сводки
  со ссылкой «Подробнее» (открывает диалог с полным текстом, ничего не потеряно),
  сам чекбокс переехал в `StickyActionBar` рядом с CTA-кнопкой — по образцу
  `CookieBanner`, оба элемента всегда на экране вместе, связь «отметил → кнопка
  включилась» видна без скролла. `size="lg"` — увеличенный тач-таргет (WCAG 2.5.5).
  Заодно убран `useScrollGate`/scroll-sentinel с обоих интро (полный квиз и
  экспресс) — гейт форсировал полную прокрутку именно ради видимости чекбокса,
  сейчас в этом нет смысла: сама причина скрытости устранена архитектурно, а не
  патчем поверх старой разметки. Компонент `DisclaimerConsent` разделён на
  `DisclaimerSummary` (сводка + диалог) и `DisclaimerConsentCheckbox` (чекбокс,
  `data-testid` сохранён — e2e-локаторы не менялись). Проверено вживую (JS-клики
  в реальном браузере, mobile 375px и desktop 1280px): чекбокс и кнопка в одном
  вьюпорте без скролла, клик по чекбоксу мгновенно разблокирует CTA, диалог
  «Подробнее» открывает полный текст. `nx test`/`typecheck:tsgo`/lint зелёные;
  `express.spec.ts`/`kiosk.spec.ts` (4/4) и `mood-check-in.spec.ts` (2/2) на
  chromium — зелёные (`safety-net.spec.ts` падает по независимой причине,
  отсутствие `DEV_SESSION_TOKEN` в локальном окружении — задокументированный
  и предсуществующий локальный лимит, не регрессия).

## [0.26.7] - 2026-07-29

### Fixed

- **`safety-net.spec.ts` — четыре дополнительных, независимых бага, вскрытых по
  очереди по мере закрытия предыдущих** (полная хронология — `PLAN.md`):
  1. Тест логинился через `dev-session` и ни разу не кликал чекбокс согласия,
     полагаясь на скрытое состояние персистентной staging-БД — исправлено условным
     кликом через `clickWithHydrationRetry`.
  2. Персистентный `TEST_EMAIL` копил прогресс между прогонами — CTA становился
     «Продолжить тест» вместо «Начать тест»; локатор кнопки теперь матчит оба
     варианта regex'ом.
  3. Общий локатор `[data-part="control"]` матчил любой чекбокс на странице,
     включая всегда-`disabled` «Необходимые» в `CookieBanner` — добавлен
     `data-testid="disclaimer-consent-checkbox"` на `Checkbox.Control`
     (`disclaimer-consent.tsx`), все 4 e2e-спека (`express`/`kiosk`/
     `mood-check-in`/`safety-net`) переведены на `getByTestId`.
  4. `isDisabled()` — разовый снимок DOM, не поллинг — ловил переходное
     `disabled`-состояние в окне гидратации до того, как `useScrollGate`
     выставлял `reachedEnd=true`; заменено на `waitFor({state: 'visible',
timeout: 5_000})`.
  - **Итог: `deploy_app(archetest, production)` — полный e2e-сьют 21/21 на
    chromium/firefox/webkit**, hard e2e-gate впервые пройден живым деплоем.

## [0.26.6] - 2026-07-29

### Fixed

- **e2e: гонка гидратации controlled-чекбокса согласия** — `acceptConsentAndStart`
  (`mood-check-in.spec.ts`, `express.spec.ts`, `kiosk.spec.ts`) теперь ретраит клик по
  чекбоксу, если кнопка старта не разблокировалась за 2с. Настоящая причина всех
  предыдущих 15-18/21 провалов e2e-гейта — клик по нативному `<input>` иногда происходит
  до того, как React навесил `onCheckedChange` (гидратация), controlled-компонент
  откатывает состояние назад. Воспроизведено многократными прогонами `nx e2e` против
  production-билда — Chromium стабилен, Firefox/WebKit флакали ~50%. 20/20 прогонов после
  фикса. Прод-код (`DisclaimerConsent`, `StickyActionBar`) не менялся — предыдущие CSS-фиксы
  остаются в силе (адресуют отдельный, реальный, но не блокирующий баг), просто не были
  причиной e2e-провалов.
- **`express.spec.ts`** — уточнён локатор `getByRole('link', { name: 'Открыть полный
тест' })` → `.first()`: на странице результатов легитимно два линка с этим текстом
  (основной CTA + `ScaleTeaser`), оба ведут на `/`.

## [0.26.5] - 2026-07-29

### Fixed

- **`DisclaimerConsent`** получил `scroll-margin-bottom` — `padding-bottom`-резерв под
  `StickyActionBar` (0.26.4) защищал только «докрутили до самого низа», но браузерный
  `scrollIntoView()` (и Playwright-actionability) скроллит минимально необходимое
  расстояние, из-за чего чекбокс мог застревать в перекрытой sticky-зоне на
  промежуточной scroll-позиции. Подтверждено настоящим Playwright (не ручными кликами).

## [0.26.4] - 2026-07-29

### Fixed

- **`StickyActionBar` (`@letar/ui`)** публикует свою высоту в
  `--letar-sticky-actionbar-height` — панель перекрывала свой же гейтящий чекбокс
  согласия (`DisclaimerConsent`) на интро-экранах при полной прокрутке: клик
  проходил, но состояние не менялось, потому что физически попадал в саму панель,
  а не в чекбокс. `quiz-intro.tsx`/`express-container.tsx` резервируют место снизу.

## [0.26.3] - 2026-07-29

### Fixed

- **`MoodCheckIn` — кнопка «Пропустить»** обёрнута в `StickyActionBar` (`@letar/ui`).
  Была обычной inline-кнопкой в потоке документа — CSS-переменная `--letar-cookie-banner-
height` её не поднимала, на короткой странице (без скролла) кнопка попадала под fixed
  cookie-баннер и перехватывалась его ссылкой (нашлось на повторном e2e-прогоне на 0.26.2:
  `safety-net.spec.ts`/`mood-check-in.spec.ts` зависали на клике «Пропустить»).

## [0.26.2] - 2026-07-29

### Fixed

- **`safety-net.spec.ts`** переписан на `/api/auth/dev-session` вместо прямого доступа к
  БД через `pg` — старый подход падал на staging-раннере (`DATABASE_URL`/`.env` там нет).
- **`CookieBanner`/`StickyActionBar` (`@letar/ui`)** — исправлен остаточный баг координации
  bottom-anchored компонентов (закрыто ранее сегодня, commit `1d8ae644`): высота баннера,
  публикуемая в CSS-переменную `--letar-cookie-banner-height`, замерялась один раз при
  монтировании и не переизмерялась без явного `window resize` — на статичном вьюпорте
  (фестивальный планшет) значение застревало неверным (замер `1655px` вместо реальных
  `142px`). `ResizeObserver` возвращён как основной механизм пересчёта.

## [0.26.1] - 2026-07-28

### Added

- **`docker-compose.staging.yml`** — staging-инстанс archetest заведён с нуля (не
  существовал), снимает блокер hard pre-deploy e2e-gate (PLAN-INFRA.md §18.7).
- **`/api/auth/dev-session`** — dev-only роут создания сессии без OIDC-редиректа
  (`createDevSessionRoute`, `@letar/auth/server`) для e2e-тестов на staging, тот же
  паттерн, что у svoichuzhie/driving-school/grandslamcup. Готовит закрытие
  `safety-net.spec.ts` (пока не переписан, см. PLAN.md).

## [0.26.0] - 2026-07-28

### Added

- **Этап 5.10 часть A — машинный аудит всего банка вопросов.**
  `scripts/audit-question-bank.ts`: семь проверок по 2126 вопросам (дубли двумя
  сигналами — триграммный Жаккар + IDF-взвешенный containment по редким смысловым
  словам; пустой скоринг; расхождения дамп↔справочник; покрытие шкал и дефицит до
  порога high; асимметрия вариантов; полнота EN; reverse-баланс). Отчёты
  `docs/question-bank-audit.md` + `.json` перегенерируются запуском скрипта.
  Чистые функции вынесены в `scripts/audit-lib.ts` (+13 unit). Главные находки:
  №101–1665 (74% банка) не переведены на EN; 342 пары дублей на решение части B;
  новых расхождений со справочником нет.

---

Продолжение в ./CHANGELOG_2026_07_28.md
