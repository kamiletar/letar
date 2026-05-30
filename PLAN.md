# PLAN — Глобальная унификация авторизации и верификации в монорепо

> **Статус:** ✅ план утверждён, реализация идёт. **Сделано:** Этап 1 + код-часть Этапа 0 (сессия №1, см. ниже).
> **➡️ Следующий старт:** Фаза A — инцидент-реагирование. Самое срочное — **Этап 0.1 🔴 (ротация утёкших OIDC-секретов
> в `auth-hub/auth.ts:193-292`, активная утечка в публичном репо)**, затем 0.2 (Maddy/fail2ban), DKIM/SPF/DMARC (0.7 canary).
> Требует доступа к s2/mail (§14.3) + deploy-координации. Этап 0.5 (Nx owner-теги) — отдельная механическая сессия.
> **Режим:** реализация поэтапная (§7); все точки решения закрыты или отложены с обоснованием (§9).
> **Дата ревизии:** 2026-05-30 (архитектурная проработка с UI/UX-архитектором, все §13 вопросы закрыты).
> **Операционная сессия 2026-05-30:** разовая склейка email владельца в Ключнице **ВЫПОЛНЕНА** (§14.1);
> добавлен Telegram-вход (Этап 6.6); выявлены инфра-задачи — брутфорс Maddy, форвард, MCP kami (§14).
> **Финализация:** добавлен периодический canary-мониторинг доставки email (Этап 0.7) — план полный.
> **Ревизия №2 (2026-05-30, инцидент-реагирование):** инфра-задачи §14.2 подняты в roadmap (Этап 0.1 ротация
> утёкших OIDC-секретов 🔴, Этап 0.2 защита почты + DKIM/SPF/DMARC); добавлены критический путь и фазы (§6),
> DoD по этапам, ремедиация застрявших юзеров (Этап 2), заметки про rate-limit store / SSE-масштабирование (§8).
> **Сессия реализации №1 (2026-05-30, только код в публичном дереве):** ✅ Этап 1 (security-hardening
> `@letar/pin-auth` + `@letar/auth`) и ✅ код-часть Этапа 0 (централизованный лог `@letar/email` + фикс
> игнорируемого результата в mandala). Этап 0.5 (Nx owner-теги) и инфра-часть (0.1/0.2/DKIM/canary) — следующие сессии.

## Как читать документ

1. §1 Видение. 2. §2 Модель владения и соц-секреты ⭐ (новое). 3. §3 Состояние (факты).
2. §4 Целевая архитектура. 5. §5 Карта auth. 6. §6 Критический путь, фазы и DoD. 7. §7 Этапы.
3. §8 Сквозные требования. 9. §9 Точки решения (развилки). 10. §10 Риски. 11. §11 Документация. 12. §12 Агенты.

---

## 1. Видение и цель

Единая переиспользуемая система авторизации и email-верификации для всего монорепо, на библиотеках,
с сохранением лучших наработок (эталон — `driving-school`) и без дублирования:

- **`@letar/auth`** — сессии, клиент (Better Auth), OAuth-кнопки, guards. Поддерживает **оба режима**:
  клиент Ключницы и standalone со своими секретами (конфигом, не хардкодом).
- **`@letar/pin-auth`** — верификация email: **коды + ссылки в одном письме**, **синхронизация вкладок**
  (SSE), **resend с cooldown**, авто-логин. Уже существует и зрелая.
- **`@letar/email`** — отправка через Maddy; `SendEmailResult` для логирования SMTP-ошибок.
- **Ключница (`auth-hub`)** — централизованный **OIDC-провайдер** для пет-проектов одного владельца.

**Ключевой принцип — мульти-владельческая природа.** В монорепо вперемешку **коммерческие проекты разных
владельцев** и **личные пет-проекты**. Поэтому единой схемы auth быть не может: авторизация, секреты и
email-домен — **по владельцу проекта**; Ключница — дефолт только для петов, для коммерции **не обязательна**.

> **Первопричина инцидента:** неверный `SMTP_FROM_EMAIL` (письма молча не доходили) + тупик
> неверифицированного пользователя на `/sign-in` без resend. Resend лечит симптом, доставку чинит Этап 0.

---

## 2. Модель владения, auth-профили и соц-секреты ⭐

### 2.1 Классификация проектов

Признак коммерческого проекта: **приватный submodule** (`kamiletar/letar-private-*`) + **свой домен в `.env.docker`**.

- **Коммерческие (разные владельцы):** `premium-rosstil` (premium.rosstil.ru), `driving-school` (направа.рф),
  `aboi` (neyroaboi.ru), `dsperevod`, `imot` — все приватные submodules. Git-изоляция уже есть.
- **Личные петы (владелец — letar):** `kami`, `dashboard`, `auth-hub` (Ключница), `mandala`, `archetest`,
  `time`, `grandslamcup`, `animatrona-*` и пр. — публичное дерево `letar`, домены `*.letar.best`.

### 2.2 Auth-профили

| Профиль                                 | Кому                         | Соцлогин                    | Email/password       | Секреты       | Ключница             |
| --------------------------------------- | ---------------------------- | --------------------------- | -------------------- | ------------- | -------------------- |
| **letar-pet**                           | петы (`*.letar.best`)        | через Ключницу              | на Ключнице/локально | общие (letar) | да, клиент           |
| **standalone / commercial**             | коммерсы на своих доменах    | свои или наши (см. 2.3)     | локально             | владельца     | нет                  |
| **multi-tenant Ключница** (перспектива) | коммерс хочет SSO + изоляцию | свои, изоляция по владельцу | —                    | владельца     | да, CNAME + брендинг |

### 2.3 Соц-секреты: два уровня (выбор в админке) — РЕШЕНО

В админке коммерческого проекта владелец **сам выбирает** (informed consent):

