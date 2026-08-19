# PLAN_COMPLETED.md — Архив выполненных сессий

> **Перенесено в приватные доки 2026-07-28 (§27 Часть 2 Шаг 2.5, root-weaver).** Архив рабочего
> журнала (65 записей сессий №1–74, до 2026-07-13) содержал плотную кросс-приложенческую
> операционную историю (rollout/deploy-engine кампания, инциденты, ротации секретов) — тот же
> класс контента, что журнал §18.6/§18.7 в `PLAN.md`, перенесённый туда же ранее в этой сессии.
> Полный текст — [`.claude/private/PLAN_COMPLETED.md`](.claude/private/PLAN_COMPLETED.md)
> (репозиторий `letar-private-docs`, submodule). Активный журнал сессий — см. блок СТАТУС
> в корневом `PLAN.md`.

---

# PLAN — Auth-план: выполненные этапы (архив)

> Архив завершённых этапов раздела «## 7. Этапы (roadmap)» из `PLAN.md` (auth-план —
> «Глобальная унификация авторизации и верификации в монорепо»). Перенесено: 2026-08-20.
> Активный план, критический путь и текущий статус — `PLAN.md`.

## Фаза A — Инцидент-реагирование и инфра

### Этап 0.1 — Ротация утёкших OIDC-секретов Ключницы ✅ ПОЛНОСТЬЮ (сессии №2 + №7 + №8)

- **Проблема (подтверждено по коду):** 6 `clientSecret` в `trustedClients` записаны литералами в `auth.ts:193-281`;
  auth-hub — публичное дерево → секреты в публичной git-истории.
- ✅ **Код-часть (сессия №2):** литералы заменены на `requireOidcSecret('OIDC_<APP>_SECRET')` из `process.env`
  (fail-fast хелпер); переменные добавлены в `.env.local` (dev) и `.env.docker` (prod, не коммитятся) с текущими
  значениями. Grep по `clientSecret: '` чист. bump auth-hub 0.3.1→0.3.2.
- ✅ **Инфра-часть (сессия №8, 2026-06-04):** сгенерированы новые секреты для 6 старых клиентов + добавлен
  `OIDC_STUDIO_SECRET` (новый); обновлены `.env.docker` auth-hub + всех 6 клиентов на s2; seed 7/7; рестарт.
  Старые значения из git-истории отозваны.
- ⚠️ Очистка git-истории НЕ возвращает конфиденциальность (репо публичный) → **ротация обязательна**, filter-repo опционален.
- **✓ DoD:** в `auth.ts` нет строковых секретов (grep чисто); старые секреты отозваны; все клиенты логинятся на новых.
- **Зависимости:** нет. Делать в первой сессии вместе с Этапом 0.

### Этап 0.2 — Защита почтового сервера ✅ ОСНОВНАЯ ЗАЩИТА (2026-06-04)

- ✅ **fail2ban jail `maddy-submission`** настроен (2026-06-04): фильтр читает Docker json-log
  (`/var/lib/docker/containers/<id>/<id>-json.log`), regex `\\\"src_ip\\\":\\\"<HOST>:\d+\\\"`;
  `maxretry=5 / findtime=120s / bantime=86400s`; action `iptables-multiport port=587`; тест-бан прошёл.
- ✅ **Пароли сменены** для `kami@letar.best` и `admin@letar.best` (были атакуемые, сгенерированы 32-символьные).
  Новые значения — только в менеджере паролей владельца (не в коде/PLAN).
- ⏳ **Форвард на gmail** режется (DKIM/SPF) — чинится DKIM/SPF/DMARC Этапа 0; DKIM DNS-записи для `letar.best`
  и для доменов большинства коммерческих приложений уже есть; по одному из них DKIM пока не трогается —
  причина и деталь в `apps/driving-school/PLAN.md` (Технический долг).
  Конкретные хосты/ящики/пути конфигов — в приватном `.claude/OPS_JOURNAL.local.md` (§14.2).
- **✓ DoD:** ✅ brute-force IP банятся автоматически; ✅ пароль ящика сменён; ⏳ доставка на канареечный ящик подтверждена (0.7).
- **Зависимости:** нет (горящее). Пересекается с DKIM-настройкой Этапа 0.

### Этап 0.3 — Ревизия системы бэкапов (прод + локальные) ✅ ПОЛНОСТЬЮ (2026-06-04)

> **Проблема:** сейчас бэкапится много лишнего, а часть критичного — нет. Нужна единая продуманная стратегия.

- ✅ **Сузить scope синхронизации (Resilio Sync).** `.sync/IgnoreList` обновлён на s1 + s2
  (добавлены `.env.docker` / `.env.local` / `.env` → секреты не уходят в offsite Resilio).
- ✅ **Базы данных — охват проверен (2026-07-28):** реестр `APP_CONFIG` в `dashboard-agent`
  (`pg_dump` ежедневно в `/home/deploy/letar/backups`) сверен с фактическим списком приложений
  с БД на s2. **Найден и закрыт пробел: `aboi` и `aprel8008` не бэкапились вообще** (не были
  в реестре + `.env.docker` не смонтирован в `/secrets/`) — добавлены оба. Заодно найден и
  закрыт дрейф `SERVER_APPS` (канон `@letar/infra-config` не знал про `studio` — падал
  `server-config.guard.spec.ts`). Ротация — файлы копятся без явного лимита (не проверялось
  специально, вне скоупа этой сессии). Детали — `apps/dashboard-agent/CHANGELOG.md` 0.8.7.
