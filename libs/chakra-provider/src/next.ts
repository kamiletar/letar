/**
 * Точка входа `@letar/chakra-provider/next` — только для Next.js App Router.
 *
 * Вынесена из общего барреля: тянет `next/navigation`, а библиотеку используют и
 * Electron/Vite-рендереры, которым он не нужен.
 */
export { DarkOnlyChakraProvider, type DarkOnlyChakraProviderProps } from './lib/dark-only-chakra-provider'
export { EmotionRegistry } from './lib/emotion-registry'