|                         | **Tier 1 — «наши ключи»** (shared) | **Tier 2 — «свои ключи»** (BYO)                 |
| ----------------------- | ---------------------------------- | ----------------------------------------------- |
| Соцтокены               | общие letar, через Ключницу        | владелец вводит свои OAuth-приложения в админке |
| Морока настройки        | letar, **разово на всех**          | **владелец** (letar лишь хранит secret)         |
| Брендинг consent-экрана | letar / Ключница                   | владельца                                       |
| Владение, риск бана     | letar (общий риск)                 | владельца                                       |
| Когда                   | старт, MVP                         | дорос, хочет владеть/брендировать               |

- **Требование:** UI в админке — «ввести свои ключи» ИЛИ «использовать наши» с **явным показом рисков**.
- **Честное ограничение:** брендинг consent-экрана Google в Tier 1 не обходится (показывает владельца
  OAuth-приложения); кастомный домен Ключницы (CNAME) брендирует только URL. Бренд клиента → только Tier 2.
- **Хранение:** secret шифруется at-rest; для standalone — в secret-store/БД его проекта, не в общей.
- **Тех. риск:** Better Auth регистрирует провайдеров статически → динамика = ленивая init/пересоздание (проверить доки).

### 2.4 Email/password — локальный, но инфраструктура per-владелец

Не требует внешних секретов → почти всегда локальный. Но тянет за собой:

- **Домен писем** — верификация/сброс уходят с **домена клиента** (`SMTP_FROM` на его домене), иначе спам-флаги
  (прямая связка с первопричиной `SMTP_FROM_EMAIL`).
- **Изоляция пользователей** — БД/таблица юзеров клиента отдельно.
- **Ссылки/PIN** — ведут на домен клиента.

### 2.5 Структура монорепо

Изоляция уже обеспечена submodules. Для логического разделения — **Nx tags** (`owner:letar` / `owner:commercial`)

- module-boundaries (ESLint запретит кросс-импорты твоё↔клиентское). Физические папки (`apps/letar/…`) — дорого
  (ломает paths/CI/docker/`deploy-affected.sh`/submodules) и без выгоды сверх тегов; только при потребности в
  отдельных деплой-пайплайнах → `@nx/workspace:move`.

### 2.6 Правовая сторона (152-ФЗ, владение, согласия)

> Детали и шаблоны — `.claude/docs/personal-data.md` (152-ФЗ, РКН, cookie-согласия, чекбоксы ПДн).

- **Оператор vs обработчик ПДн.** Standalone-коммерс = **оператор** ПДн своих пользователей. Как только
  данные/соцлогин идут через Ключницу (Tier 1, multi-tenant) — letar становится **обработчиком** → нужен
  **договор поручения обработки** (ст. 6 152-ФЗ) между letar и владельцем проекта.
- **Согласия и политики per-домен.** Чекбоксы согласия на обработку ПДн при регистрации; Политика
  конфиденциальности и cookie-согласие (РКН) — на домене **каждого** проекта, от имени его оператора.
- **Локализация (ст. 18 152-ФЗ) ⛔ блокер, проверить РАНО.** ПДн граждан РФ — на серверах в РФ. Где хостятся
  Ключница и БД? Если вне РФ — влияет на архитектуру (перенос инфраструктуры) → решить ДО Этапов 6–8, а не в конце.
- **Tier 1 — владение OAuth.** Закрепить в оферте/ToS, что соц-вход обслуживается инфраструктурой letar
  (§2.3) — клиент принимает осознанно.
- **Account-merge (склейка email).** Объединение ПДн из разных аккаунтов — фиксировать основание и аудит;
  сохранять право на удаление/выгрузку. См. Этап 8.5.
- **Разные владельцы → разные операторы** → изоляция данных и раздельная ответственность обязательны.

---

## 3. Текущее состояние (проверено по коду)

### 3.1 Матрица приложений

| App                 | Владелец      | Auth-механизм                        | Верификация email                                   | Роли                | `admin/users`             | DB в admin          |
| ------------------- | ------------- | ------------------------------------ | --------------------------------------------------- | ------------------- | ------------------------- | ------------------- |
| **aboi**            | commercial    | Better Auth + `anonymous`            | link, `sendOnSignUp` (тупик `EMAIL_NOT_VERIFIED`)   | `roles: string[]`   | ❌ создать                | `prismaAuth`        |
| **kami**            | letar pet     | Better Auth + OIDC-клиент Ключницы   | link (`requireEmailVerification: true`)             | `roles: UserRole[]` | ❌ создать                | `prisma` (+обогащ.) |
| **dsperevod**       | commercial    | Better Auth standalone               | link (`requireEmailVerification: true`)             | `role` (single)     | ✅ есть (+статус+actions) | `getEnhancedPrisma` |
| **auth-hub**        | letar (инфра) | **Ключница — OIDC provider**         | link, **только в production**                       | `roles: UserRole[]` | ✅ есть (+статус)         | `prisma` (plain)    |
| **premium-rosstil** | commercial    | Better Auth standalone               | **кастомная**; `requireEmailVerification` не задан  | `role` (single)     | ✅ есть (без статуса)     | `getEnhancedPrisma` |
| **driving-school**  | commercial    | Better Auth + `organization` (teams) | **`@letar/pin-auth`: коды + ссылки + cross-tab** ⭐ | `roles: UserRole[]` | (своя)                    | `prismaAuth`        |
| **imot**            | commercial    | Better Auth standalone               | (вне активной auth-задачи)                          | —                   | —                         | —                   |
| **mandala**         | letar pet     | PIN                                  | PIN (`resend-pin.action`)                           | —                   | (своя)                    | —                   |

**OIDC-клиенты Ключницы** (`trustedClients`): kami, dashboard, archetest, time, grandslamcup, animatrona-tracker.

### 3.2 Состояние библиотек

