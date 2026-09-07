import type { TranslateFunction, TranslateParams } from './types'

/**
 * Встроенный словарь переводов для дефолтного Zod error map (`validation.{code}.{origin?}`).
 *
 * Отдельный от `ConstraintHintTranslations` (constraint-hints.ts) словарь: тот покрывает
 * проактивные подсказки под полем до ввода значения, этот — сообщения, которые Zod
 * реально показывает после неудачной валидации (`error.issues[0].message`). Библиотека до
 * этого файла переводила только первое — `setupZodErrorMap` без собственного `t` от
 * приложения не переводил ничего, оставляя дефолтные англоязычные сообщения Zod.
 */
const RU_ERROR_TRANSLATIONS: Record<string, string> = {
  'validation.invalid_type': 'Неверный тип данных',
  'validation.too_small': 'Значение слишком маленькое',
  'validation.too_small.string': 'Минимум {minimum} символов',
  'validation.too_small.number': 'Минимум {minimum}',
  'validation.too_small.array': 'Минимум {minimum} элементов',
  'validation.too_small.set': 'Минимум {minimum} элементов',
  'validation.too_small.date': 'Слишком ранняя дата',
  'validation.too_small.file': 'Файл слишком маленький',
  'validation.too_big': 'Значение слишком большое',
  'validation.too_big.string': 'Максимум {maximum} символов',
  'validation.too_big.number': 'Максимум {maximum}',
  'validation.too_big.array': 'Максимум {maximum} элементов',
  'validation.too_big.set': 'Максимум {maximum} элементов',
  'validation.too_big.date': 'Слишком поздняя дата',
  'validation.too_big.file': 'Файл слишком большой',
  'validation.invalid_format': 'Неверный формат',
  'validation.invalid_format.email': 'Некорректный email',
  'validation.invalid_format.url': 'Некорректный URL',
  'validation.invalid_format.uuid': 'Некорректный UUID',
  'validation.invalid_format.cuid': 'Некорректный идентификатор',
  'validation.invalid_format.cuid2': 'Некорректный идентификатор',
  'validation.invalid_format.ulid': 'Некорректный идентификатор',
  'validation.invalid_format.regex': 'Неверный формат',
  'validation.invalid_format.date': 'Некорректная дата',
  'validation.invalid_format.datetime': 'Некорректные дата и время',
  'validation.invalid_format.time': 'Некорректное время',
  'validation.invalid_format.duration': 'Некорректная длительность',
  'validation.invalid_format.ip': 'Некорректный IP-адрес',
  'validation.invalid_format.cidr': 'Некорректный CIDR',
  'validation.invalid_format.base64': 'Некорректная base64-строка',
  'validation.invalid_format.base64url': 'Некорректная base64url-строка',
  'validation.invalid_format.json_string': 'Некорректный JSON',
  'validation.invalid_format.e164': 'Некорректный номер телефона',
  'validation.invalid_format.jwt': 'Некорректный JWT',
  'validation.invalid_format.emoji': 'Ожидался один эмодзи',
  'validation.invalid_format.nanoid': 'Некорректный идентификатор',
  'validation.invalid_format.guid': 'Некорректный GUID',
  'validation.invalid_format.lowercase': 'Должно быть в нижнем регистре',
  'validation.invalid_format.uppercase': 'Должно быть в верхнем регистре',
  'validation.invalid_value': 'Недопустимое значение',
  'validation.invalid_union': 'Значение не соответствует ни одному из вариантов',
  'validation.invalid_key': 'Некорректный ключ',
  'validation.invalid_element': 'Некорректный элемент',
  'validation.unrecognized_keys': 'Неизвестные поля: {keys}',
  'validation.not_multiple_of': 'Должно быть кратно {multipleOf}',
  'validation.custom': '{message}',
}

const EN_ERROR_TRANSLATIONS: Record<string, string> = {
  'validation.invalid_type': 'Invalid data type',
  'validation.too_small': 'Value is too small',
  'validation.too_small.string': 'Minimum {minimum} characters',
  'validation.too_small.number': 'Minimum {minimum}',
  'validation.too_small.array': 'Minimum {minimum} items',
  'validation.too_small.set': 'Minimum {minimum} items',
  'validation.too_small.date': 'Date is too early',
  'validation.too_small.file': 'File is too small',
  'validation.too_big': 'Value is too big',
  'validation.too_big.string': 'Maximum {maximum} characters',
  'validation.too_big.number': 'Maximum {maximum}',
  'validation.too_big.array': 'Maximum {maximum} items',
  'validation.too_big.set': 'Maximum {maximum} items',
  'validation.too_big.date': 'Date is too late',
  'validation.too_big.file': 'File is too big',
  'validation.invalid_format': 'Invalid format',
  'validation.invalid_format.email': 'Invalid email',
  'validation.invalid_format.url': 'Invalid URL',
  'validation.invalid_format.uuid': 'Invalid UUID',
  'validation.invalid_format.regex': 'Invalid format',
  'validation.invalid_format.date': 'Invalid date',
  'validation.invalid_format.datetime': 'Invalid date and time',
  'validation.invalid_format.time': 'Invalid time',
  'validation.invalid_format.ip': 'Invalid IP address',
  'validation.invalid_value': 'Invalid value',
  'validation.invalid_union': "Value doesn't match any of the expected variants",
  'validation.invalid_key': 'Invalid key',
  'validation.invalid_element': 'Invalid element',
  'validation.unrecognized_keys': 'Unrecognized keys: {keys}',
  'validation.not_multiple_of': 'Must be a multiple of {multipleOf}',
  'validation.custom': '{message}',
}

const BUILTIN_ERROR_TRANSLATIONS: Record<string, Record<string, string>> = {
  ru: RU_ERROR_TRANSLATIONS,
  en: EN_ERROR_TRANSLATIONS,
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}

/**
 * Строит `TranslateFunction` из встроенного словаря (ru/en) по коду локали.
 *
 * Ведёт себя как next-intl без перевода: возвращает сам ключ, если для него нет записи —
 * `createFormErrorMap` это распознаёт (см. `tryTranslate`) и откатывается на дефолтное
 * сообщение Zod.
 */
export function createBuiltinTranslateFunction(locale: string): TranslateFunction {
  const lang = locale.split('-')[0] ?? locale
  const dict = BUILTIN_ERROR_TRANSLATIONS[lang] ?? BUILTIN_ERROR_TRANSLATIONS.ru!

  return (key: string, params?: TranslateParams): string => {
    const template = dict[key]
    return template === undefined ? key : interpolate(template, params)
  }
}

/** Локали, для которых есть встроенный словарь сообщений валидации. */
export const BUILTIN_ERROR_TRANSLATION_LOCALES = Object.keys(BUILTIN_ERROR_TRANSLATIONS)
