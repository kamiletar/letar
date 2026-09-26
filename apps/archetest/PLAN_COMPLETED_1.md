# Выполненные задачи: Archetest — часть 1 (2026-09-26 … 2026-07-29, v0.34.1 → v0.27.0)

> Точка входа и карта частей — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md). Здесь: выпуск пула в прод, пул открытых задач (v0.28.4 → v0.34.0), аудит дизайна и хвосты (v0.28.x), фиксы и техдолг 2026-08…09 (v0.27.x).

## Выпуск пула в прод: деплой 0.34.1 и `--sync-texts` (2026-09-26)

Локальная сессия после облачного пула: предрелизные проверки, деплой, ручной синк EN-текстов.

- **Проверки в основном чекауте:** `typecheck:tsgo` зелёный (4 ошибки `libs/auth` из облака не воспроизводятся — там
  ставили без `--frozen-lockfile`), `test` 348/348, `lint` 0 ошибок, `build` (webpack + Serwist) зелёный.
- **Деплой** через `deploy-agent-dev` (тред `deploy-archetest`): letar `2b8fd2520`, staging + полный e2e, обе миграции
  волны 7 применены с pre-migrate dump, app-14 → app-15 без простоя.
- **`--sync-texts` на проде** — штатный `deploy_app` умеет только append-only сид, поэтому синк выполнен вручную с s2 из
  серверного чекаута: dry-run (1565 / 561 / 0 отказов) → дамп `archetest-pre-synctexts-20260926-222105.sql.gz` → запись →
  повторный dry-run (0 к обновлению). `DATABASE_URL` берётся из `docker exec archetest-app-15 printenv DATABASE_URL`,
  хост заменяется на `127.0.0.1:5441` (порт БД опубликован на хосте). Приложение вопросы не кэширует — рестарт не нужен.
- **Решение по номеру РКН:** остаётся в `privacy/page.tsx`, из слайда `/dev/presentation` убран; исключение
  записано в `.claude/rules/public-repo-hygiene.md`.
- **Учёт времени пула** (24–26.09) внесён двумя черновиками — см. открытый вопрос в `PLAN.md`.

## Пул открытых задач в одном потоке (v0.28.4 → v0.34.0, 2026-09-24…26)

Облачная сессия, ветка `claude/clever-maxwell-9cngns`, один push в конце. Детали каждой задачи — в пунктах
`PLAN.md` с датой и версией; здесь — сводка.

- **Волна 0–1:** фестивальный спринт снят; `--sync-texts` (+ `--dry-run`) в `seed-questions.ts` на чистой
  `sync-texts-lib.ts` (отказ при изменённых баллах/порядке вариантов); валидатор EN-полей; стайлгайд EN.
- **Волна 2:** пять пакетов ревьюеру (СДВГ, HH, привязанность, редкие шкалы, часть B аудита) — в банк не влиты.
- **Волна 3:** авторский EN-банк №101–1665 (1565 вопросов), партиями; `QUESTION_BANK_VERSION` не менялся.
- **Волна 4:** презентация → brand, клавиатура радара (+тест), `theme:check` в `lint`.
- **Волна 5:** все UI-строки `isRu ? … : …` → `messages`, пропы `isRu` удалены из 8 компонентов.
- **Волна 6:** тесты stratified-shuffle, достижений, server actions, E2E кабинета — 4 бага (короткие порции
  выборки, экспериментальные шкалы в достижениях, падение настроек после привязки, падение списка после отзыва)
  - публичный эндпоинт лидерборда закрыт. Паттерн чтения людей raw-клиентом узким select —
    `.claude/docs/zenstack-required-relation-nested-select-null.md`.
- **Волна 7:** динамика тёмного ядра по пересчёту сессий (график раньше рисовал сырые баллы), карта стабильности,
  фильтр клиентов в URL, «N новых сессий» (миграция), сообщения клиентам (миграция), «Сохранить в PDF»
  (паттерн — `.claude/docs/print-to-pdf-dark-theme-pattern.md`). Попутно: локаль `FormI18nProvider`, переполнение
  на 390px в фильтре и в настройках.
- Итог: 333 unit-теста, E2E кабинета зелёный локально против `next dev`. Не сделано из-за среды: деплой-заявка,
  учёт времени (см. открытые вопросы в `PLAN.md`).

## Хвосты аудита дизайна (v0.28.3, 2026-09-24)