- **`@letar/pin-auth`** — уже реализует всё ценное: `server` (`generatePin/generateToken`, `createPinValidator`
  с `maxAttempts`, `createTokenManager` с cooldown), `client` (`usePinVerification`, `useResendCountdown`,
  `useVerificationStream` — SSE cross-tab), `email` (`formatVerificationEmail` — PIN + ссылка), `schemas`.
  **БД-агностична** (адаптеры-callbacks); эталон-потребитель — `driving-school`.
  ⚠️ Спроектирована под `emailVerified: DateTime` + модель `verificationToken`; Better Auth — `Boolean` +
  таблица `verification`. Адаптеры разруливают, но это работа Этапа 1.
- **`@letar/auth/client`** — есть фабрики клиента, `OnlyFor`, `SessionProvider`, OAuth-кнопки, connected-accounts.
  **Хука/компонента resend НЕТ.**
- **`@letar/email`** — `sendVerificationEmail()` → `SendEmailResult`; сейчас результат в `auth.ts` **игнорируется**.

### 3.3 Болевые точки

- aboi `/sign-in` `EMAIL_NOT_VERIFIED` — только текст, нет resend.
- premium-rosstil — параллельная кастомная верификация (дублирует Better Auth, ничего не гейтит).
- 🔴 auth-hub — OIDC client secrets **захардкожены литералами** в `auth.ts:193-281` (`trustedClients[].clientSecret`,
  6 шт.). auth-hub — **публичное** дерево `letar` (не submodule) → секреты в публичной git-истории = **активная утечка**.
  Ротация вынесена в Этап 0.1 (не Этап 8).
- Три модели ролей, три способа DB-доступа в admin, auth-hub без i18n.

---

## 4. Целевая архитектура

| Слой                | Зона ответственности                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `@letar/auth`       | Сессии, `authClient`, OAuth-кнопки, guards; режимы Ключница/standalone. Реэкспорт хуков pin-auth. |
| `@letar/pin-auth`   | Верификация: коды+ссылки, cross-tab (SSE), resend+cooldown, авто-логин, шаблоны.                  |
| `@letar/email`      | Транспорт (Maddy), `SendEmailResult`, **централизованный лог** SMTP-ошибок.                       |
| Ключница (auth-hub) | OIDC-провайдер для петов; (Этап 8) управление соц-секретами.                                      |
| Приложение          | Тонкая интеграция: страницы, server actions, адаптеры БД, i18n, rate-limit, профиль владельца.    |

Resend-кнопка — тонкая обёртка, **принимает `authClient` параметром** (aboi/kami строят клиент из `better-auth/react`).

---

## 5. Карта auth монорепо

- **Богатый флоу (эталон):** driving-school (pin-auth). **Тупик без resend:** aboi, kami, dsperevod, auth-hub.
- **Кастомная верификация:** premium-rosstil (мигрируем — §9-D4). **PIN:** driving-school, mandala.
- **OIDC-клиенты Ключницы:** kami (гибрид), dashboard (только Ключница), archetest/time/grandslamcup/animatrona-tracker.

---

## 6. Критический путь, фазы и DoD

**Фазы:**

- **Фаза A — Инцидент-реагирование (0.x):** доставка писем, ротация утёкших секретов, защита почты, теги, canary.
  Делается первой; этапы 0.x параллелятся между собой.
- **Фаза B — Фундамент и тираж (1–5):** библиотеки → resend → admin → premium-миграция → богатый pin-auth флоу.
- **Фаза C — Продвинутое (6–8.5):** kami, passkeys, Telegram, driving-school на библиотеку, соц-секреты, merge.

**Критический путь (что блокирует что):**

| Этап             | Зависит от            | Можно параллельно с |
| ---------------- | --------------------- | ------------------- |
| 0, 0.1, 0.2, 0.5 | —                     | друг с другом       |
| 0.7 canary       | 0                     | 0.1, 0.2            |
| 1 libs           | — (публичные `libs/`) | 0.x                 |
| 2 resend         | 1                     | 3                   |
| 3 admin          | частично 1            | 2                   |
| 4 premium        | 1, 2                  | 3, 5                |
| 5 pin-флоу       | 1                     | 3, 4                |
| 6 kami           | 1                     | —                   |
| 6.5 passkeys     | 6                     | 6.6                 |
| 6.6 telegram     | auth-hub              | 6.5                 |
| 7 driving-school | 1, 5                  | 6.x                 |
| 8 секреты        | 1–7                   | —                   |
| 8.5 merge        | auth-hub              | 8                   |

**Definition of Done — глобальный минимум на каждый этап:** (1) код + тесты (Vitest/Playwright, TDD) зелёные;
(2) `nx format && nx lint && nx typecheck:tsgo` чисто; (3) затронутая документация (§11) обновлена; (4) bump версии
и CHANGELOG; (5) для коммерсов — коммит в submodule + bump SHA. Доп. критерии приёмки — в этапах ниже («✓ DoD»).

---

## 7. Этапы (roadmap)

> Каждый этап автономен и тестируется отдельно. Коммерческие — приватные submodules (коммит внутри + bump SHA).

### Этап 0 — Доставка писем (первопричина) ⏱ первым

- Аудит `SMTP_FROM_EMAIL`/SMTP на всех (`/sync-env`, `email-maddy`); для коммерсов — домен письма = домен клиента (§2.4).
- **DKIM/SPF/DMARC per-домен (явный deliverable).** Техн. первопричина «форвард режется gmail» (§14.2): валидные
  DNS-записи для каждого отправляющего домена (`letar.best`, `premium.rosstil.ru`, …). Без них письма в спам/режутся
  даже при верном `SMTP_FROM`.
- **Baseline-метрики (снять ДО правок).** Зафиксировать старт: % доставки, % верификации, число застрявших
  аккаунтов (`emailVerified` пусто/false). Иначе успех Этапа 0/2 недоказуем.
