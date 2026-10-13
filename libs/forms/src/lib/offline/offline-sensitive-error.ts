import { resolveStaticFormText } from '@letar/forms-core/i18n'
import type { StaticTextI18nContext } from '@letar/forms-core/i18n'
import type { OfflineSubmitErrorCode } from './types'

/** Код ошибки: форма с чувствительными полями не ставится в офлайн-очередь */
export const SENSITIVE_FIELDS_OFFLINE_CODE: OfflineSubmitErrorCode = 'sensitive-fields-offline'

/** Ключ `FormI18nProvider` для текста отказа */
export const SENSITIVE_FIELDS_OFFLINE_KEY = 'formOffline.sensitiveFieldsOffline'

const BUILTIN_TEXTS: Record<string, string> = {
  en: 'This form contains sensitive data and is not saved offline. Connect to the internet and submit again.',
  ru: 'В форме есть чувствительные данные, без сети она не сохраняется. Подключитесь к интернету и отправьте снова.',
}

/** Встроенный текст отказа по языку. Языка нет в словаре — английский. */
export function resolveSensitiveFieldsOfflineText(i18n: StaticTextI18nContext | null): string {
  return resolveStaticFormText(i18n, SENSITIVE_FIELDS_OFFLINE_KEY, (locale) => {
    const lang = locale.split('-')[0] ?? locale
    return BUILTIN_TEXTS[lang] ?? BUILTIN_TEXTS['en']!
  })
}

/**
 * Офлайн-сабмит формы с чувствительными полями (пароль, секрет `EditIntent`): очередь лежит в IndexedDB
 * открытым текстом, поэтому форма в неё не ставится. `Form` бросает эту ошибку из submit — форма не
 * сбрасывается и не считается отправленной. Различать по `code`/`instanceof`, а не по тексту.
 */
export class OfflineSensitiveFieldsError extends Error {
  readonly code: OfflineSubmitErrorCode = SENSITIVE_FIELDS_OFFLINE_CODE

  constructor(message: string) {
    super(message)
    this.name = 'OfflineSensitiveFieldsError'
  }
}