- [x] `themeColor` — пара значений по `prefers-color-scheme` (`#FAFAFA` / `#18181B`); проверено
      по `<meta name="theme-color">` в живой странице.
- [x] `achievement-card.tsx` — явный `transitionProperty` вместо `all`.
- [x] Гексаграмма — компактная раскладка колец и подписей; на 375px подписи вершин целы
      (`/dev/presentation`), `viewBox` 500×432.
- Радар с клавиатуры не реализован отдельно: `accessibilityLayer` у `RadarChart` в recharts 3.10.1
  включён по умолчанию; вживую не проверено (нужна сессия с результатами).

## Перенос UI-строк quiz-results / quiz-intro в messages (v0.28.2, 2026-09-24)

- [x] `quiz-results.tsx` и `quiz-intro.tsx`: инлайн-тернарники `isRu ? … : …` заменены на
      `t()` с ключами `quiz.results.*`, `quiz.intro.*`, `quiz.coverage.completed`. Числа —
      ICU-параметры, тексты дословно прежние. `getWarnings` возвращает ключи, а не строки.
- [x] `quiz-results.spec.tsx` (5 тестов): прогресс, кнопки, дисклеймер, предупреждения BAR
      (пользователь/психолог), низкая достоверность — RU и EN.
- Живая проверка: интро RU/EN (Playwright + dev-сессия). Результаты вживую не прогоняли — dev-сервер
  отвечает ~4 с на ответ, 50 вопросов не добежали; покрыто spec-тестом.
- Остаток (175 вхождений в 27 файлах) — `PLAN.md`, «Технический долг».

## Общий переключатель темы (v0.28.1, 2026-09-24)

Локальная копия `ThemeModeSelect` в мобильном меню заменена общим `ColorModeSelect` из
`@letar/chakra-provider` 0.4.0: новые пропсы `labels` (подписи из next-intl, `system` — «Авто»)
и `fullWidth`. Поведение прежнее. Проверено вживую на 390px: RU «Светлая / Авто / Тёмная»,
EN «Light / Auto / Dark», переключение меняет класс `<html>` и `localStorage`.

## Аудит дизайна: темы, мобильное меню, диаграммы (v0.28.0, 2026-09-24)

Запрос Kami со скриншотами телефона (Brave, Android): «светлая и тёмная темы не различаются»,
вид открытого меню, каша подписей на радаре, общий аудит дизайна. Всё проверено вживую —
локальный `next dev` + Postgres, Playwright на 390px и 1366px в обеих темах, dev-сессия с тремя
пройденными порциями квиза.

**Темы.** Код тем исправен — в чистом Chromium переключались. Причина жалобы воспроизведена
флагом `WebContentsForceDark`: авто-затемнение браузера перекрашивает страницу, объявившую
`color-scheme: light` (инлайн от next-themes). Фикс — `color-scheme: only light` для
`html.light`; сперва app-level, затем перенесён в `ColorModeProvider` (`@letar/chakra-provider` 0.5.0,
для всех приложений), в archetest дубль убран. Вторая половина
жалобы — кнопка высокого контраста ◐ на месте переключателя темы в мобильной шапке: заменена на
☀/☾, контраст уехал в меню подписанным свитчем. `useHighContrast` переведён на
`useSyncExternalStore` — переключатели в шапке и меню больше не расходятся.

**Мобильное меню.** Без `Portal` + `DrawerPositioner` панель рендерилась внутри шапки (шапка
раздувалась, панель не на всю высоту). Переписано: иконки, `aria-current` текущего раздела,
зоны нажатия 48px, выбор темы из трёх подписанных режимов (Светлая / Авто / Тёмная,
`SegmentGroup`), свитч контраста, «Настройки cookie» (событие `createConsentConfig`). Десктопная
навигация тоже подсвечивает текущий раздел; `as=` в шапке заменены на `asChild`.

**Диаграммы.** Радар: на осях коды шкал, полное название — тултип recharts (кастомный, в
токенах темы) и `<title>`; под диаграммой раскрывающаяся «Расшифровка сокращений» с баллами
(и ⌀ усреднённого слоя). Жирным — ≥ 40%, бледным — мало ответов. Две попутные находки:
SVG-атрибуты `font-weight`/`fill` перебиваются CSS (атрибут 700 → вычисленные 400), поэтому
стили подписей — в `style`; массив точек мемоизирован, иначе recharts перезапускал анимацию
построения на каждый ре-рендер (раскрытие расшифровки схлопывало диаграмму в точку).
Гексаграмма: коды на вершинах (ANT → PSY через новый `getScaleDisplayCode`), легенда по триадам,
кегль подписи считается от реальной ширины SVG (`ResizeObserver`) — ~13px вместо ~7px.