- ✅ **Централизованный лог `success === false` в `@letar/email`** (сессия №1): `reportEmailFailure({ type, to, error })`
  → `[email] send failed {...}` (виден в `docker logs`); `setEmailFailureAlerter` — env-gated точка расширения
  для Telegram/Umami (интеграции — инфра-сессия); bump 0.1.0→0.2.0 + CHANGELOG. ✅ Фикс игнорируемого результата
  в mandala (register/resend actions). aboi — submodule, отдельная сессия.
- **Алертинг (Вариант B + C — §13.4):**
  - **B — Telegram-webhook:** при `success === false` опциональный вызов в `@letar/email`;
    дебаунс — алерт только на 3 подряд `success === false` одного типа;
    конфигурация: `TELEGRAM_ALERT_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID` в `.env.docker` (токен **не хранить в коде/плане**).
  - **C — Umami event:** `umami.track('smtp-failure', { type, appId, errorCode })` для трендов и % ошибок.
  - Оба варианта — опциональные (пустые переменные = отключено), без ломающих изменений API `@letar/email`.
- **✓ DoD:** canary (0.7) зелёный ≥ 3 суток подряд; 0 проигнорированных `SendEmailResult`; baseline зафиксирован.
- **Зависимости:** нет. Без доходящих писем resend бессмыслен.

### Этап 0.1 — Ротация утёкших OIDC-секретов Ключницы 🔴 (поднято из §3.3/§14.2)

- **Проблема (подтверждено по коду):** 6 `clientSecret` в `trustedClients` записаны литералами в `auth.ts:193-281`;
  auth-hub — публичное дерево → секреты в публичной git-истории.
- **Действия:** (1) перегенерировать все 6 секретов; (2) обновить `.env.docker` на s2 и конфиг каждого OIDC-клиента
  (archetest, time, grandslamcup, kami, animatrona-tracker, dashboard); (3) заменить литералы на `process.env.OIDC_<APP>_SECRET`.
- ⚠️ Очистка git-истории НЕ возвращает конфиденциальность (репо публичный) → **ротация обязательна**, filter-repo опционален.
- **✓ DoD:** в `auth.ts` нет строковых секретов (grep чисто); старые секреты отозваны; все клиенты логинятся на новых.
- **Зависимости:** нет. Делать в первой сессии вместе с Этапом 0.

### Этап 0.2 — Защита почтового сервера 🔴 (поднято из §14.2)

- **Брутфорс `kami@letar.best`** на Maddy (`mail.letar.best`): ~390 SASL-попыток submission с десятков IP (ботнет).
  → fail2ban по логам Maddy и/или rate-limit `submission`; сменить пароль ящика на длинный. Конфиг — `/data/maddy.conf`.
- **Форвард `kami@letar.best → letarkami@gmail.com`** режется gmail (DKIM/SPF) — чинится DKIM/SPF/DMARC Этапа 0;
  временная мера — читать ящик по IMAP.
- **✓ DoD:** brute-force IP банятся автоматически; пароль ящика сменён; доставка на канареечный ящик подтверждена (0.7).
- **Зависимости:** нет (горящее). Пересекается с DKIM-настройкой Этапа 0.

### Этап 0.5 — Nx module-boundary теги (§13.10)

- Добавить `tags` в `project.json` всех проектов: `owner:letar` (петы + infra), `owner:commercial` (submodules).
- ESLint `@nx/enforce-module-boundaries`: запретить `owner:commercial → owner:letar` кросс-импорты.
- **Зависимости:** нет. Делается до начала тиражирования библиотек.

### Этап 0.7 — Периодический canary-мониторинг доставки email

- **Цель:** ловить инциденты доставки (как сегодняшний — форвард режется gmail, неверный `SMTP_FROM`, брутфорс)
  **автоматически**, а не по жалобам. Проверять, что письмо реально **доходит** (round-trip), а не только «SMTP принял».
- **Механизм:** scheduled-задача (cron на сервере / health-скрипт) — раз в N минут:
  1. отправляет тестовое письмо через реальный `@letar/email` на канареечный ящик;
  2. читает входящие по **IMAP**, подтверждает получение в пределах таймаута;
  3. пишет метрику latency доставки.
- **Покрытие:** ключевые отправители per-домен (`noreply@letar.best`, `noreply@premium.rosstil.ru`, …) +
  проверка форвардов (напр. `kami@letar.best` → реальная доставка адресату).
- **Алерт при провале:** Telegram-webhook + Umami (переиспользуем алертинг Этапа 0); порог — N подряд неудач.
- **Реализация:** лёгкий скрипт/сервис (не e2e-фреймворк) — SMTP send + IMAP receive, запуск через cron/scheduled.
- **Зависимости:** Этап 0 (лог `SendEmailResult` + алертинг). Закрывает класс «письма молча не ходят».

### Этап 1 — Фундамент библиотек ✅ ВЫПОЛНЕНО (сессия №1, 2026-05-30)

- `@letar/pin-auth`: совместимость с Better Auth (`emailVerified: Boolean`, таблица `verification`); хуки
  переиспользуемы вне driving-school; брендинг шаблонов в конфиг. _(совместимость/брендинг — частично, по мере тиража)_
- ✅ `@letar/auth/client`: `<ResendVerificationButton authClient email callbackURL/>` со встроенным cooldown;
  «лёгкий путь» — обёртка над `authClient.sendVerificationEmail`. bump 0.2.0→0.3.0 + CHANGELOG.
  ⏳ Реэкспорт pin-auth хуков **отложен**: на уровне `libs/` нет cross-lib резолва по имени пакета
  (нет `node_modules/@letar`, paths только в приложениях) — cooldown инлайнен в кнопке. Отдельная задача.
