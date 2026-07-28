import { z } from 'zod/v4'

/**
 * Базовая схема валидации пароля
 * Требования:
 * - Минимум 8 символов
 * - Минимум 1 заглавная буква
 * - Минимум 1 строчная буква
 * - Минимум 1 цифра
 */
export const passwordSchema = z
  .string()
  .min(8, 'Пароль должен содержать минимум 8 символов')
  .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
  .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
  .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру')

/**
 * Усиленная схема валидации пароля с требованием спецсимвола
 * Требования:
 * - Минимум 8 символов
 * - Минимум 1 заглавная буква
 * - Минимум 1 строчная буква
 * - Минимум 1 цифра
 * - Минимум 1 спецсимвол
 *
 * Используется в: driving-school
 */
export const strongPasswordSchema = z.preprocess(
  (val) => (val === undefined || val === null ? '' : val),
  z
    .string()
    .min(1, 'Введите пароль')
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
    .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру')
    .regex(/[^A-Za-z0-9]/, 'Пароль должен содержать хотя бы один спецсимвол')
)

/**
 * Хелпер для добавления проверки подтверждения пароля
 *
 * @param schema - базовая схема объекта с полями password и confirmPassword
 * @param passwordField - название поля с паролем (по умолчанию 'password')
 * @param confirmPasswordField - название поля подтверждения (по умолчанию 'confirmPassword')
 * @returns схема с добавленной проверкой совпадения паролей
 *
 * @example
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: passwordSchema,
 *   confirmPassword: z.string(),
 * })
 *
 * const withConfirmation = withPasswordConfirmation(schema)
 */
/**
 * Хелпер для добавления проверки подтверждения пароля
 * Совместим с Zod v4
 */
export function withPasswordConfirmation<T extends z.ZodType<Record<string, unknown>>>(
  schema: T,
  passwordField = 'password',
  confirmPasswordField = 'confirmPassword'
) {
  return schema.refine((data) => data[passwordField] === data[confirmPasswordField], {
    message: 'Пароли не совпадают',
    path: [confirmPasswordField],
  })
}