- ✅ **Конфиги Maddy** (2026-06-04): `/opt/maddy/backup.sh` тарует `maddy.conf` + `docker-compose.yml` +
  `credentials.db` + `aliases` + `dkim_keys/` → `/root/backups/maddy/maddy_YYYY-MM-DD.tar.gz`;
  cron 03:00 ежедневно, ротация 14 дней. Документировано в `backup-architecture.md`.
  ✅ rsync mail→s2 после каждого бэкапа → Resilio тянет на Windows/pinner2 (offsite).
  🔴→✅ **Инцидент простоя (найдено и починено 2026-07-28):** пересоздание `mail.letar.best`
  (~19-20 июня) молча снесло cron-запись и SSH-ключ rsync → бэкапы не шли 26 дней (последний перед
  находкой — `2026-07-02`), обнаружено только при внеплановой проверке цепочки Windows-синка, не
  мониторингом. Почищено: новый ed25519-ключ `root@mail → deploy@s2` в `authorized_keys`, `backup.sh`
  патчнут на явный `-i`, cron `0 3 * * *` возвращён, ручной прогон подтвердил `mail → s2 → Resilio →
Windows` целиком. Побочный эффект — `rsync --delete` из пересозданной пустой исходной папки снёс
  старые 14 архивов на s2 (сами DKIM-ключи не задеты, ротация копится заново с 2026-07-28).
  ✅ **Урок закрыт (2026-07-28, та же сессия):** новая cron-задача `maddy-backup-freshness-check`
  в `dashboard-agent` (раз в 6 часов, `s2`) алертит `BACKUP_FAILED`, если самый свежий
  `maddy_*.tar.gz` в `/home/deploy/letar/backups/maddy` старше 30 часов. `dashboard-agent` 0.8.7→0.8.8.
- ✅ **Nginx Proxy Manager** (2026-06-04): бэкапы создавались штатно до мая; обнаружен баг
  `WORKSPACE_PATH` → nginx backup молча падал (HTTP 200, success=false). Фикс в `27960b3`,
  деплой ожидается от BlackCove. Ротация реализована (MAX=14 авто-бэкапов). Старые бэкапы
  почищены (27 удалено на s2, 35 на s1). Dry-run: nginx archive (737 файлов) валиден.
- ✅ **Локальные credentials** — стратегия задокументирована в `backup-architecture.md`
  (KeePassXC для секретов; git для кода; Resilio только для uploads+backups).
- ✅ **Resilio Sync R/O ключи** убраны из публичного `backup-architecture.md` → перенесены в
  `.claude/OPS_JOURNAL.local.md §14.4` (2026-06-04).
- **✓ DoD:** задокументирована единая стратегия (что/откуда/куда/ротация); IgnoreList синхронизирует только
  `uploads`+`backups`; Maddy-конфиги и DKIM в бэкапе; локальные креды защищены; восстановление проверено dry-run;
  Resilio-ключи убраны из публичного дерева.
- **Зависимости:** пересекается с Этапом 0.2 (Maddy) и 0.4 (secret-manager). Документация — `backup-architecture.md`.

### Этап 0.4 — Выделенный secret-manager для кредов ✅ ПОЛНОСТЬЮ (2026-06-11)

> **Идея:** сейчас креды (личные владельца и прод) разбросаны по `.env.docker`/`.env.local` на разных машинах.
> Вынести в единый инструмент управления секретами.

- ✅ **Инструмент выбран: SOPS + age** (2026-06-05). Обоснование: self-hosted s2, один владелец, нет нового
  сервиса на s2. Файлы `.env.docker.enc` шифруются и хранятся в git. Приватный age-ключ — в KeePassXC.
  Расшифровка при деплое: `sops exec-env .env.docker.enc 'docker compose up'`. 152-ФЗ ✅.
  Infisical/Vault отклонены: избыточны при одном операторе.
- **Что покрыть:** прод-секреты (`.env.docker` всех приложений), OIDC client secrets (Этап 0.1), соц-секреты (Этап 8).
- **Связи:** Этап 0.1 (ротация OIDC), Этап 0.3 (бэкап), Этап 8 (соц-секреты per-владелец).
- **✓ DoD:** age-ключ сгенерирован; `.sops.yaml` настроен; пилот на одном приложении; процесс деплоя обновлён.
- **Зависимости:** не блокирует, желателен до Этапа 8.

### Этап 0.5 — Nx module-boundary теги (§13.10) ✅ ПОЛНОСТЬЮ

- ✅ **Публичная часть (сессия №2):** тег `owner:letar` добавлен в 60 `project.json` публичного дерева
  (петы + infra + все `libs/*`); submodules исключены. depConstraint `owner:letar → [scope:shared, owner:letar]`
  в `eslint.config.mjs` — ESLint запрещает импорт коммерческого кода в петах. Проверено: 0 нарушений границ.
- ✅ **Submodule-часть (сессия №3, 2026-05-30):** тег `owner:commercial` добавлен в **10** коммерческих
  submodule-проектов (`nx show projects --with-tag owner:commercial`): aboi (+e2e), driving-school (+e2e +db),
  premium-rosstil, imot (+e2e), dsperevod (+e2e). Коммит внутри каждого submodule + bump SHA в letar.
  `premium-rosstil-e2e` пропущен (нет `project.json` → Nx не видит проект). Реципрокный constraint
  `owner:commercial → [scope:shared, owner:commercial]` добавлен в `eslint.config.mjs`; module-boundary чист (0 нарушений).
- **Зависимости:** нет. Делается до начала тиражирования библиотек.

### Этап 0.7 — Периодический canary-мониторинг доставки email ✅ ПОЛНОСТЬЮ (обе ноги, 2026-07-22; починен 2026-08-08)

> ⚠️ **Отметка «полностью» 2026-07-22 была преждевременной, и это стоило 17 дней слепоты.**
> Этап закрыли по факту «код развёрнут, обе ноги `configured: true`» — но зелёного прогона никто
> не дождался. External-нога не была зелёной **ни разу с рождения** (все 1682 прогона с 22.07:
> Gmail клал письма в спам, а искали только в INBOX), internal сломалась 02.08 после 11 дней.
> При этом канал оповещения не создал ни одной записи `Alert`, потому что алертил ровно один раз
> и не проверял, дошло ли. Разбор и починка — `PLAN-INFRA.md` §62, `dashboard-agent` 0.12.0.
>
> **Урок для формулировки DoD:** «сторож развёрнут» и «сторож работает» — разные утверждения.
> Проверяемый критерий этого этапа (ниже, в DoD Этапа 0) звучал верно — «canary зелёный ≥ 3 суток
> подряд», — но этап закрыли, не дождавшись его выполнения. Формулировка не спасает, если по ней
> не сверяются.