- **Security hardening (§13.1–13.2–13.8) — ✅ сделано:**
  - ✅ **SSE-токен вместо email в URL (§13.1):** `streamToken` генерируется в `token-manager`, передаётся в адаптер
    `createToken`, `useVerificationStream` принимает его. **Аддитивно** — email-путь сохранён; полное удаление
    email-ключа + SSE-роут на `${streamToken}` — при cutover driving-school (Этап 7).
  - ✅ **Timing-safe PIN compare (§13.2):** `crypto.timingSafeEqual` в `pin-validator.ts` (+null-guard). Тесты.
  - ✅ **Single-use авто-логин токен (§13.8):** усилён контракт адаптера `updateTokenForAutoLogin` (атомарная
    замена + одноразовость, док/типы). Полная enforcement (`used`-флаг у потребителя) — Этап 7.
  - ✅ **UX при SMTP-ошибке (§13.4):** в `ResendVerificationButton` cooldown стартует только при `success`.
  - ✅ Добавлена тест-инфраструктура pin-auth (project.json/vitest/tsconfig.spec) + 11 тестов; bump 0.1.0→0.2.0 + CHANGELOG.
- **Зависимости:** нет (публичные `libs/`). Стартовая сессия реализации.

### Этап 2 — Resend email-верификации (исходная боль)

1. **aboi (эталон):** `/sign-in` `EMAIL_NOT_VERIFIED` → блок + resend (email из формы); `/verify-email` error →
   resend; захват `SendEmailResult`; `rateLimit.customRules['/send-verification-email'] = { window: 60, max: 3 }`.
2. **Тираж:** dsperevod → auth-hub (i18n нет → ru-хардкод; гейт только prod → тест с принудительным флагом).
   kami — Этап 6; premium-rosstil — Этап 4.
3. **Ремедиация бэклога застрявших.** Разовая операция: найти аккаунты с пустым/`false` `emailVerified` (особенно
   aboi-тупик) → resend-уведомление или админ-верификация. Resend вперёд не лечит уже ушедших пользователей.

- **✓ DoD:** на эталоне (aboi) E2E «регистрация → тупик → resend → cooldown → верификация» зелёный; бэклог обработан.
- **Зависимости:** Этап 1.

### Этап 3 — Admin «Пользователи» + ручная верификация

- **Create:** aboi (+ `AdminNav`, фильтр `isAnonymous: false`), kami. **Extend:** dsperevod/auth-hub (действия),
  premium-rosstil (колонка статуса + действия).
- Server actions под `requireAdmin`, меняют **только `emailVerified`**; DB-клиент и таблица — по паттерну приложения
  (не общий компонент — §9-D7). ⚠️ enhanced Prisma (dsperevod, premium) → access-policy на `emailVerified`.
- **Зависимости:** частично Этап 1; можно параллельно с Этапом 2.

### Этап 4 — premium-rosstil: миграция на Better Auth (§9-D4 = «мигрировать»)

- `/api/auth/register` → `signUp.email`; resend → shared; кастомный verify-email → встроенный; удалить `tokens.ts`.
- Миграция схемы (убрать `Verification.type`); rate-limit на Better Auth. `requireEmailVerification` **не включаем**
  (§9-D3); resend — баннер в профиле + после регистрации + verify-email error (не на sign-in). Пароли совместимы (bcrypt).
- **Зависимости:** Этапы 1–2.

### Этап 5 — Богатый pin-auth флоу (коды+ссылки+cross-tab) — объём §9-D1

- Внедрить полный флоу (PIN + ссылка + SSE-синхронизация + авто-логин). Каждому целевому: модель `verificationToken`,
  SSE-endpoint `/api/auth/verification-stream`, server actions, адаптеры.
- **Зависимости:** Этап 1; эталон из Этапа 2.

### Этап 6 — kami: авторизация — объём §9-D2

- Унифицировать реализацию через библиотеку, **сохранив все способы** (email/password, magic-link, OAuth, Ключница).
- Проверить OIDC refresh-token handling: `accessTokenExpiration` в Ключнице, поведение клиентов при 401,
  нужен ли `offline_access` scope и явный refresh (§13.7).
- **Зависимости:** Этап 1; стратегия Ключницы.

### Этап 6.5 — Passkeys / WebAuthn (§13.6) — решено: делаем

- **Цель:** zero-password UX для возвращающихся пользователей петов (kami, time, grandslamcup).
- **Scope:** `passkeyPlugin()` в auth-hub (Ключница) → все OIDC-клиенты получают поддержку автоматически;
  новая таблица `passkey` в schema.zmodel Ключницы; кнопка «Войти по Face ID / Touch ID» в UI.
- **Passkey не заменяет email** — fallback при смене устройства остаётся (email-верификация сохраняется).
- **Требования:** `rpID` = `letar.best`, HTTPS (production уже есть).
- **Целевые приложения:** kami ✅, time ✅, grandslamcup ✅; archetest ❌ (разовые пользователи, не возвращаются).
- **Зависимости:** Этап 6 (kami auth унифицирован); лучше после стабилизации Ключницы.

### Этап 6.6 — Telegram-авторизация в Ключнице (новый способ)

- **Сейчас нет** (в auth-hub: github/google/facebook/vk/yandex/magic-link/OIDC). Нужно добавить.
- **Прообраз в монорепо:** driving-school уже имеет модели `TelegramLink` + `TelegramLinkToken` (привязка
  через токен) — взять за основу, как pin-auth.
- **Подход (комбинируемо):**
  - **Бот + deep-link токен (ядро):** сайт генерит one-time токен → `t.me/<bot>?start=<token>` (или QR) →
    Start → бот связывает Telegram-identity с сессией → вход. Идеален для cross-device.
  - **Mini App (TMA):** WebApp в Telegram отдаёт `initData` (HMAC по bot-token) → сервер валидирует → сессия;
    внутри — кабинет identity (профиль, активные сессии, управление email/склейка, 2FA).
  - **Login Widget:** опционально.
- **Отдельный бот для auth_hub** (владелец готов завести). Bot-token = секрет → та же Tier-модель (общий бот
  Ключницы = Tier 1 / свой бот клиента = Tier 2, §2.3).
- **Безопасность:** серверная валидация `hash`/`initData` (HMAC-SHA256 по bot-token). Встроенного
  Telegram-провайдера в Better Auth нет → кастомный плагин/эндпоинт (сверить community-плагины).
