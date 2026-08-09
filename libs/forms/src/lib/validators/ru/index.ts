/**
 * zRu — Zod-валидаторы для российских документов.
 *
 * Headless: работают без UI, можно использовать на сервере.
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы публичный путь `@letar/forms/validators/ru`
 * не менялся для потребителей.
 *
 * @example
 * ```typescript
 * import { zRu } from '@letar/forms/validators/ru'
 *
 * const CompanySchema = z.object({
 *   inn: zRu.inn(),            // 10 или 12 цифр + контрольная сумма
 *   kpp: zRu.kpp(),            // 9 символов
 *   ogrn: zRu.ogrn(),          // 13 цифр + контрольная сумма
 *   bik: zRu.bik(),            // 9 цифр, начинается с "04"
 *   account: zRu.bankAccount(), // 20 цифр
 *   snils: zRu.snils(),        // 11 цифр + контрольная сумма
 * })
 *
 * // Варианты ИНН
 * zRu.inn.legal()      // только юрлицо (10 цифр)
 * zRu.inn.individual() // только физлицо (12 цифр)
 * ```
 */

export * from '@letar/forms-core/validators/ru'