> **✅ Код готов (2026-07-22, root-weaver, dashboard-agent 0.7.6 → 0.8.0):** `lib/email-canary.ts` +
> `routes/email-canary.ts` в `dashboard-agent` — `POST /api/cron/email-canary-check`, cron-задача
> `email-canary-check` (раз в 15 минут, s2). SMTP-отправка (`canary@letar.best`) + IMAP-проверка
> двух независимых ног: **internal** (тот же ящик Maddy — жив ли сам SMTP/IMAP) и **external**
> (BCC на реальный внешний почтовик, напр. Gmail — ловит класс инцидента «форвард режется gmail»,
> а не только «SMTP принял»). Обе ноги опциональны по конфигу — отсутствие env-переменных не
> считается провалом, нога просто не проверяется. Состояние + latency последних 30 прогонов —
> `/home/deploy/letar/email-canary-state.json`; при 3 подряд неудачах одной ноги — алерт в
> dashboard (переиспользован `AlertType.CRON_FAILED`, не заводили отдельный enum/миграцию ради
> этой задачи — можно завести `EMAIL_DELIVERY_FAILED` отдельно, если понадобится фильтрация в UI).
> Umami-канал алертинга не заведён — текущий `sendNotification` в dashboard поддерживает только
> Telegram, отдельный Umami-event ради одной задачи признан непропорциональным.
> **✅ Internal-нога провижинирована и подтверждена (2026-07-22):** ящик `canary@letar.best`
> создан на Maddy, SMTP+IMAP auth проверены вживую (оба OK), секреты залиты в `.env.docker.enc`
> (коммит `2a5aaa0d`), синхронизированы на s1/s2. **✅ External-нога провижинирована и
> подтверждена (2026-07-22):** получатель — личный ящик владельца (Gmail), IMAP app-password
> сгенерирован владельцем (потребовалось включить 2FA), `ImapFlow.connect()` к `imap.gmail.com:993`
> проверен вживую — OK. `EMAIL_CANARY_EXTERNAL_*` залиты в `.env.docker.enc`, синхронизированы на
> s1/s2. Обе ноги `configured: true`. Прод-инцидент 2026-07-22 (ImapFlow ронял процесс
> `dashboard-agent` при зависшем сокете) пофикшен коммитом `305c0ec7` (0.8.0→0.8.1), доп. фиксы
> — 0.8.2. Детали — `apps/dashboard-agent/PLAN.md` и `CHANGELOG.md`.

- **Цель:** ловить инциденты доставки (как сегодняшний — форвард режется gmail, неверный `SMTP_FROM`, брутфорс)
  **автоматически**, а не по жалобам. Проверять, что письмо реально **доходит** (round-trip), а не только «SMTP принял».
- **Механизм:** scheduled-задача (cron на сервере / health-скрипт) — раз в N минут:
  1. отправляет тестовое письмо через реальный `@letar/email` на канареечный ящик;
  2. читает входящие по **IMAP**, подтверждает получение в пределах таймаута;
  3. пишет метрику latency доставки.
- **Покрытие:** ключевые отправители per-домен (`noreply@letar.best` и доменов коммерческих приложений) +
  проверка форвардов (напр. `kami@letar.best` → реальная доставка адресату).
- **Алерт при провале:** Telegram-webhook + Umami (переиспользуем алертинг Этапа 0); порог — N подряд неудач.
- **Реализация:** лёгкий скрипт/сервис (не e2e-фреймворк) — SMTP send + IMAP receive, запуск через cron/scheduled.
- **Зависимости:** Этап 0 (лог `SendEmailResult` + алертинг). Закрывает класс «письма молча не ходят».

## Фаза B — Фундамент, абстракция и тираж

### Этап 1 — Фундамент библиотек ✅ ВЫПОЛНЕНО (сессия №1, 2026-05-30)

- `@letar/pin-auth`: совместимость с Better Auth (`emailVerified: Boolean`, таблица `verification`); хуки
  переиспользуемы вне driving-school; брендинг шаблонов в конфиг. _(совместимость/брендинг — частично, по мере тиража)_
- ✅ `@letar/auth/client`: `<ResendVerificationButton authClient email callbackURL/>` со встроенным cooldown;
  «лёгкий путь» — обёртка над `authClient.sendVerificationEmail`. bump 0.2.0→0.3.0 + CHANGELOG.
  ✅ **Реэкспорт pin-auth хуков — закрыто (2026-07-28):** `ResendVerificationButton` переиспользует
  `useResendCountdown` из `@letar/pin-auth/client`; резолв решился штатным `bun install`
  workspace-симлинком (`libs/auth/node_modules/@letar/pin-auth`) + package.json `exports` — ручной
  `paths`-маппинг в tsconfig не потребовался, Nx сам подхватил зависимость в граф (см. `libs/deploy-mcp`
  → `@letar/infra-config` — тот же паттерн уже был в монорепо). `@letar/auth` 0.11.2→0.11.3.
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

### Этап 1.5 — Серверная абстракция `createAuth(profile)` ⭐ ✅ ПОЛНОСТЬЮ (сессия №9, 2026-06-04; DoD закрыт 2026-07-15)

> **Зачем:** сейчас каждое приложение собирает `betterAuth({...})` руками (auth-hub ~390 строк, копируются при
> тираже). Цель — свести различие приложений к объекту `AuthProfile` (§2.2/§4), убрать дублирование, сделать смену
> режима (коммерс «переходит на letar.best») конфигом, а не переписыванием `auth.ts`.

1. ✅ **Spike + реализация `createAuth()` в `@letar/auth/server`** (сессия №9): режимы `standalone` / `hub-client` /
   `hub-provider`; email-коллбэки инжектируются приложением; DB-адаптер остаётся app-side; generic-перегрузки;
   16 Vitest тестов; bump 0.3.0→0.4.0. Совместимость с ZenStack v3 ORM (`as never`) подтверждена.
   Ограничение: `additionalFields` не выводятся автоматически через фабрику (Better Auth generic inference ограничен) →
   приложения используют `as unknown as SessionUser`. Задокументировано в коде.
