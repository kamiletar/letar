# Changelog

Все изменения библиотеки @letar/pin-auth документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [0.2.1] - 2026-08-19

### Refactor: `useVerificationStream` на общем `useEventSource`

`useVerificationStream` переведён с ручного `new EventSource(...)` на `useEventSource` из
`@letar/hooks` — устраняет дублирование логики переподключения, поведение не изменилось
(`reconnect: 'none'`, закрытие соединения при получении `verified`).

## [0.2.0] - 2026-05-30

### Security hardening (Этап 1 auth-унификации)

**Security:**

- **Timing-safe сравнение PIN (§13.2):** `pin-validator.ts` использует `crypto.timingSafeEqual`
  вместо строкового `!==` — защита от timing-атак. Корректно обрабатывает `pin === null`.
- **SSE streamToken вместо email в URL (§13.1):** `token-manager.ts` генерирует непубличный
  `streamToken` (передаётся в адаптер `createToken`), а `useVerificationStream` принимает его
  и использует вместо email в URL потока — закрывает enumeration чужих email.
  Email-путь сохранён для обратной совместимости (предпочтителен `streamToken`).
- **Single-use авто-логин токен (§13.8):** усилён контракт `PinValidatorAdapter.updateTokenForAutoLogin` —
  обязательна атомарная замена (delete+create) и одноразовость токена (док. + типы).
  Полная enforcement (`used`-флаг на стороне потребителя) — при cutover driving-school (Этап 7).

**Added:**

- `project.json`, `vitest.config.ts`, `tsconfig.spec.json` — тест-инфраструктура (ранее отсутствовала)
- Тесты: `pin-validator.spec.ts` (7), `token-manager.spec.ts` (4)

**Changed:**

- `TokenManagerAdapter.createToken` принимает поле `streamToken` (старые адаптеры игнорируют — обратная совместимость)
- `ResendPinResult` / `createVerificationToken` возвращают `streamToken`
- `UseVerificationStreamConfig.email` теперь опционален; добавлен `streamToken`
