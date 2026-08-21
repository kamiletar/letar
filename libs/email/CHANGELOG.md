# Changelog

Все изменения библиотеки @letar/email документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

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
