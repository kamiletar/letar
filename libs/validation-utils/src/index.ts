/**
 * @letar/validation-utils
 *
 * Централизованные валидационные схемы для всех приложений монорепозитория.
 * Использует Zod v4 для валидации форм.
 */

// Схемы паролей
export { passwordSchema, strongPasswordSchema, withPasswordConfirmation } from './lib/password'

// Общие схемы
export { emailSchema, nameSchema, requiredCheckbox, tokenSchema } from './lib/common'

// Схемы телефонов
export { phoneSchema, requiredPhoneSchema } from './lib/phone'

// Схемы денежных сумм
export { createPriceSchema, optionalPriceSchema, priceSchema } from './lib/money'