**Контраст и акцент.** Тёмная шкала поверхностей на шаг темнее (`bg.subtle` gray.800),
`fg.subtle` gray.400 — «Ловушка» в карточке черты 2.2:1 → 5.8:1. `blue` (3.7:1 на белом)
заменён на `brand` в CTA/прогрессе/ссылках; смысловые блоки карточки черты — `success/warning/
info.fg`.

**Мобильные переполнения.** Кнопки липкой панели интро (`flex: 1` вместо `w=100%`), просвет
32px справа у липких панелей (`STICKY_BAR_BLEED` компенсирует ширину при `mx={-4}`), таблицы
`/for-professionals` в `Table.ScrollArea`. Проверка: `scrollWidth` = 390 на `/`, `/express`,
`/for-professionals`.

**Попутно по запросу Kami:** кнопки свёрнутого `CookieBanner` (`@letar/ui` 0.22.3) прижаты
вправо на телефоне — меняет все приложения с баннером.

Прогоны: lint 0 ошибок, 205/205 unit (+3 на `getScaleDisplayCode`), 11/11 спек
`CookieBanner`. `tsgo` — 4 ошибки только в `libs/auth/src/server/create-auth` (не тронут; среда
ставила зависимости без lock-файла — `cdn.sheetjs.com` закрыт сетевой политикой). Форматирование —
dprint с теми же версиями плагинов из npm (`plugins.dprint.dev` закрыт; `nx format` при этом
рапортовал успех, ничего не сделав). Два новых дока:
[browser-auto-dark-light-theme-override](/.claude/docs/browser-auto-dark-light-theme-override.md),
[chakra-drawer-missing-positioner-inline-render](/.claude/docs/chakra-drawer-missing-positioner-inline-render.md).
Смёржено в `main` fast-forward (`b6e816f`). Деплой не запрошен — Agent Mail в сессии был недоступен.

## Дедупликация ожидания перехода квиза в e2e — `waitForQuizStepOrResults` (2026-09-05)

Точечная делегированная задача (не из PLAN.md): в `express.spec.ts` (`answerAllQuestions`) и
`safety-net.spec.ts` дословно дублировался паттерн ожидания перехода квиза (`Promise.race` между
следующим вопросом и заголовком результатов, затем `isVisible()`; см. запись про фикс флейков
WebKit ниже — сам паттерн появился там). Вынесен общий хелпер
`waitForQuizStepOrResults(optionLocator, resultsHeadingLocator, timeout)` в
`apps/archetest-e2e/src/quiz-flow.ts` — возвращает `true`, если результаты уже видны. Оба спека
переведены на хелпер, логика не менялась.

Полный e2e-прогон в рабочей среде сессии был недоступен (нет сети до `auth.letar.best` для
OIDC-дискавери на старте dev-сервера) — запрошен прогон у deploy-agent-dev (тред `797`), деплоить
приложение не требовалось. Результат на staging (коммит `c494d4fa`): **21/21 passed, 0 unexpected,
0 flaky** на chromium/firefox/webkit — рефакторинг поведение не изменил. `nx lint archetest-e2e` —
зелёный.

## Фикс флейков WebKit e2e + hard e2e-gate снова пройден живым деплоем (2026-09-05)

Продолжение диагностики из предыдущих раундов (см. запись 2026-07-29 ниже) — деплой archetest
был поставлен на паузу deploy-agent-dev (hard e2e-gate) из-за 3/18 unexpected failures на
staging WebKit. Два независимых бага в `apps/archetest-e2e/src/`, три раунда диагностики через
Agent Mail (тред `797`):

1. **`express.spec.ts`** — `answerAllQuestions` проверял переход на экран результатов
   последовательно (сначала `resultsTitle.isVisible()` в начале итерации, потом отдельный
   блокирующий `waitFor` на следующий вопрос) — на медленном staging WebKit тест падал по
   `Test timeout of 30000ms exceeded`, хотя квиз работал штатно. Фикс — `Promise.race` между
   новым вопросом и заголовком результатов (паттерн уже был в `safety-net.spec.ts`) +
   `test.setTimeout(90_000)`. Коммит `6c36a0ea`.
