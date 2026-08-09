/**
 * Параметры для интерполяции в сообщениях об ошибках
 * @example { minimum: 5, maximum: 100 }
 */
export type TranslateParams = Record<string, string | number | boolean | undefined>

/**
 * Функция перевода (совместима с next-intl useTranslations)
 * @param key - Ключ перевода в формате "ModelName.fieldName.property"
 * @param params - Опциональные параметры для интерполяции
 * @returns Переведённая строка или fallback
 */
export type TranslateFunction = (key: string, params?: TranslateParams) => string
