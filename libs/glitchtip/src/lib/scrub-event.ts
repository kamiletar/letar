// Изоморфный beforeSend — без зависимостей от @sentry/node/@sentry/browser в самой сигнатуре,
// чтобы им можно было пользоваться и на сервере, и в браузере с одинаковой логикой (PLAN-INFRA.md §70).
//
// `any` ниже — осознанный: @sentry/node и @sentry/browser держат СВОИ конкретные типы ErrorEvent
// (различаются в деталях полей типа user.ip_address: string|null vs string|undefined), а мутатор
// один и общий для обоих. Строгая структурная типизация против обоих одновременно потребовала бы
// либо дублировать функцию, либо подгонять типы под пересечение — сложнее, чем сама функция.

/**
 * Убирает из события IP пользователя и содержимое cookie/authorization-заголовков перед
 * отправкой в GlitchTip — часть приложений монорепо работает под операторами ПДн
 * (см. .claude/docs/personal-data.md), и тело ошибки не должно тащить это с собой.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scrubPii(event: any): any {
  if (event?.user) {
    delete event.user.ip_address
  }

  if (event?.request) {
    delete event.request.cookies
    if (event.request.headers) {
      delete event.request.headers.authorization
      delete event.request.headers.cookie
    }
  }

  return event
}