2. **`safety-net.spec.ts:167`** — после фикса №1 стал падать на ВСЕХ трёх браузерах сразу на
   финальном ассерте про кризисный safety-net блок (не таймаут). Первая гипотеза (WebKit
   рассинхрон текста «лучшего» варианта ответа с дампом вопросов) оказалась неверной — добавленная
   explicit-проверка совпадения текста подтвердила: текст совпадает на всех браузерах. Настоящая
   причина нашлась у deploy-agent-dev: `e2e-safety-net@archetest.test` — персистентный
   staging-пользователь, `getRandomQuestionsAction` исключает уже отвеченные вопросы навсегда
   (`excludeIds`). DPR/BAR/BOR — маленькие шкалы (43/17/53 из 2126 вопросов); после многих
   диагностических прогонов в этом же треде все три корзины для этого пользователя опустели
   одновременно → сессия получала 0 вопросов по триггерным шкалам → `normalized = 0` → safety-net
   не мог сработать ни при каком выборе ответов. Фикс — сброс прогресса пользователя перед стартом
   теста через существующую продовую self-service фичу 152-ФЗ (`deleteMyQuizDataAction`,
   `/settings`) вместо заведения нового тестового пользователя (осознанно отвергнуто ещё
   2026-07-29). Коммит `69bf1ac7`.

**Итог:** staging e2e — 21/21 (0 unexpected, 0 flaky) на chromium/firefox/webkit,
`deploy_app(archetest, production)` на `69bf1ac7` успешен (deployId `8f35f5dc`, zero-downtime,
smoke-test пройден). Оба фикса не воспроизводились локально ни разу — обнаружены и
подтверждены только прогоном против реального staging.

## Дедупликация `window.location.origin` через `useClientOrigin` (2026-09-03)

Репо-широкий греп после фикса hydration mismatch в `grandslamcup` (React error 418 —
`typeof window !== 'undefined' ? window.location.origin : ''` в теле рендера, вынесено в общий
хук `useClientOrigin()` из `@letar/hooks`) нашёл ещё две копии того же паттерна в archetest.
Здесь hydration mismatch не было (origin уже вычислялся в `useEffect`, не в рендере) — только
дублирование кода, который теперь есть в общем хуке.

**Фикс:**

- `src/app/[locale]/dev/qr/page.tsx` — `useState('')`+`useEffect(() => setOrigin(...))` заменены
  на `const origin = useClientOrigin()`.
- `src/app/[locale]/_components/express-results.tsx` — тот же паттерн, но origin был частью
  собранной строки (`fullTestUrl`). Оставлен только `useClientOrigin()`, `fullTestUrl` теперь
  простое производное значение (`origin ? \` ${origin}/${locale}\` : ''`) без отдельного
  состояния/эффекта.

`@letar/hooks` уже был в `implicitDependencies` `package.json` (использовался в
`hexagram-chart.tsx`) — довешивать зависимость не пришлось. `typecheck:tsgo`/`lint` зелёные.
Коммит `629f794f`.

## Фикс снятия регистрации Service Worker — переход на общий `useOfflineServiceWorker` (2026-09-03)

Локальный `_components/service-worker-registration.tsx` снимал регистрацию SW по
`registrationsRef.current` — снапшоту, заполняемому только собственным вызовом `register()` в
текущем маунте компонента. Воркер, зарегистрированный в прошлой сессии браузера (или до появления
консент-гейта), в этот ref не попадал — отзыв согласия на `/express` физически ничего не снимал.
Тот же баг жил в четырёх копиях компонента по монорепо (studio, grandslamcup, mandala, archetest),
ради дедупликации которых и был вынесен общий `useOfflineServiceWorker` в `libs/hooks` — там
снятие идёт через `navigator.serviceWorker.getRegistrations()`, не зависящий от локального
состояния конкретного маунта.

Archetest — последний из четырёх, где баг оставался открытым. Особенность именно этого приложения:
регистрирует SW сразу на два scope (`/express`, `/en/express`), не на `/` — хук уже поддерживал
множественные scope параметром `scopes`, менять его не пришлось.

