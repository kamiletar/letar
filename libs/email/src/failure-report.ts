/**
 * Централизованный репорт провалов отправки email (Этап 0 плана auth-унификации).
 *
 * Первопричина инцидента — письма «молча не доходили», т.к. результат отправки
 * (`SendEmailResult.success === false`) игнорировался. Здесь — единая точка, которая
 * пишет структурную строку в лог (видно в `docker logs`) и опционально дёргает
 * внешний алертер (Telegram/Umami — §13.4 B+C).
 *
 * ⚠️ Сами интеграции (Telegram-webhook, Umami event) подключаются в инфра-сессии.
 * По умолчанию алертер не задан (пустой = отключено), поведение API не ломается.
 */

export interface EmailFailureInfo {
  /** Тип письма: 'verification' | 'password-reset' | 'magic-link' | 'invitation' | … */
  type: string
  /** Получатель */
  to: string
  /** Текст ошибки SMTP/транспорта */
  error: string
}

export type EmailFailureAlerter = (info: EmailFailureInfo) => void | Promise<void>

let alerter: EmailFailureAlerter | null = null

/**
 * Регистрирует опциональный внешний алертер провалов отправки (Telegram/Umami).
 *
 * Передайте `null`, чтобы отключить. Вызовите один раз при инициализации приложения.
 * Дебаунс/пороги (напр. «3 подряд провала одного типа») — ответственность алертера.
 */
export function setEmailFailureAlerter(fn: EmailFailureAlerter | null): void {
  alerter = fn
}

/**
 * Логирует провал отправки структурной строкой и дёргает алертер (если задан).
 *
 * Формат строки: `[email] send failed {"type":"…","to":"…","error":"…"}` — парсится grep'ом.
 */
export function reportEmailFailure(info: EmailFailureInfo): void {
  console.error(`[email] send failed ${JSON.stringify(info)}`)

  if (alerter) {
    try {
      void alerter(info)
    } catch (err) {
      console.error('[email] failure alerter threw:', err)
    }
  }
}
