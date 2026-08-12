/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует. Публичные пути: `@letar/forms` (root) и
 * `@letar/forms/captcha/server` (явный, Node-only — граница `no-restricted-imports`
 * в eslint.config.mjs матчит `src/server/**` и не пустит сюда React/Chakra).
 *
 * @example
 * ```ts
 * import { verifyCaptcha } from '@letar/forms/captcha/server'
 *
 * const result = await verifyCaptcha(token, {
 *   provider: 'turnstile',
 *   secretKey: process.env.TURNSTILE_SECRET_KEY!,
 * })
 * ```
 */
export { verifyCaptcha } from '@letar/forms-core/captcha'