**Фикс:** `apps/archetest/src/app/[locale]/express/page.tsx` — импорт `ServiceWorkerRegistration`
переведён с локального компонента на `@letar/ui`, с явными `consentKey="archetest-offline-consent"`
и `scopes={['/express', '/en/express']}`. Локальный
`_components/service-worker-registration.tsx` удалён.

**Проверка на прод-сборке** (`next build --webpack`, `next start`; Turbopack отдаёт протухший
`sw.js`, см. `serwist-turbopack-stale-sw-artifact.md`): согласие → регистрация на обоих scope
подтверждена (`getRegistrations()` → 2 записи). Сценарий бага воспроизведён и закрыт — консент
выставлен в `declined` до маунта компонента (имитация SW, зарегистрированного в прошлой сессии,
без записи в текущем ref), при заходе на `/express` `getRegistrations()` и `caches.keys()` дают
пустой массив: обе регистрации сняты, кеш очищен.

## Разблокирован деплой issuer-backfill: OfflineConsentBanner перехватывал клик у StickyActionBar (2026-09-02)

Прод-алерт `account-issuer-null-check` (dashboard-agent) показал 2 записи `Account.issuer IS
NULL` на archetest — миграция `20260827030000_backfill_account_issuer` была закоммичена ещё
25–27.08, но так и не доехала до прода: e2e-гейт архетеста падал на `express.spec.ts` в
firefox/webkit целую неделю (три отдельных прогона `deploy-agent-dev`, 27.08/28.08/01.09, один
и тот же паттерн — `subtree intercepts pointer events`).

Первый разбор (2026-08-27, `sticky-actionbar-cookiebanner-zindex-race.md`) диагностировал баг
как `CookieBanner` (`zIndex: 1000`) поверх `StickyActionBar` (тогда `zIndex: "docked"` = 10) и
пофиксил `StickyActionBar` на `zIndex: "sticky"` (1100, коммит `33feb329`) — но падение
повторилось теми же двумя тестами на обоих последующих прогонах уже с этим фиксом. Trace от
`deploy-agent-dev` (запрошен точечно 2026-09-01) показал: перехватывает не `CookieBanner`, а
**`OfflineConsentBanner`** (`libs/ui`) — компонент, добавленный уже после исходного фикса,
`zIndex: "banner"` = 1200 (выше `StickyActionBar`), появляется через `delayMs=2000` на `/express`
и физически накладывается на чекбокс согласия на короткой intro-странице без скролла.

**Фикс (`libs/ui`, коммиты `30189888` доки + `d3c3c959` код):** `OfflineConsentBanner` теперь
публикует свою высоту в `--letar-offline-consent-banner-height` (`usePublishedHeight`, тот же
хук, что у `CookieBanner`), `StickyActionBar` складывает её с `--letar-cookie-banner-height` в
своём `bottom` — раздвигает компоненты позиционно, а не полагается на приоритет `zIndex`, что и
устраняет перехват независимо от того, какой компонент чем перекрывается в будущем.

Побочно: `git push` letar был заблокирован pre-push-хуком — `domwellbes` (1→2 коммита за время
разбора) и `studio` (4 коммита) отставали от своих origin, не связано с этой задачей, но держало
push letar целиком. Оба submodule запушены отдельно, `check-submodule-push-state.sh` подтвердил
14/14 синхронно перед push letar.

**Итог:** staging e2e 21/21 (было 17/21), прод-раскатка на s2 успешна, миграция применена — оба
пользователя с `issuer IS NULL` разблокированы. `nx typecheck:tsgo ui`, `nx lint ui`,
`nx typecheck:tsgo archetest` — зелёные. Разбор дополнен в
`.claude/docs/sticky-actionbar-cookiebanner-zindex-race.md` и
`.claude/docs/ui-components.md` § «Координация bottom-anchored компонентов» (корень монорепо).

> **Версия:** 0.27.13 | **Обновлено:** 2026-09-02

---

## Фикс prismaAdapter/ZenStack в better-auth (2026-08-31)

Живой прогон (`nx dev archetest` + `fetch` на `/api/auth/sign-up|sign-in/email`) подтвердил баг:
`prismaAdapter()` получал `prisma` из `lib/prisma.ts`, который был просто ре-экспортом
ZenStack `orm` из `db.ts` — пустой `500` без единой строки в логах на каждом запросе, тот же
паттерн, что валил пять других приложений монорепо (mandala/domwellbes/svoichuzhie/dsperevod/
studio).