2. ✅ **Эталон-миграция standalone** → **dsperevod**: `auth.ts` заменён декларацией профиля (90→35 строк).
3. ✅ **Эталон-миграция hub-client** → **time**: `auth.ts` 84→20 строк, без DB-адаптера.
4. ✅ **DoD закрыт (2026-07-15):** `libs/auth/README.md` описывает все 3 режима с примерами по каждому
   приложению-эталону (dsperevod/time/kami/auth-hub/driving-school), API Reference, актуально на
   `@letar/auth` 0.7.0. E2E `dsperevod-e2e/src/email-verification.spec.ts` (behavior-parity после
   миграции standalone на `createAuth()`) прогнан локально — 2/2 зелёных (регистрация →
   `EMAIL_NOT_VERIFIED` → resend → cooldown; верификация по токену → автологин). Контракт §4
   переписан под реальный API (`libs/auth/src/server/create-auth/types.ts` — дискриминированное
   объединение по `mode`, разошёлся с исходным эскизом). Реестр hub-клиентов закрыт сессией №7.
   **Этап 1.5 ПОЛНОСТЬЮ ЗАВЕРШЁН** — фабрика в проде на 6 приложениях во всех 3 режимах.

- **✓ DoD:** `createAuth()` покрыт тестами; dsperevod (`standalone`) + archetest/time (`hub-client`) работают на
  фабрике, E2E зелёный; их `auth.ts` сократился до декларации профиля; `libs/auth/README.md` описывает 3 режима;
  контракт §4 финализирован; решены под-вопросы п.4.
- **Зависимости:** Этап 1. **Блокирует** постановку новых потребителей на режимы (Этапы 4, 6, 7, 8).

### Этап 2 — Resend email-верификации (исходная боль) — ✅ ПОЛНОСТЬЮ

> **auth-hub (2026-05-30):** ✅ resend на `/sign-in` через `<ResendVerificationButton>` (@letar/auth/client)
> для обоих сценариев — авторегистрация и вход неверифицированного (`verifyEmailSent` в `login.action.ts`);
> ✅ захват `SendEmailResult` + `reportEmailFailure`; ✅ rate-limit `/send-verification-email` `{60,5}`.
> bump 0.3.2→0.4.0 + CHANGELOG. ⏳ Follow-up: у auth-hub нет vitest/e2e инфраструктуры для resend.
> ✅ **Ремедиация бэклога застрявших (2026-06-04):** 12 застрявших (VK OAuth до резенд-фикса) →
> bulk-верификация на прод. Итог: 27/27 верифицированы.

1. ✅ **aboi (эталон):** детали и E2E-путь — `apps/aboi/PLAN_COMPLETED.md`.
2. ✅ **Тираж:** dsperevod (детали — `apps/dsperevod/PLAN.md`) → auth-hub (выше) → kami (Этап 6) →
   premium-rosstil (Этап 4, приложение впоследствии выведено из эксплуатации).
3. ✅ **Ремедиация бэклога застрявших (2026-06-04)** на aboi и dsperevod — 0 застрявших на каждом;
   auth-hub — см. выше.

- **✓ DoD:** на эталоне E2E «регистрация → тупик → resend → cooldown → верификация» зелёный ✅; бэклог
  застрявших закрыт (2026-06-04). **Этап 2 — ПОЛНОСТЬЮ.**
- **Зависимости:** Этап 1.

### Этап 3 — Admin «Пользователи» + ручная верификация ✅ ПОЛНОСТЬЮ (2026-06-04)

- ✅ **kami:** `admin/users` страница + `VerifyButton` + `verifyUserAction` + «Пользователи» в `AdminSidebar`.
- ✅ **auth-hub:** `VerifyButton` + `verifyUserAction` добавлены в существующую `admin/users`.
- ✅ **aboi, dsperevod** — тот же паттерн; детали в `apps/aboi/PLAN_COMPLETED.md` и `apps/dsperevod/PLAN.md`
  (enhanced Prisma, политика `@@allow('all', auth().role == ADMIN)`).
- ✅ **premium-rosstil** (впоследствии выведено из эксплуатации, Этап 4) — тот же паттерн.
- Server actions под `requireAdmin`, меняют **только `emailVerified`**; DB-клиент по паттерну приложения (§9-D7).
- **Зависимости:** частично Этап 1; можно параллельно с Этапом 2.

### Этап 4 — premium-rosstil: миграция на Better Auth (§9-D4 = «мигрировать») ✅ ПОЛНОСТЬЮ (сессии №15–16)

> ➖ **Приложение впоследствии выведено из эксплуатации (2026-07-05)**, submodule удалён — этап
> сохранён как исторический результат, дальнейшие действия не требуются. Технические детали
> миграции (пофайлово) и последующего Этапа 5 (pin-auth флоу) на этом приложении — перенесены в
> `.claude/private/PLAN-JOURNAL.md` (§27 Часть 2 Шаг 2.1), т.к. `apps/`-папки для него больше нет.

- Кастомная email/password-верификация заменена на Better Auth целиком (регистрация, resend,
  password-reset, `Verification.type`/`LoginAttempt` дропнуты в пользу core-таблиц).
- `requireEmailVerification` **не включали** (§9-D3). Пароли совместимы (bcrypt).
- **Зависимости:** Этапы 1–2 ✅.

### Этап 5 — Богатый pin-auth флоу (коды+ссылки+cross-tab) ✅ ПОЛНОСТЬЮ (2026-06-04)

- ✅ Реализован на том же приложении, что и Этап 4 (историческое, выведено из эксплуатации) — детали
  в `.claude/private/PLAN-JOURNAL.md` (см. выше).
- **Зависимости:** Этап 1 ✅; эталон driving-school.

## Фаза C — Продвинутое

### Этап 6 — kami: авторизация ✅ ПОЛНОСТЬЮ (2026-06-05, сессии №18–19)

- ✅ **§13.7** — `offline_access` scope в kami + фабрику. Коммит `93f713e`.
- ✅ **Фабрика расширена** — `rateLimit`, `account`, `secondaryStorage`, `mapProfileToUser` для hub-client. Коммиты `3649f19`, `10acacd`.
- ✅ **kami/auth.ts** — 241→125 строк на `createAuth({ mode: 'hub-client' })`.
- ✅ **Кнопка Войти** — сразу редиректит на Ключницу, без промежуточной страницы. Коммит `576f00f`.
- ✅ **OIDC flow отлажен** (5 последовательных багов): `OIDC_CLIENT_ID` не в docker-compose; `nextCookies()` не последним;
  `cookies().set()` в Server Component → `OidcPendingCapture`; oidc-capture снимал OIDC params с URL → убран redirect;
  `name_is_missing` → `mapProfileToUser` fallback. Коммиты `83583af`, `35e41b0`, `557ae0f`, `6dec301`, `10acacd`.