- **Команды бота:** `/start` (с payload — подтверждение входа/привязки), `/login`, `/link`/`/unlink`, `/help`,
  кнопка-меню «Открыть кабинет» (Mini App).
- **Зависимости:** Ключница (auth-hub); пересекается с Mini App-кабинетом (управление email — Этап 8.5).

### Этап 7 — driving-school: на общую библиотеку

- Перевести на обновлённую `@letar/pin-auth` (выровнять с Этапом 5), сохранив весь богатый UX.
- **Зависимости:** Этапы 1, 5.

### Этап 8 — Соц-секреты per-владелец + админка (§2.3, §9-D5)

- UI в админке коммерческого проекта: Tier 1 (наши, с показом рисков) / Tier 2 (свои ключи); secret шифруется at-rest.
- Вынести захардкоженные OIDC-секреты auth-hub в secret-store. Проверить динамику провайдеров Better Auth.
- **Зависимости:** после auth-унификации (этапы 1–7). Самостоятельный крупный трек.

### Этап 8.5 — Несколько email на аккаунт (account linking / merge)

- **Фича:** управление своими email в профиле (как GitHub) — привязка/подтверждение нескольких адресов к
  одному аккаунту, вход по любому. Better Auth `accountLinking` линкует только по **одинаковому** email; для
  **разных** адресов нужна кастомная merge-логика (прообраз — `mergeAnonymousAccount` в aboi).
- **Merge:** выбрать canonical-аккаунт → перепривязать `Account`/сессии/связанные данные → погасить дубли →
  аудит. **Необратимо → бэкап БД обязателен.**
- **Разовая операция владельца:** склейка личных email в Ключнице — ✅ **ВЫПОЛНЕНА 2026-05-30** (§14.1):
  canonical `kami@letar.best`, 5 провайдеров (credential, github, google×2, yandex) на одном аккаунте.
  ⏳ **Осталось — перенос данных в петах** (решено: переносим) со старых локальных `user.id` на новый
  после входа под `kami@letar.best` в каждый пет (kami, dashboard, archetest, animatrona-tracker) — см. §14.1.
- **Зависимости:** Ключница (auth-hub); правовой аспект §2.6.

### Этап 9 — Документация — сквозной (§11)

---

## 8. Сквозные требования

- **i18n:** `auth.verification.*` для `[locale]`-приложений (aboi, kami, dsperevod, premium-rosstil); auth-hub — ru-хардкод.
- **Rate-limit:** серверный (`/send-verification-email`, `/sign-up/email`). ⚠️ Дефолтный store Better Auth —
  **in-memory** (сброс при рестарте, не общий между инстансами Docker) → для production задать персистентный store
  (БД/secondary storage), иначе rate-limit иллюзорен. Ключ = `ip + email` (§13.3).
- **SSE-масштабирование:** verification-stream sticky к одному инстансу; при горизонтальном масштабе событие на
  инстансе A не дойдёт до клиента на B без pub/sub. Текущее допущение — однопроцессный деплой; зафиксировать явно.
- **Миграции:** на боевых данных — версионированные `db:migrate` (НЕ `db:push`); бэкап + проверка rollback до старта.
- **Безопасность:** ручная верификация только `requireAdmin`; access-policy для enhanced Prisma; секреты — шифрование
  at-rest; resend не раскрывает существование юзера.
- **UX:** cooldown «Отправить повторно через {n} с»; успех — inline; коды + ссылка в письме.
- **Тесты:** Vitest + Playwright (регистрация → resend → cooldown → cross-tab → admin verify). TDD.

---

## 9. Точки принятия решения (развилка + рекомендация)

> **Решено:** D1 (aboi — первый эталон pin-auth флоу, поэтапно), D3 (premium `requireEmailVerification` — нет),
> D4 (premium → миграция на Better Auth), D5 (секреты per-владелец: админка Tier 1/Tier 2 с информированием),
> D6 (pin-auth отдельная), D7 (admin-таблица пер-приложение), D9 (Passkeys — делаем, Этап 6.5),
> модель владения §2, структура — Nx tags §2.5, алертинг — Telegram+Umami (Этап 0).

- **D2 — kami способы** _(открыто — решить на входе в Этап 6, это его prerequisite)_: (a) **сохранить все способы +
  Ключница, реализацию унифицировать через библиотеку** [рекоменд., согласуется с «сохранить разные способы»];
  (b) только Ключница; (c) не трогать.
- **D8 — Tier 2 / динамика OAuth-провайдеров** _(отложено до заключительных этапов)_:
  Существующие коммерческие приложения (своя `.env.docker`) — динамика не нужна.
  Нужна только для будущей «SaaS Ключницы» (один auth-hub на несколько тенантов).
  Обязателен spike (1–2 дня) **до** начала реализации. Варианты: (a) LRU-кэш инстансов с TTL;
  (b) proxy-провайдер с динамическим `clientId`/`clientSecret` из БД по `tenantId` [рекоменд. для MVP];
  (c) отдельный контейнер per tenant. Проработать в рамках Этапа 8.

---

## 10. Риски

- **Доставка писем** (Этап 0) — первопричина, без неё всё бессмысленно.
- **Схема pin-auth ↔ Better Auth** (`DateTime`/`verificationToken` vs `Boolean`/`verification`) — адаптеры + миграции.
- **enhanced Prisma + ручная верификация** — нужна access-policy, иначе action молча не применится.
- **Обход верификации** через admin — только `requireAdmin`, аудит-лог желателен.
- **Email-флуд** — серверный rate-limit на resend.
- **Соц-секреты Tier 1** — общий риск бана OAuth-приложения; владение/юридика (ToS); шифрование at-rest для БД.
- **Правовое (152-ФЗ)** — оператор/обработчик, договор поручения для Tier 1, локализация ПДн в РФ, согласия per-домен (§2.6).
- **Account-merge** — необратимо (перепривязка/удаление дублей) → бэкап БД + выбранный canonical до старта; боевые данные.
- **Submodules** — коммит внутри + bump SHA; не смешивать с публичными `libs/` в одной сессии.
- **🔴 Секреты в публичном репо** — захардкоженные OIDC client secrets auth-hub уже в публичной истории → ротация (Этап 0.1).
- **Миграции на боевых данных** — `db:migrate` + бэкап + dry-run; особенно перенос FK в петах (§14.1) и merge (§8.5).
- **Rate-limit in-memory** — без персистентного store защита фиктивна после рестарта / на нескольких инстансах.