Фикс — отдельный нативный `PrismaClient` через `createLazyPrismaAuthClient` (`@letar/auth/server`)
в `lib/prisma.ts`, `auth.ts` переключён на него. Заодно `src/app/api/consent/route.ts` переведён
на `getEnhancedPrisma` — брал тот же сломанный ре-экспорт. `db.ts`/`orm` не тронуты, используются
в других местах приложения без изменений.

Ретест после фикса: `sign-up`/`sign-in` дают структурированный `400 EMAIL_PASSWORD_*_DISABLED`
(email/password штатно выключен в конфиге) вместо пустого 500; с временно включённым
`emailAndPassword.enabled` (только для верификации, не закоммичено) — `200`, реальный `User`
создан и вход прошёл. `nx typecheck:tsgo archetest` и `nx lint archetest` — зелёные.

Коммит `ff5af4a1` (в основном репозитории letar — `archetest` не submodule). Разбор — обновлён
`.claude/docs/better-auth-prismaadapter-zenstack-incompatibility.md` в корне монорепо.

> **Версия:** 0.27.12 | **Обновлено:** 2026-08-31

---

## Touch target для текстовых ссылок — WCAG 2.5.5 (2026-08-25)

Ссылка «← Назад на главную» (`for-professionals/page.tsx`) переведена на `TouchLink` (`@letar/ui`).
Инлайновые ссылки внутри предложений (текст-в-потоке) и ссылки с `target="_blank"` не трогались —
на них не распространяется требование 44px (исключение WCAG 2.5.5 «inline»).

> **Версия:** 0.27.4 | **Обновлено:** 2026-08-13
>
> **Основной план:** [PLAN.md](./PLAN.md)

---

## Фикс: config.matcher в proxy.ts обязан быть литералом, не вызовом buildIntlMatcher() (2026-08-21)

Репо-широкий баг из apps/kami (§18.7 M2): Next.js 16 статически парсит `config.matcher` через AST
на build-time без исполнения модуля — `CallExpression` не поддерживается, `next build` падал с
`Invalid segment configuration export detected`, хотя typecheck/lint проходили чисто. Matcher
инлайнен литералом `['/((?!api|_next|_vercel|icon|apple-icon|.*\\..*).*)', '/']`, `proxy.spec.ts`
дополнен regression-тестом (текстовый разбор файла, сверка с `buildIntlMatcher(опции)`). commit
`349dc5a5`.

## Matcher next-intl через @letar/i18n-proxy — исправлен ещё один пропущенный icon.svg (2026-08-21)

Паттерн из записи ниже вынесен в общую `libs/i18n-proxy` (`@letar/i18n-proxy`,
`buildIntlMatcher()`/`findUndeclaredMetadataRoutes()`) — используется всеми 7 приложениями с
next-intl. При переносе archetest на хелпер `findUndeclaredMetadataRoutes` нашла **второй**
пропущенный роут в самом archetest: `src/app/icon.svg` тоже отдаётся на `/icon` без расширения
(тот же класс бага, что apple-icon.tsx ниже) — предыдущий фикс перечислял только `apple-icon`,
`icon` остался незамеченным. Добавлен в matcher и в `proxy.spec.ts`.

**Уточнение по остальным приложениям:** «`time`/`mandala`/`kami`/`aira-web`/`aboo` — баг не
подтвердился» ниже — верно только для `mandala`/`aira-web`. Повторный аудит через
`findUndeclaredMetadataRoutes` нашёл и исправил тот же пропущенный `icon.svg` в `time`/`kami` и
пропущенные `icon.png`/`apple-icon.png` в `aboi` — см. их `PLAN_COMPLETED.md`.

## Фикс matcher proxy.ts — apple-icon без точки в URL (2026-08-21)

Продолжение аудита next-intl matcher, найденного в apps/studio (публичное исключение `public/`
никогда не матчилось + metadata-роуты без расширения). Проверены все 7 приложений с next-intl в
proxy.ts: только archetest воспроизвёл баг. `src/app/apple-icon.tsx` лежит вне `[locale]`, отдаёт
`/apple-icon` без точки в пути — dot-wildcard-исключение `.*\\..*` его не ловит, next-intl
middleware переписывал в `/ru/apple-icon` (`x-middleware-rewrite`, подтверждено локальным
`fetch(..., {redirect: 'manual'})`), которого не существует → 404. Фикс — добавлено явное
исключение `apple-icon` в matcher (по образцу studio). Проверено: `/apple-icon` → 200 без
`x-middleware-rewrite`, обычная locale-роутизация (`/` → rewrite `/ru`) не сломана.
`time`/`mandala`/`kami`/`aira-web`/`aboi` — баг не подтвердился (см. их PLAN_COMPLETED.md).

