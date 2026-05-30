# Changelog

Все изменения библиотеки @letar/email документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

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
