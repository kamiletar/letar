/**
 * zRu — Zod-валидаторы для российских документов.
 *
 * Headless: работают без UI, можно использовать на сервере.
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

import {
  bankAccountSchema,
  bankAccountWithBikSchema,
  corrAccountSchema,
  corrAccountWithBikSchema,
} from './bank-account'
import { bikSchema } from './bik'
import { innIndividualSchema, innLegalSchema, innSchema } from './inn'
import { kppSchema } from './kpp'
import { ogrnipSchema, ogrnSchema } from './ogrn'
import { passportSchema } from './passport'
import { snilsSchema } from './snils'

export const zRu = {
  /** ИНН (10 или 12 цифр) */
  inn: Object.assign(() => innSchema(), {
    /** ИНН юрлица (10 цифр) */
    legal: () => innLegalSchema(),
    /** ИНН физлица (12 цифр) */
    individual: () => innIndividualSchema(),
  }),
  /** КПП (9 символов) */
  kpp: () => kppSchema(),
  /** ОГРН (13 цифр) */
  ogrn: () => ogrnSchema(),
  /** ОГРНИП (15 цифр) */
  ogrnip: () => ogrnipSchema(),
  /** БИК (9 цифр) */
  bik: () => bikSchema(),
  /** Расчётный счёт (20 цифр), опционально с проверкой по БИК */
  bankAccount: (bikValue?: string) => (bikValue ? bankAccountWithBikSchema(bikValue) : bankAccountSchema()),
  /** Корр. счёт (20 цифр, начинается с "301"), опционально с проверкой по БИК */
  corrAccount: (bikValue?: string) => (bikValue ? corrAccountWithBikSchema(bikValue) : corrAccountSchema()),
  /** СНИЛС (11 цифр) */
  snils: () => snilsSchema(),
  /** Паспорт (серия + номер, 10 цифр) */
  passport: () => passportSchema(),
}

// Re-export для прямого использования
export { validateBankAccountWithBik } from './bank-account'
export { validateBik } from './bik'
export { validateInn10, validateInn12 } from './inn'
export { validateKpp } from './kpp'
export { validateOgrn, validateOgrnip } from './ogrn'
export { validatePassport } from './passport'
export { validateSnils } from './snils'