## Аудит дублей по монорепо: `prefersReducedMotion` из `@letar/hooks` (2026-08-20)

`globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches` в `useAnimatedScores`
(`hexagram-chart.tsx`) заменён на `prefersReducedMotion()` из `@letar/hooks` — тот же вызов
внутри того же `useEffect`, менялся только источник чтения matchMedia. `@letar/hooks` добавлен
в `implicitDependencies`. v0.27.6.

## Проверка setRequestLocale/SSG (2026-08-19)

Аудит по классу бага, найденному в apps/studio. В archetest все страницы, которым нужен
`setRequestLocale`, уже вызывают его явно (`/`, `/express`, `/privacy`, `/for-professionals`,
`/dev/*` — все `●`). `/[locale]` и `/express` остаются `ƒ` заслуженно — обе вызывают
`getSession()`. Изменений не потребовалось.

## Гидратационный мисматч в `QuizIntro` — согласие с дисклеймером (v0.27.4, 2026-08-13)

Найдено попутным аудитом при исследовании best practices для form-docs P7 (устойчивый
задокументированный вовне класс бага: docusaurus#5653, Nuxt UI `FrameworkTabs.vue`, TanStack
`usePersistedEnumStore.ts`). `disclaimerAccepted` читал `localStorage.getItem(DISCLAIMER_CONSENT_KEY)`
прямо в инициализаторе `useState` — на клиенте это происходит уже на первом (гидратирующем)
рендере, а сервер рендерит дефолт из БД (`initialDisclaimerAccepted`). Расхождение без
предупреждения в консоли: React может «поженить» DOM с чужим значением, и клик по чекбоксу/кнопке
«Начать тест» перестаёт совпадать с видимым состоянием. Фикс: дефолт `useState` теперь
`Boolean(initialDisclaimerAccepted)` на сервере и первом клиентском рендере одинаково, сохранённое
в `localStorage` согласие подтягивается отдельным `useEffect`. Новый паттерн-документ —
`.claude/docs/ssr-hydration-persisted-state.md`.

## `ShareResultButton` переведён на общий `useShare` (v0.27.3, 2026-08-12)

Тот же паттерн `navigator.share` + fallback-копирование, что уже был здесь и независимо
продублирован в `aprel8008/ShareComic` (расхождение — там отсутствовал `catch` на `AbortError`,
необработанный reject при отмене диалога пользователем), вынесен в `useShare` (`@letar/ui`).
`handleShare` теперь получает исход (`shared`/`copied`/`aborted`) от хука и показывает тост
только при фактическом fallback-копировании — видимое поведение не изменилось.

## `ShareResultButton` — фолбэк-копирование на общий `@letar/ui` (v0.27.2, 2026-08-12)

Кросс-приложенческая сессия (инициатор — domwellbes, аудит дублей копирования в буфер).
Заменена только внутренняя реализация `navigator.clipboard.writeText` в фолбэк-ветке
(когда `navigator.share` недоступен) на `copy()` из хука `useCopyToClipboard` (`@letar/ui`) —
поведение (toast `t('copied')`/`t('error')`) не изменилось, компонент получил бесплатный
fallback на `execCommand('copy')` для случаев, когда сам Clipboard API падает.

## Убраны references на libs из tsconfig.json — хрупкий TS6305 редирект (v0.27.1, 2026-08-07)

**Проблема:** `references` на `libs/consent`, `libs/auth`, `libs/forms`, `libs/analytics`,
`libs/chakra-provider`, `libs/hooks`, `libs/ui` в `apps/archetest/tsconfig.json` вели на
solution-конфиг каждой библиотеки — TypeScript брал последний подпроект из его собственного
`references` (`tsconfig.lib.json`/`tsconfig.spec.json`) как цель редиректа. У части библиотек
последним оказывался `tsconfig.spec.json`, чей output (`out-tsc/spec/`) не собирается ни одним
Nx-таргетом → вечный `TS6305` + каскад `TS7006`/`TS2305` (модуль библиотеки становится `any`).
Образец фикса — `dashboard-agent` (0.11.1, коммит `885ceaf2`), подробности механики —
`.claude/rules/libs.md`.

