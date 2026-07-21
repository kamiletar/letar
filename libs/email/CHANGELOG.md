# Changelog

Все изменения библиотеки @letar/email документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

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
