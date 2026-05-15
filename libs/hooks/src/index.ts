// === Utility Hooks ===
export { useDebounce } from './lib/utility/use-debounce'
export { useLocalStorage } from './lib/utility/use-local-storage'
export { usePrevious } from './lib/utility/use-previous'
export { useThrottle } from './lib/utility/use-throttle'

// === Browser Hooks ===
export { breakpoints, useMediaQuery } from './lib/browser/use-media-query'
export { useOfflineConsent, type OfflineConsentState } from './lib/browser/use-offline-consent'
export { useOnlineStatus } from './lib/browser/use-online-status'
export { useScrollDirection, type ScrollDirection } from './lib/browser/use-scroll-direction'
export { useWindowSize, type WindowSize } from './lib/browser/use-window-size'

// === TanStack Query Hooks ===
export { useApiSuggestions, type ApiSuggestionsResult } from './lib/query/use-api-suggestions'
export { useBulkMutation } from './lib/query/use-bulk-mutation'
export { useInvalidateQueries } from './lib/query/use-invalidate-queries'
export { usePendingMutations } from './lib/query/use-pending-mutations'