**Решение:** удалены все элементы `references`, ссылающиеся на `libs/*` (оставлен только
`./tsconfig.spec.json`). Т.к. приложение расширяет общий пресет `tsconfig.next-app.json`
(`outDir` задан, `rootDir` не задан явно), после удаления `references` TypeScript начал
инферить `rootDir` слишком узко (только `apps/archetest`) и падать с `TS6059` на любом импорте
из `libs/*`. В отличие от `dashboard-agent` (собственный tsconfig без `extends`, там `rootDir`
просто убирался), здесь `outDir` из пресета убрать локально нельзя — фикс через явный override
`"rootDir": "../.."` в `apps/archetest/tsconfig.json`, расширяющий допустимый корень до
монорепо. `nx typecheck:tsgo archetest` и `nx build archetest` чисты (одна оставшаяся
`TS7006` в `professional-lead-form.tsx:37` — не новая, была и до правки).

---

## UX чекбокса согласия — вынесен в липкую панель (v0.27.0, 2026-07-29)

**Проблема:** чекбокс «Подтверждаю ознакомление и согласие…» был последним элементом
4-абзацного дисклеймера в конце прокручиваемого текста интро (полный квиз и
экспресс) — пользователь должен был долистать до самого низа, чтобы его увидеть и
разблокировать CTA. Замечание Kami (2026-07-29): «Чекбокс за пределами экрана и
непонятно, что нужно делать». Прямой баг перекрытия sticky-панелью уже был закрыт
ранее (`--letar-sticky-actionbar-height`), но сама UX-проблема была шире бага —
занесена в техдолг PLAN.md тем же днём и закрыта в этой же сессии.

**Решение:**

- Полный текст дисклеймера ужат на экране интро до одной строки-сводки
  (`DISCLAIMER_SUMMARY_RU`/`EN`) + ссылка «Подробнее» — открывает `Dialog.Root` с
  полным текстом. Юридически ничего не потеряно, полный текст доступен всегда.
- Чекбокс переехал из конца прокручиваемого контента в `StickyActionBar` рядом с
  CTA-кнопкой — по образцу `CookieBanner`, где согласие и кнопки живут в одном
  зафиксированном блоке. Чекбокс и кнопка теперь физически неразделимы на экране:
  весь класс багов «sticky-панель перекрывает свой же гейтящий чекбокс» (три
  предыдущих раунда диагностики e2e-гонок в сессии hard e2e-gate, см. запись выше
  по дате) стал структурно невозможен, а не просто исправлен точечно.
- `useScrollGate`/sentinel убраны из `quiz-intro.tsx` и `express-container.tsx` —
  гейт форсировал полную прокрутку именно ради видимости чекбокса; после переноса
  в sticky-панель смысла в принудительном скролле не осталось.
- `size="lg"` на `Checkbox.Root` — увеличенный тач-таргет (WCAG 2.5.5), частично
  закрывает соседний пункт того же техдолга про минимальный размер тач-цели.
- Компонент `disclaimer-consent.tsx` разделён на два экспорта:
  `DisclaimerSummary` (сводка + диалог, без состояния согласия) и
  `DisclaimerConsentCheckbox` (сам чекбокс, `data-testid="disclaimer-consent-checkbox"`
  сохранён — e2e-локаторы (`express.spec.ts`/`kiosk.spec.ts`/`mood-check-in.spec.ts`/
  `safety-net.spec.ts`) не потребовали изменений).

**Проверено:** живьём в браузере (mobile 375px, desktop 1280px) — чекбокс и кнопка
всегда в одном вьюпорте без скролла, клик по чекбоксу мгновенно снимает `disabled`
с CTA; диалог «Подробнее» открывается и показывает полный текст. `nx test`/
`typecheck:tsgo`/`lint archetest` — зелёные. e2e на chromium: `express.spec.ts` +
`kiosk.spec.ts` 4/4, `mood-check-in.spec.ts` 2/2. `safety-net.spec.ts` падает по
независимой причине (`DEV_SESSION_TOKEN` не задан в локальном dev-окружении —
задокументированное предсуществующее ограничение, не регрессия этой сессии).

Не задеплоено в прод в рамках сессии — по правилам деплой только через BlackCove
(Agent Mail), запрос не отправлялся (пользователь не просил).

---
