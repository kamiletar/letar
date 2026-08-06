// === Utility Hooks ===
export { useDebounce } from './lib/utility/use-debounce'
export { useLocalStorage } from './lib/utility/use-local-storage'
export { usePrevious } from './lib/utility/use-previous'
export { useThrottle } from './lib/utility/use-throttle'

// === Browser Hooks ===
export {
  useInfiniteScrollSentinel,
  type UseInfiniteScrollSentinelOptions,
} from './lib/browser/use-infinite-scroll-sentinel'
export { breakpoints, useMediaQuery } from './lib/browser/use-media-query'
export { type OfflineConsentState, useOfflineConsent } from './lib/browser/use-offline-consent'
export { useOnlineStatus } from './lib/browser/use-online-status'
export { type ScrollDirection, useScrollDirection } from './lib/browser/use-scroll-direction'
export { useWindowSize, type WindowSize } from './lib/browser/use-window-size'

// === TanStack Query Hooks ===
export { type ApiSuggestionsResult, useApiSuggestions } from './lib/query/use-api-suggestions'
export { useBulkMutation } from './lib/query/use-bulk-mutation'
export { useInvalidateQueries } from './lib/query/use-invalidate-queries'
export { usePendingMutations } from './lib/query/use-pending-mutations'
export { usePolledData, type UsePolledDataOptions, type UsePolledDataResult } from './lib/query/use-polled-data'
