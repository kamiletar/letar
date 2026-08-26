/**
 * Переводит Chakra-токен цвета (`"fg.muted"`, `"whiteAlpha.500"`, `"orange.500"`) в CSS custom
 * property vanilla-extract рантайма Chakra (`"var(--chakra-colors-fg-muted)"`) — точки между
 * сегментами и camelCase внутри сегмента (`whiteAlpha` → `white-alpha`) заменяются на дефис.
 *
 * Нужен там, где `Icon as={X}` заменяется на голый react-icons компонент (запрет пропа `as=` —
 * `.claude/rules/components.md`) и цвет приходится передавать не Chakra-токеном, а инлайн CSS.
 * Рецепт ручной замены — `.claude/docs/chakra-icon-as-prop-cleanup-pattern.md`.
 *
 * @example
 * ```ts
 * chakraColorVar('fg.muted') // 'var(--chakra-colors-fg-muted)'
 * chakraColorVar('whiteAlpha.500') // 'var(--chakra-colors-white-alpha-500)'
 * chakraColorVar('l1') // 'var(--chakra-colors-l1)'
 * ```
 */
export function chakraColorVar(token: string): string {
  const kebab = token
    .split('.')
    .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
    .join('-')
  return `var(--chakra-colors-${kebab})`
}
