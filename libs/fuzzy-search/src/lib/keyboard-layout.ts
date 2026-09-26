/**
 * Раскладка RU⇄EN (заповедь №17 студии). Реализация живёт в `@letar/forms-core/uikit` — Select/Combobox
 * `@letar/forms` ищут с учётом раскладки, а `forms-core` не может зависеть от этой библиотеки; здесь
 * функции реэкспортируются, чтобы публичный API `@letar/fuzzy-search` не изменился.
 */
export { correctKeyboardLayout, detectLayout } from '@letar/forms-core/uikit'
