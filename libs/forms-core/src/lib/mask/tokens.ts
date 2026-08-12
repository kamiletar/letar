import type { MaskOptions, MaskTokenMap } from './types'

/**
 * Встроенные токены модели.
 *
 * `9` — цифра, `a` — буква (латиница/кириллица), `*` — буква или цифра.
 * Пользовательские токены (свой алфавит, `transform`) добавляются через
 * `MaskOptions.customTokens` — см. госномер РФ в приёмочных тестах.
 */
export const BUILTIN_MASK_TOKENS: MaskTokenMap = {
  '9': { pattern: (char) => /[0-9]/.test(char) },
  a: { pattern: (char) => /[a-zA-Zа-яёА-ЯЁ]/.test(char) },
  '*': { pattern: (char) => /[a-zA-Zа-яёА-ЯЁ0-9]/.test(char) },
}

/** Встроенные токены + пользовательские (пользовательские не могут переопределить встроенные). */
export function resolveMaskTokens(options?: MaskOptions): MaskTokenMap {
  if (!options?.customTokens) {
    return BUILTIN_MASK_TOKENS
  }
  return { ...options.customTokens, ...BUILTIN_MASK_TOKENS }
}