- ✅ **auth-hub** — все фиксы задеплоены; OIDC flow работает end-to-end.
- **Зависимости:** Этап **1.5** ✅; Этап 1 ✅.
- ⏳ **Проверка OIDC refresh на проде** — убедиться что refresh_token сохраняется в `account` после первого входа.
- ✅ **Этап 6.51 — RP-initiated logout ✅ ПОЛНОСТЬЮ (2026-06-06, сессия №23):** `createLogoutAction` расширен `OidcLogoutOptions`;
  после `signOut()` → редирект на `https://auth.letar.best/api/auth/oauth2/endsession?client_id=...&post_logout_redirect_uri=...`;
  auth-hub удаляет oauthAccessTokens + сессию → реальный выход. `id_token_hint` не нужен — `client_id` достаточен по spec.
  Все 6 hub-client приложений обновлены (kami `.env` создан + `auth.actions.ts`; animatrona-tracker `.env` + `auth.actions.ts`;
  archetest/grandslamcup/time/dashboard — код уже был с предыдущих сессий). `BETTER_AUTH_OIDC_ISSUER=https://auth.letar.best`
  добавлен в `.env.docker` всех 6. Задеплоено BlackCove (s1: kami ✅; s2: animatrona-tracker/dashboard/archetest/grandslamcup/time ✅).

✅ **Этап 6.5.1 — UX passkeys ✅ ПОЛНОСТЬЮ (2026-06-06, сессия №24):** commit `812d518`, деплой у BlackCove.

✅ **Этап 6.6 — Telegram-авторизация ✅ ПОЛНОСТЬЮ (2026-06-08, сессия №25):** commit `461abde`, деплой запрошен у BlackCove.
Реализовано: `telegramPlugin()` (BA-плагин), таблица `telegramToken`, кнопка `TelegramSignInButton` на /sign-in.
После деплоя: добавить `TELEGRAM_BOT_TOKEN/USERNAME/WEBHOOK_SECRET` в `.env.docker`, зарегистрировать webhook.

**Следующий шаг на тот момент (2026-06-08, исторический):** Этап 7 (driving-school на общую
библиотеку) или Этап 8.5 (Mini App-кабинет) — оба закрыты к 2026-07-28, см. блок СТАТУС.

### Этап 6.5 — Passkeys / WebAuthn ✅ инфраструктура (2026-06-05, сессия №21) + ✅ UX (Этап 6.5.1, сессия №24)

- **Реализовано:** кастомный `passkeyPlugin()` (@simplewebauthn/server v13) для auth-hub; таблица `passkey`;
  компоненты `PasskeySignInButton` / `PasskeyRegisterButton`; кнопка на /sign-in. Задеплоено BlackCove ✅.
- **Passkey не заменяет email** — fallback при смене устройства остаётся.
- **rpID** = `letar.best`, **origin** = `https://auth.letar.best`. HTTPS ✅.

#### 🔴 Текущие проблемы (обнаружены после деплоя)

1. **"Не удалось получить параметры входа"** — `authenticate/options` возвращает ошибку когда в БД 0 passkeys.
   Надо: возвращать `allowCredentials: []` → браузер переходит в **discoverable credential flow** (resident key).
2. **Кнопка показывается всем** — при клике без зарегистрированного passkey → ошибка вместо внятного сообщения.
3. **Нет пути регистрации** — `PasskeyRegisterButton` создан, но нигде не встроен в UI (нет в профиле/настройках).

#### ⏳ Этап 6.5.1 — UX passkeys: правильное поведение как у GitHub/Google