---

## 11. Документация (сквозной шаг)

- `libs/pin-auth/README.md` — Better Auth-совместимость + примеры вне driving-school.
- `libs/auth/README.md` — resend-кнопка/хук (клиент — параметр); режимы Ключница/standalone.
- `libs/email/README.md` — лог `success === false`, формат строки.
- `.claude/docs/auth.md` — «Email-верификация и resend» + **модель владения и auth-профили** (§2).
- `.claude/docs/email.md` — `SendEmailResult`, SMTP-ошибки, `SMTP_FROM_EMAIL`, домен письма per-владелец.
- `.claude/rules/auth.md` — правило: при `requireEmailVerification` обязательны resend + rate-limit.
- PLAN/CHANGELOG/версии затронутых проектов. Перед merge — `docs-auto-sync` + `workflow:update-docs`.

---

## 12. Агенты и скиллы

- **`security-auditor`** — resend, ручная верификация, соц-секреты (Этап 8), access control.
- **`auth-policy-validator`** — `@@allow/@@deny` на `emailVerified` (enhanced Prisma).
- **`ui-architect`** — UX `EMAIL_NOT_VERIFIED`, баннеров, admin-таблиц, PIN-инпута, выбора Tier 1/2 (Chakra v3).
- **`e2e-test-writer`** — Playwright: регистрация → resend → cooldown → cross-tab → admin verify.
- **`refactor-expert`** — тираж без дублирования; перевод driving-school на библиотеку.
- **`code-quality-gate`** — перед коммитом (`nx format` → `nx lint` → `nx typecheck:tsgo` → test).
- **`migration-assistant` / `db-schema-assistant`** — миграции схем (pin-auth модели, `Verification.type`).

> Скиллы: `better-auth` (resend, rateLimit, OIDC, динамика провайдеров), `email-maddy` (`SMTP_FROM_EMAIL`),
> `chakra-theming`, `i18n-multilingual`, `zenstack-helper` (access policies), `deployment-assistant` (секреты).

---

## 13. Предложения архитектора (поверхностный анализ — нужны уточнения)

> ⚠️ **Предупреждение:** Это результат поверхностного анализа кода и документации без глубокого погружения
> в runtime-поведение и edge-case'ы. Каждый пункт требует обсуждения перед включением в план.
> Вопросы для уточнения — в §13.0.

### 13.0 Вопросы для уточнения — ЗАКРЫТЫ

1. **D1 / приоритет:** ✅ **aboi** — первый эталон Этапа 2.
2. **Passkeys:** ✅ **Делаем** — Этап 6.5, через Ключницу, для kami/time/grandslamcup.
3. **SMTP-алертинг:** ✅ **Вариант B + C** — Telegram-webhook + Umami events (Этап 0).
   Конфиг: `TELEGRAM_ALERT_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID` в `.env.docker`. Токен — только в `.env`, не в коде.
4. **Tier 2 / динамика:** ✅ **Отложено** до заключительных этапов — D8 в §9, spike перед реализацией.
5. **Ключница OIDC / refresh:** 🔲 Не подтверждено. Проверить при работе над Этапом 6 (kami).
6. **Rate-limit NAT:** ✅ NAT не актуален (пользователи из разных мест) — IP-based достаточен.

---

### 13.1 Уязвимость: SSE endpoint с email в URL

**Проблема.** Текущая реализация SSE: `/api/auth/verification-stream/${email}` — email в URL.
Любой может подписаться на поток чужого email и узнать факт верификации (enumeration юзеров).

**Рекомендация.** Заменить email-параметр на одноразовый `streamToken` (UUID), который:

- генерируется в сервер-экшене при создании PIN,
- хранится в `verificationToken.streamToken`,
- инвалидируется при верификации или истечении PIN.

```typescript
// Вместо /api/auth/verification-stream/${email}
// → /api/auth/verification-stream/${streamToken}
```

**Объём:** небольшой — `token-manager.ts`, SSE-роут, клиентский `useVerificationStream`.
**Зависимости:** Этап 1 (рефакторинг pin-auth). Включить как sub-task Этапа 1.

---

### 13.2 Timing-атака на PIN: нужен constant-time compare

**Проблема.** В `pin-validator.ts:90`: `verificationToken.pin !== pin` — строковое сравнение
уязвимо к timing-атаке (теоретически, при короткой сети и предсказуемом серверном времени).

**Рекомендация.** Заменить на `crypto.timingSafeEqual`:

```typescript
import { timingSafeEqual } from 'crypto'

const storedPin = Buffer.from(verificationToken.pin, 'utf8')
const inputPin = Buffer.from(pin.padEnd(storedPin.length), 'utf8')
const match = storedPin.length === inputPin.length && timingSafeEqual(storedPin, inputPin)
```

**Объём:** 5 строк в `pin-validator.ts`. Низкий риск регрессий.
**Зависимости:** нет — сделать в Этапе 1 как hardening.

---

### 13.3 Rate-limit: два уровня (IP + email) ✅ уточнено

NAT не актуален (§13.0.6). Итоговая конфигурация:

- **IP-уровень:** `{ window: 60, max: 10 }` — защита от burst-flood.
- **Email-уровень:** `{ window: 3600, max: 5 }` — защита от targeted harassment на конкретный адрес.
- Реализация: `rateLimit.customRules` Better Auth, ключ = `ip + email`.

