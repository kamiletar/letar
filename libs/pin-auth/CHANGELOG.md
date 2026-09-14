# Changelog

Все изменения библиотеки @letar/pin-auth документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [0.4.0] - 2026-09-14

### Removed

- Подпуть `./email` (`formatVerificationEmail`, `formatResetPasswordEmail`) — была третья
  независимая копия шаблона PIN-письма (после `@letar/email/templates/verification.ts` и
  `password-reset.ts`). Аудитом (грепом по `apps/` и `libs/`, включая приватные submodule)
  подтверждено, что подпуть не использовал ни один потребитель — только `tsconfig.json` двух
  приложений (`mandala`, `driving-school`) держали `paths` на него впрок, без единого импорта.
  Общий кусок письма — `createPinBlock` в `libs/email/src/templates/base.ts`; отправка — через
  `sendVerificationEmail`/`sendPasswordResetEmail` из `@letar/email`.

## [0.3.0] - 2026-09-14

### Race-safe лимит попыток — `PinValidatorAdapter.reserveAttempt`

`createPinValidator().verifyPin` раньше читал `pinAttempts` из `findToken` и только потом (после
сравнения PIN) звал `incrementAttempts` — классический check-then-act. Под параллельной нагрузкой
(несколько запросов на один email одновременно) все они читали один и тот же счётчик и успевали
сравнить PIN, прежде чем хоть один инкремент применялся: `maxAttempts` не соблюдался, пачка из N
параллельных запросов давала N сравнений вместо ограничения.

**Added:**

- Новый опциональный метод адаптера `reserveAttempt(identifier): Promise<number>` — атомарно
  резервирует попытку (обязана быть compare-and-swap реализацией) и возвращает число попыток ДО
  неё. Валидатор вызывает его вместо `pinAttempts`/`incrementAttempts`, когда адаптер его
  реализует. См. README, раздел «Race-safe лимит попыток».
- Тесты в `pin-validator.spec.ts`: 20 параллельных неверных попыток с `reserveAttempt` дают не
  более `maxAttempts` сравнений PIN (interleaving CAS-фейк); без `reserveAttempt` — race-prone
  поведение задокументировано отдельным тестом (все 20 параллельных запросов проходят сравнение).

**Обратная совместимость:** `reserveAttempt` опционален. Адаптеры со старым
`incrementAttempts`-путём продолжают работать без изменений (race-prone, как и раньше) — миграция
не обязательна, но рекомендована для защиты от параллельного перебора.

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