> **Источники:** [web.dev conditional UI](https://web.dev/articles/passkey-form-autofill),
> [WebAuthn W3C Level 3](https://www.w3.org/TR/webauthn-3/), Google passkey UX guidelines.

**Ключевой инсайт:** GitHub/Google **не показывают кнопку** — браузер сам предлагает passkey
в дропдауне автозаполнения поля email. Это называется **Conditional UI** (`mediation: 'conditional'`).
Явная кнопка нужна только как fallback для браузеров без Conditional UI.

##### Шаг A — Починить сервер (быстрый фикс)

```typescript
// plugin.ts: passkeyAuthOptions
// Всегда возвращать 200 с options, даже если passkeys = 0
// allowCredentials: [] → discoverable/resident key flow
const options = await generatePasskeyAuthenticationOptions(passkeys) // passkeys может быть []
return ctx.json(options)
// Убрать throw/error, только return ctx.json(options)
```

##### Шаг B — Conditional UI (главная фича, «как GitHub»)

```
Что происходит с Conditional UI:
1. Страница загружается → в фоне стартует navigator.credentials.get({ mediation: 'conditional' })
2. Пользователь кликает на поле email → браузер показывает дропдаун с passkeys рядом с обычными паролями
3. Пользователь выбирает passkey → браузер показывает Touch ID / Face ID / Windows Hello
4. Сессия создана → редирект
Кнопки нет вообще. Всё бесшовно.
```

**Изменения:**

- `LoginForm`: добавить `autoComplete="username webauthn"` на поле email
- `PasskeySignInButton` → переименовать в `usePasskeyConditionalAuth` (хук)
- Хук запускается при монтировании страницы: `startAuthentication({ optionsJSON, useBrowserAutofill: true })`
- При успехе → сессия + редирект на callbackUrl
- Явная кнопка остаётся как fallback (с проверкой `PublicKeyCredential.isConditionalMediationAvailable`)

##### Шаг C — Регистрация: «Добавить passkey» после входа

Паттерн Google/Apple: **после успешного входа** (через пароль/OAuth/magic-link) → ненавязчивый
баннер внизу:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔑 Войдите быстрее в следующий раз                          │
│ Добавьте ключ доступа — Touch ID / Face ID / Windows Hello  │
│                          [Добавить]  [Не сейчас]            │
└─────────────────────────────────────────────────────────────┘
```

- Показывать **один раз** (localStorage-флаг `passkey_prompt_dismissed`)
- Не показывать если: уже есть passkey на этом устройстве / пользователь отказался
- Компонент `PasskeyPromptBanner` — появляется на `/auth/post-login` или в профиле

##### Шаг D — Управление ключами в профиле

Новая секция `/profile` или `/settings` → **«Ключи доступа»**:

```
Ключи доступа
├── MacBook Pro (Touch ID)         Добавлен 05.06.2026  [Удалить]
├── iPhone 15 Pro (Face ID)        Добавлен 05.06.2026  [Удалить]
└── [+ Добавить ключ доступа]
```

- Таблица passkeys из БД (by userId)
- Переименование (name field)
- Удаление: `DELETE /api/auth/passkey/delete` (эндпоинт нужно добавить в плагин)
- `PasskeyRegisterButton` встроить сюда

##### DoD Этапа 6.5.1 ✅ ВЫПОЛНЕНО (сессия №24, 2026-06-06)

- ✅ **A**: `authenticate/options` возвращает 200 при 0 passkeys (`allowCredentials: []` discoverable flow)
- ✅ **B**: `autocomplete="username webauthn"` на email-инпуте; хук `usePasskeyConditionalAuth`
- ✅ **B**: явная кнопка скрыта когда conditional UI доступен, показывается только как fallback
- ✅ **C**: `PasskeyPromptBanner` в `/profile` (1 показ, dismissable, localStorage)
- ✅ **D**: `/profile/passkeys` — список + добавить + удалить; ссылка в навигации профиля
- ✅ `DELETE /passkey/delete` добавлен в плагин
- ✅ typecheck ✅ lint ✅

**Зависимости:** Этап 6.5 инфраструктура ✅. Можно делать без блокеров.

- **Целевые приложения:** kami ✅, time ✅, grandslamcup ✅; archetest ❌ (разовые пользователи).
- **Зависимости оригинального этапа:** Этап 6 (kami auth) ✅.

### Этап 6.6 — Telegram-авторизация в Ключнице ✅ ПОЛНОСТЬЮ (2026-06-08, сессия №25)

- **Реализовано:** `telegramPlugin()` — кастомный BA-плагин; таблица `telegramToken`; кнопка на /sign-in.
  Флоу: сайт генерит one-time token → `t.me/<bot>?start=<token>` → START → webhook → polling → сессия.
- **Заглушка email:** `<telegramId>@telegram.local` (аналог VK `${id}@vk.com`).
- **Сейчас не было** (в auth-hub: github/google/facebook/vk/yandex/magic-link/OIDC). Добавлено.
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

### Этап 6.7 — Гео-блокировка зарубежных провайдеров для российских IP ✅ КОД (2026-06-10, сессия №29)

> **Правовой контекст:** по 149-ФЗ (ред. 2024–2025) и подзаконным актам РКН российские ресурсы обязаны ограничивать
> использование иностранных сервисов для аутентификации пользователей из РФ. Под ограничение попадают:
> Google, Facebook (Meta\*), GitHub, а также Telegram. VK, Яндекс — российские, под ограничение не попадают.

**Реализация (сессия №29):**

- `auth-hub/src/lib/geo.ts` — `getCountryCode()`: читает `x-forwarded-for` (NPM уже выставляет), lookupv через `geoip-lite` (MaxMind GeoLite2 бандлится в пакете, без внешних API и без изменений NPM).
- `sign-in/page.tsx` — Server Component: фильтрует `google/github/facebook` из OAuth-провайдеров, скрывает `TelegramSignInButton` для RU-IP. Fallback: нет заголовка → показывать всё.
- `oauth-buttons.tsx` — принимает проп `providers` (раньше хардкод).
- Passkeys оставлены доступными — локальный механизм без иностранного сервиса.
- typecheck ✅ lint ✅. commit `b80de69`. Деплой запрошен BlackCove (msg #754).

**Не реализовано (опционально):**

- ⏳ `proxy.ts` блокировка `/api/auth/callback/{google,facebook,github}` для RU-IP — UI-мера достаточна, API-эндпоинты остаются (обход через прямой запрос теоретически возможен).
- ⏳ NPM-уровень (`X-Country-Code` через `ngx_http_geoip2_module`) — требует пересборки NPM-образа, не даёт преимущества над текущим решением.

**DoD:**

- ✅ `/sign-in` скрывает Google/Facebook/GitHub/Telegram для RU-IP
- ✅ Для dev-окружения показывается всё (нет заголовка → fallback)
- ⏳ `proxy.ts` блокировка API-эндпоинтов (опционально, не блокирует)
- N/A GeoIP2 заголовок через NPM — заменено `geoip-lite` (лучше)

**Зависимости:** Этапы 6.5, 6.6 ✅.

### Этап 6.8 — Тираж `UserMenu` из `@letar/ui` на все приложения ✅ ПОЛНОСТЬЮ (сессии №37–39)

> Компонент создан в сессии №37 (animatrona-tracker — эталон). Нужно заменить самодельные
> кнопки/меню пользователя в остальных hub-client приложениях.

**Hub-client приложения (OIDC через Ключницу):**

| Приложение         | Текущее решение          | Статус        |
| ------------------ | ------------------------ | ------------- |
| animatrona-tracker | разрозненные элементы    | ✅ сессия №37 |
| kami               | своё меню / кнопка Войти | ✅ сессия №38 |
| dashboard-agent    | backend Express (нет UI) | ✅ не нужно   |
| grandslamcup       | своё меню / кнопка Войти | ✅ сессия №38 |
| archetest          | своё меню / кнопка Войти | ✅ сессия №38 |
| time               | своё меню / кнопка Войти | ✅ сессия №38 |

**Standalone приложения (при наличии хедера с авторизацией):**

| Приложение      | Примечание                                                      | Статус        |
| --------------- | --------------------------------------------------------------- | ------------- |
| aboi            | своя авторизация + хедер                                        | ✅ сессия №39 |
| dsperevod       | landing, нет auth в хедере                                      | ✅ N/A        |
| premium-rosstil | собственный UserMenuClient (i18n + colorPalette=fg)             | ✅ N/A        |
| svoichuzhie     | самодельные auth-кнопки в header.tsx                            | ✅ сессия №46 |
| domwellbes      | своя пара кнопок «Кабинет»/«Выйти» без dropdown                 | ✅ 2026-08-14 |
| driving-school  | локальный `user-menu.tsx` в лендинг-хедере (удалён)             | ✅ 2026-08-14 |
| mandala         | двуязычно (ru/en, next-intl) — `UserMenu` получил проп `labels` | ✅ 2026-08-14 |

> ⚠️ Аудит 2026-08-14 нашёл эти три приложения пропущенными в прошлом тираже — таблица была
> отмечена «✅ ПОЛНОСТЬЮ» преждевременно. `grandslamcup` из таблицы выше уже был на `UserMenu`
> (сессия №38), но за собой оставил мёртвый локальный дубль `header/user-menu.tsx` — удалён той
> же сессией, поведение не менялось. Разбор всех четырёх — `.claude/docs/ui-components.md`
> § UserMenu.

**Мобильный drawer (все приложения):**

> Самодельные auth-секции в drawer'ах вынесены в `MobileAuthSection` (`@letar/ui`).
> API зеркалит `UserMenu`: session, onSignIn, onSignOut, onClose, profileHref, extraItems, showAuthHub.

| Приложение         | Статус                                  |
| ------------------ | --------------------------------------- |
| animatrona-tracker | ✅ сессия №46                           |
| grandslamcup       | ✅ сессия №46                           |
| archetest          | ✅ сессия №46                           |
| svoichuzhie        | ✅ сессия №46                           |
| kami               | ✅ N/A (нет auth в mobile drawer)       |
| time               | ✅ N/A (UserMenu в toolbar, нет drawer) |

**Паттерн замены (эталон — animatrona-tracker/header.tsx):**

```tsx
import { UserMenu } from '@letar/ui'
<UserMenu
  session={session?.user ?? null}
  onSignIn={() => signInWithLetarAuth(pathname)} // hub-client
  onSignOut={() => signOut()}
  profileHref="/profile"
  extraItems={isAdmin ? [{ value: 'admin', label: 'Админ', href: '/admin', icon: LuSettings }] : []}
/>
```

**DoD:** во всех приложениях из таблицы хедер использует `UserMenu`; поведение «Войти» одинаково — прямой OIDC без промежуточной страницы.

**Зависимости:** `@letar/ui` ✅ (сессия №37). Не блокирует другие этапы — можно делать итерационно.

### Этап 6.9 — Подвал «Сделано в studio.letar.best» на всех сайтах ✅ (2026-06-26)

> **Цель:** кросс-промо студии — каждый публичный сайт монорепо указывает в футере, что сделан в
> [studio.letar.best](https://studio.letar.best), со ссылкой. Трафик на студию + живое портфолио.

- **Общий компонент `StudioCredit` в `@letar/ui`** (по образцу `CookieBanner`/`UserMenu`, сессии №30/№37):
  текст «Сделано в studio.letar.best» + ссылка; пропсы: вариант текста, размер/тон под тему приложения
  (в футере обычно `fg.muted`).
- **Ссылка с UTM:** `https://studio.letar.best/?utm_source=<app>` — переходы видны в Umami студии.
  Обычный dofollow `<a>`, `target="_blank" rel="noopener"`.
- **Охват (публичные сайты):**

| Группа                         | Приложения                                                                         | Примечание                                     |
| ------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| Петы `*.letar.best`            | kami, grandslamcup, time, archetest, mandala, pravda, animatrona-landing, auth-hub | без согласования                               |
| Лендинги letar                 | letar-landing, kami-key-the-landing                                                | решить: нужен ли self-credit на letar.best     |
| Коммерческий (ИП владельца)    | driving-school                                                                     | оператор тот же — без внешнего согласования    |
| Коммерческие (чужие владельцы) | aboi, dsperevod, svoichuzhie                                                       | **согласовать с владельцами** + submodule-флоу |

> ➖ `premium-rosstil`, `imot` исключены из охвата — выведены из эксплуатации (2026-07-05).

Полный список уточнить по `nx show projects` при реализации; приложения без публичного UI
(dashboard-agent и т.п.) — N/A.

- **✓ DoD:** компонент в `@letar/ui`; каждый сайт из охвата показывает credit-ссылку либо обоснованный N/A;
  для submodules — коммит внутри + bump SHA; UTM-переходы фиксируются в Umami.
- **Зависимости:** нет (UI-тираж, можно итерационно — как Этап 6.8).

### Этап 6.10 — Версия сборки в подвале на всех сайтах ✅ (2026-06-26)

> **Цель:** в футере каждого приложения показывать версию сборки из его `package.json` (`version`).
> Упрощает диагностику («какая версия сейчас на проде?»), привязывает баг-репорты к релизу, видно при
> деплое что выкатилась нужная сборка.

- **Общий компонент `BuildVersion` в `@letar/ui`** (по образцу `StudioCredit`/`UserMenu`):
  принимает версию пропсом (`version: string`), рендерит ненавязчивый текст (`v{version}`, тон `fg.subtle`,
  `fontSize="xs"`); опционально — короткий git-SHA и дата сборки.
- **Источник версии (решить при реализации):** `version` из `package.json` приложения. В Next.js не читать
  `package.json` в рантайме на клиенте — пробросить через `next.config.mjs` `env`/`NEXT_PUBLIC_APP_VERSION`
  (билд-тайм inline) либо серверный импорт `package.json` в layout/footer (Server Component). Выбрать единый
  паттерн и задокументировать в `.claude/docs/ui-components.md`.
- **Размещение:** рядом со `StudioCredit` (Этап 6.9) — оба в общий футер-блок, чтобы тираж шёл одной правкой layout.
- **Охват:** все приложения с публичным UI (тот же список что Этап 6.9 + петы). Без UI (dashboard-agent) — N/A.
- **✓ DoD:** компонент в `@letar/ui`; версия читается из `package.json` через единый билд-тайм-механизм;
  каждый сайт из охвата показывает версию в футере; для submodules — коммит внутри + bump SHA; паттерн
  проброса версии задокументирован в `ui-components.md`.
- **Зависимости:** нет (UI-тираж, итерационно — как Этап 6.8/6.9). Удобно делать вместе с Этапом 6.9 (один футер).

### Этап 6.11 — Pressable-компоненты в `@letar/ui` + тираж ✅ ПОЛНОСТЬЮ (добавлен 2026-06-20)

> **Цель:** единый тач-фидбек во всём монорепо. На тач-устройствах — spring-анимация (CSS-only, без JS).
> На десктопе — position-aware ripple от точки клика (GPU-анимация, ноль re-renders на тач).

**Что идёт в `@letar/ui`:**

- **`Pressable`** — Box-обёртка с `data-pressable`, `overflow: hidden`, `useRipple` + `RippleEl` для ripple на мыши.
- **`useRipple` + `RippleEl`** — экспортируются отдельно для кастомных композиций.
- **`Button`** (именованный экспорт, не конфликт с Chakra) — Chakra Button + встроенный ripple.
  Используется для `onClick`-кнопок (SignIn, формы). **Не поддерживает `asChild`** — для Link-кнопок → `AppLink`.
- **`ExternalLink`** — `Pressable + IconButton asChild + <a target="_blank" rel="noopener noreferrer">`.
  Для иконок соцсетей и внешних ссылок. Принимает `href`, `aria-label`, `size`, `variant`.
- **`pressableConfig`** — объект `{ keyframes, globalCss }` для мержа в `defineConfig()` каждого приложения:
  кейфрейм `ripple-expand` + глобальный CSS для `[data-pressable]` (spring + touch-action).

**Что остаётся в каждом приложении (`_components/ui/app-link.tsx`, ~12 строк):**

- **`AppLink`** — тонкая обёртка: `Pressable + Chakra Button asChild + app-специфичный Link из next-intl`.
  Зависит от `@/i18n/navigation` — не может жить в `@letar/ui`. Для приложений без next-intl → используют Pressable + нативный `<a>`.

**iOS-фикс (один раз в провайдере/layout):**

```tsx
useEffect(() => {
  document.addEventListener('touchstart', () => {}, { passive: true })
}, [])
```

**Тираж по приложениям** (после реализации `@letar/ui`):

| Приложение             | Затронутые места                                           |
| ---------------------- | ---------------------------------------------------------- |
| **kami**               | ✅ nav-links, sign-in-button, mobile-menu, social-links    |
| **aprel8008**          | ✅ CTA, nav                                                |
| **grandslamcup**       | ✅ desktop-nav, mobile-drawer, footer кнопки, StudioCredit |
| **archetest**          | ✅ mobile-drawer nav items                                 |
| **driving-school**     | ✅ BottomNav items                                         |
| **aboi**               | ✅ pressableConfig + iOS-фикс                              |
| **animatrona-tracker** | ✅ pressableConfig + iOS-фикс                              |
| **dsperevod**          | ✅ pressableConfig + iOS-фикс                              |
| **premium-rosstil**    | ✅ pressableConfig + iOS-фикс                              |
| **time**               | ✅ pressableConfig + iOS-фикс                              |
| **synth**              | ✅ pressableConfig + iOS-фикс                              |
| **studio**             | при готовности                                             |

**✓ DoD:**

- [x] `@letar/ui` экспортирует `Pressable`, `useRipple`, `RippleEl`, `PressableButton`, `ExternalLink`, `pressableConfig` (v0.5.0)
- [x] kami полностью переведён (`Button`/`AppLink`/`ExternalLink` применены: nav-links, sign-in-button, mobile-menu, social-links, projects/page, hero)
- [x] `pressableConfig` задокументирован в `.claude/docs/ui-components.md` (как добавить в тему)
- [x] Тираж на все приложения монорепо (11/11 ✅, кроме studio — при готовности)
- [x] Версия `@letar/ui` поднята (0.3.0 → 0.5.0)

**Зависимости:** нет (UX-улучшение, итерационно).

#### Этап 6.11.1 — `pressScale`: общая шкала глубины `_active` ✅ (добавлен 2026-08-19)

Отдельно от `pressableConfig` (глубина ripple-поверхности) — шкала именованных шагов `scale(...)`
для `_active` кнопок/ссылок/интерактивных элементов recipe, вынесенная из эталона domwellbes
(`src/theme/press.ts`) в `libs/ui/src/lib/press-scale.ts` (`pressScale` + `PressDepth`, экспорт
из `@letar/ui`, v0.15.0). Обычная константа, не Chakra-токен — в `TokenCategory` v3 нет категории
для `transform`. Готовые строки под `as const`, не числа/функция — функция ломает
`defineLayerStyles`. `pressableConfig.globalCss` не разливается автоматически — решение
domwellbes не трогалось.

Тираж (независимо, разными сессиями в один день): domwellbes (эталон), driving-school,
aprel8008, grandslamcup. Мелкие поверхности (icon-button, checkbox/radio, tag close-trigger,
slider thumb) осознанно оставлены вне шкалы — она рассчитана на кнопки/ссылки, для более мелких
или растущих (`> 1`) поверхностей нужно заметнее проседание — расхождение задокументировано
JSDoc на месте в каждом recipe.

**✓ DoD:**

- [x] `pressScale`/`PressDepth` в `@letar/ui` (`libs/ui/src/lib/press-scale.ts`), тесты, README
- [x] domwellbes, driving-school, aprel8008, grandslamcup переведены на общую шкалу
- [x] studio ещё не имеет темы с `_active`-лестницей — переносить нечего, не блокер

### Этап 7 — driving-school: на общую библиотеку ✅ ПОЛНОСТЬЮ (2026-06-11, сессия №32)

- ✅ `auth.ts` мигрирован на `createAuth({ mode: 'standalone' })` (~607→~330 строк); `@letar/auth`
  расширен полями `socialProviders`, `databaseHooks`, `password` (v0.5.0→v0.6.0); `magicLink` плагин BA.
  Детали — `apps/driving-school/PLAN_COMPLETED.md`.
- **Зависимости:** Этапы 1, 5, **1.5** ✅.
