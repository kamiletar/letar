# Changelog

Все изменения библиотеки @letar/email документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [0.7.0] - 2026-09-14

### Added

- `resetUrl` в `PasswordResetEmailParams` стал опциональным — письмо сброса пароля теперь можно
  отправить только кодом, без ссылки (нужен `resetUrl` или `pin`, можно оба сразу).
  `createPasswordResetEmailHtml`/`Text` рендерят кнопку/ссылку только при наличии `resetUrl`; без
  него — предупреждение «Никому не передавайте этот код» вместо предупреждения про ссылку.
- Runtime-инвариант в `sendVerificationEmail`/`sendPasswordResetEmail` — обе функции бросают
  `Error`, если не передано ни `verificationUrl`/`resetUrl`, ни `pin`. Раньше отсутствие обоих
  тихо давало письмо без единого способа подтвердить действие.
- Тесты (`service.spec.ts`, новый; `templates/pin-expiry.spec.ts`, расширен): оба инварианта и
  code-only режим `sendPasswordResetEmail` покрыты.

Завершает Фазу 0.1 плана `apps/auth-hub/PLAN_EMAIL_CODE.md` — resetUrl-необязательность и
throw-инвариант были намеренно оставлены открытыми в 0.6.0.

## [0.6.0] - 2026-09-14

### Added

- `pinExpiresInMinutes` в `VerificationEmailParams`/шаблоне верификации — срок PIN-кода в письме
  подтверждения email раньше был зашит литералом (`createPinBlock(pin, 10, ...)` и «Код
  действителен 10 минут» в text-версии), параметра не было вовсе. Дефолт 10 минут сохранён.
- `expiresInMinutes` в `PasswordResetEmailParams` — сам шаблон (`password-reset.ts`) уже принимал
  этот параметр и использовал его и для срока ссылки, и для срока PIN-кода, но публичный тип
  `sendPasswordResetEmail` его не объявлял, так что передать снаружи было нельзя. Дефолт 60 минут
  сохранён.
- Тесты (`templates/pin-expiry.spec.ts`): срок кода попадает и в HTML, и в text-версию обоих
  писем при дефолте и при явном значении.

Найдено при своде трёх независимых копий письма с PIN-кодом (`@letar/email`,
`@letar/pin-auth/email`) — вторая копия удалена, см. `libs/pin-auth/CHANGELOG.md` 0.4.0.

### Security

- Обновлён `nodemailer` `^6.9.16` → `^9.1.1` (и `@types/nodemailer` до `^8.0.1`, синхронно с
  корнем) — устраняет 8 уязвимостей (2 high, 5 moderate, 1 low), включая SSRF/произвольное чтение
  файлов через message-level `raw` option (GHSA-p6gq-j5cr-w38f). API (`createTransport`,
  `sendMail`, тип `Transporter`) не менялся — правка без изменений в `provider.ts`.

## [0.5.0] - 2026-08-22

### Добавлена `withImapDeadline` — общий helper жёсткого дедлайна для `ImapFlow`

`dashboard-agent` (email-canary) и `domwellbes` (RFQ email-поллинг) независимо реализовали
почти одинаковый приём: слушатель `'error'` у `ImapFlow` (иначе необработанный event роняет весь
процесс) + внешний `Promise.race` с жёстким таймаутом (иначе `await` может повиснуть навсегда,
если ошибка сокета пришла ВМЕСТО reject-а уже начатого вызова) + безусловный `client.close()`
после гонки. Разбор ловушки — `.claude/docs/imapflow-error-listener-hang-pitfall.md`.

Вынесено с сохранением специфики каждого вызывающего места (что считается результатом по
таймауту, форма самой IMAP-операции) — helper берёт на себя только механику дедлайна.

**Added:**

- `withImapDeadline<T>(client, work, opts: { timeoutMs, onTimeout })` — оборачивает любую
  операцию над уже созданным (но не подключённым) `ImapFlow`-клиентом.
- `imapflow` — новая прямая зависимость библиотеки (тип `ImapFlow` в сигнатуре).

## [0.4.0] - 2026-08-11

### Добавлена `sendLeadNotification` — общая рассылка о новой заявке (Lead)

`studio` и `domwellbes` независимо реализовали почти одинаковое письмо «Новая заявка» после
создания Lead (заголовок, приветствие, имя/контакты/сообщение, кнопка «Открыть заявки», подвал).
Вынесено в библиотеку с сохранением архитектурной границы: функция принимает уже готовый список
email-адресов получателей (`to: string[]`), а не сама решает, кого искать в БД — у `studio` это
один `OWNER` по полю `role`, у `domwellbes` — несколько ролей по массиву `roles`, это специфика
схемы каждого приложения.

**Added:**

- `sendLeadNotification(params, branding?)` — рассылает `params.to` параллельно, ошибка одного
  получателя не прерывает остальных (каждое письмо гасит исключение самостоятельно)
- `LeadNotificationParams`, `LeadContact` — публичные типы

## [0.3.0] - 2026-07-22

### Добавлена поддержка `bcc` в `SendEmailParams`

Понадобилось `dashboard-agent`'у для канареечного мониторинга доставки (Этап 0.7) — одно письмо
проверяет сразу internal- и external-ногу через скрытую копию. `createEmailProvider().sendEmail()`
теперь принимает опциональный `bcc?: string`; при явном `envelope` (IDN-домены отправителя) `bcc`
корректно продублирован в `envelope.to`, иначе получатель скрытой копии молча не получил бы письмо.
Обратно совместимо — поле опционально, существующие вызовы не затронуты.

## [0.2.0] - 2026-05-30

### Централизованный репорт провалов отправки (Этап 0 auth-унификации)

Первопричина инцидента — письма «молча не доходили», т.к. `SendEmailResult.success === false`
игнорировался. Введена единая точка логирования провалов.

**Added:**

- `reportEmailFailure(info)` — структурный лог провала: `[email] send failed {"type","to","error"}`
  (видно в `docker logs`, парсится grep'ом)
- `setEmailFailureAlerter(fn)` — регистрация опционального внешнего алертера (Telegram/Umami, §13.4 B+C);
  пустой = отключено, сами интеграции подключаются в инфра-сессии
- `EmailFailureInfo`, `EmailFailureAlerter` — публичные типы
- `vitest.config.ts` + `failure-report.spec.ts` (4 теста)

**Changed:**

- `SendEmailParams` получил опциональное поле `meta.type` (тип письма для лога)
- Провайдер при SMTP-сбое вызывает `reportEmailFailure` вместо разрозненного `console.error`
- Все сервис-функции (`sendVerificationEmail`, `sendPasswordResetEmail`, `sendMagicLinkEmail`,
  `sendInvitationEmail`, `sendStudentActivationEmail`, `sendGenericEmail`) пробрасывают `meta.type`
