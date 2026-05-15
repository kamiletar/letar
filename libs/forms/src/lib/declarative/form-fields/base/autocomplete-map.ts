/**
 * Маппинг имени поля → HTML autocomplete атрибут.
 *
 * Автоматическое проставление autocomplete на основе имени поля
 * улучшает конверсию форм на 30% (Google) и соответствует WCAG 1.3.5.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls
 */

/** Маппинг имени поля (последний сегмент dot-path) → autocomplete значение */
const AUTOCOMPLETE_MAP: Record<string, string> = {
  // Идентификация
  email: 'email',
  'e-mail': 'email',
  username: 'username',

  // Имя
  name: 'name',
  fullName: 'name',
  full_name: 'name',
  firstName: 'given-name',
  first_name: 'given-name',
  lastName: 'family-name',
  last_name: 'family-name',
  surname: 'family-name',
  middleName: 'additional-name',
  middle_name: 'additional-name',
  patronymic: 'additional-name',

  // Телефон
  phone: 'tel',
  tel: 'tel',
  mobile: 'tel',
  telephone: 'tel',

  // Пароль
  password: 'current-password',
  newPassword: 'new-password',
  new_password: 'new-password',
  confirmPassword: 'new-password',
  confirm_password: 'new-password',

  // Адрес
  address: 'street-address',
  street: 'street-address',
  city: 'address-level2',
  state: 'address-level1',
  region: 'address-level1',
  zip: 'postal-code',
  postal: 'postal-code',
  postalCode: 'postal-code',
  postal_code: 'postal-code',
  zipCode: 'postal-code',
  zip_code: 'postal-code',
  country: 'country-name',

  // Организация
  company: 'organization',
  organization: 'organization',
  companyName: 'organization',
  company_name: 'organization',
  jobTitle: 'organization-title',
  job_title: 'organization-title',

  // Платёжные данные
  cardNumber: 'cc-number',
  card_number: 'cc-number',
  cardName: 'cc-name',
  card_name: 'cc-name',
  expiry: 'cc-exp',
  cvv: 'cc-csc',
  cvc: 'cc-csc',
}

/**
 * Определяет autocomplete атрибут для поля.
 *
 * Приоритет:
 * 1. Явный prop `autoComplete` (наивысший)
 * 2. Значение из Zod `.meta({ autocomplete: '...' })`
 * 3. Авто-определение по имени поля
 *
 * Если любой источник вернул `'off'` — автозаполнение отключается.
 *
 * @param fieldName - Имя поля (последний сегмент dot-path, без индексов массива)
 * @param metaAutocomplete - Значение из `.meta({ autocomplete })`
 * @param propAutocomplete - Явный prop autoComplete
 * @returns HTML autocomplete значение или undefined
 */
export function resolveAutoComplete(
  fieldName: string,
  metaAutocomplete?: string,
  propAutocomplete?: string
): string | undefined {
  // 1. Prop имеет наивысший приоритет
  if (propAutocomplete !== undefined) {
    return propAutocomplete
  }

  // 2. Meta override
  if (metaAutocomplete !== undefined) {
    return metaAutocomplete
  }

  // 3. Авто-определение по имени поля
  // Берём последний сегмент dot-path и убираем индексы массива
  const lastSegment = fieldName.split('.').pop() ?? fieldName
  const cleanName = lastSegment.replace(/\[\d+\]/g, '')

  return AUTOCOMPLETE_MAP[cleanName]
}