---

### 13.4 SMTP graceful degradation: UX при failure ✅ включено в план

Включено в Этап 0 (алертинг B+C) и Этап 1 (UX `useResendCountdown`):

- Cooldown не применяется при `success === false`.
- Пользователю: нейтральное сообщение без деталей ошибки.
- Telegram: 3 подряд failure → webhook. Umami: event на каждый failure для трендов.
- ⚠️ `TELEGRAM_ALERT_BOT_TOKEN` и `TELEGRAM_ALERT_CHAT_ID` — только в `.env.docker`, не в коде.

---

### 13.5 Динамика OAuth-провайдеров Better Auth ✅ отложено → D8

Для существующих коммерческих приложений (каждое — отдельный деплой) динамика не нужна.
Актуально только для будущей «SaaS Ключницы». Перенесено в D8 §9, spike перед реализацией.

---

### 13.6 Passkeys / WebAuthn ✅ делаем → Этап 6.5

Решено. Описание в §7 Этап 6.5.

---

### 13.7 Ключница OIDC: refresh-token handling 🔲 проверить в Этапе 6

Sub-task для Этапа 6 (kami): проверить `accessTokenExpiration`, реакцию на 401, необходимость
`offline_access` scope. Включено в описание Этапа 6.

---

### 13.8 Авто-логин токен: гарантия single-use ✅ включено в план → Этап 1

Включено в security hardening Этапа 1. Адаптер `updateTokenForAutoLogin` — delete + create, не update.

---

### 13.9 Наблюдаемость: KPI верификации ✅ включено → Этап 0 + Этап 2

Umami events: отправка письма, успешная верификация, resend — добавить в server actions Этапа 2 (aboi).
Telegram alerting — в Этапе 0. Вместе дают картину: % доставки + % верификации.

---

### 13.10 Nx module-boundary tags ✅ включено → Этап 0.5

Описание в §7 Этап 0.5.

---

## 14. Операционный журнал и инфра-задачи (сессия 2026-05-30)

> Реальная диагностика на боевых серверах в ходе входа владельца под `kami@letar.best`.
> Доступ: `s2.letar.best` и `mail.letar.best` (ssh `root`, ключ `~/.ssh/id_rsa`, **Windows OpenSSH**
> `/c/Windows/System32/OpenSSH/ssh.exe` — bare `ssh` из Git Bash блокируется хуком).

### 14.1 Склейка email владельца — выполнена частично

- **Canonical:** `kami@letar.best` (`user_id KpfNm3u1okG3LFSXcPBZ9iOvmX2b84QQ`), создан через magic-link.
- ✅ **Ключница** (`auth-hub-postgres` → БД `lena_auth`, user `lena_user`): на canonical перепривязаны 4 соц-аккаунта
  (google kaspergreen `101941…`, google letarkami `109881…`, github `233054854`, yandex `4088232`); старые 3
  аккаунта (`TIP06…`, `34Brv…`, `Df3ZY…`) + их сессии/consent/токены/credential удалены. Бэкап:
  `/root/lena_auth_backup_20260530_042306.sql.gz` на s2.
- ⏳ **Осталось — перенос данных в петах** (решено: переносим). Данные под СТАРЫМИ локальными `user.id`:
  - **kami** (`kami-postgres` → `lena_kami`): `jaY81…` (letarkami), `19rIL…` (kaspergreen) — есть данные
    (консультации/организации/квизы). dashboard / archetest / animatrona-tracker — тоже дубли (`letar-auth`/google).
  - **План:** владелец входит под `kami@letar.best` в каждый пет (OIDC создаёт новый локальный user) → перенести FK
    со старых `user.id` на новый → удалить старые. Бэкап каждой БД до переноса. grandslamcup — чисто; time — иная схема (нет `Account`).

### 14.2 Инфра-задачи (журнал диагностики; задачи подняты в roadmap §7)

> Эти пункты теперь — нумерованные этапы Фазы A (0.1, 0.2 + DKIM в 0). Ниже остаётся первичная диагностика.

- **🔴 Брутфорс `kami@letar.best`** на Maddy (`mail.letar.best`): ~390 неудачных SASL submission с десятков IP (ботнет).
  → **Этап 0.2** (fail2ban / rate-limit `submission`, смена пароля). Конфиг — `/data/maddy.conf`.
- **🟠 Форвард не доставляется:** в `/data/aliases` Maddy `kami@letar.best → letarkami@gmail.com`, gmail режет форвард
  (DKIM/SPF letar.best) — поэтому письма «не приходили». → **Этап 0** (DKIM/SPF/DMARC) + **Этап 0.2** (IMAP как мера).
- **🟠 Баг UI magic-link:** экран показывает «Ссылка отправлена!» даже когда запрос не прошёл (результат отправки
  игнорируется) — ровно проблема Этапа 1/2 (захват `SendEmailResult` + честный UI). Воспроизведено вживую.
- **🟡 MCP `postgres-kami`** протух (`password authentication failed for user "postgres"`; верно `lena_user`/`lena_kami`).
  → подзадача-чип создана (починить `.mcp.json`).

### 14.3 Инфра-факты (для новой сессии)

- **Серверы:** `s2.letar.best` (приложения+БД), `mail.letar.best` (Maddy `foxcpp/maddy` + nginx-proxy-manager).
- **БД на s2:** `auth-hub-postgres` (`lena_auth`), `kami-postgres` (`lena_kami`), + per-app (`dashboard-db`,
  `archetest-db`, `animatrona-tracker-postgres`…); user везде `lena_user`, psql через `docker exec` без пароля (local trust).
- **Maddy:** управление `docker exec maddy maddy creds list` / `maddy imap-acct list` (НЕ `maddyctl` — нет в PATH).
  Таблицы Better Auth/ZenStack везде PascalCase (`"User"`, `"Account"`). **Ключница TZ:** БД в UTC, сервер MSK (UTC+3).
