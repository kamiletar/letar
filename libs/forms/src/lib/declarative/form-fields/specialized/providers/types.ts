/**
 * Generic suggestion returned by any address provider.
 */
export interface AddressSuggestion {
  /** Display text shown in the dropdown */
  label: string
  /** Value to store in the form field */
  value: string
  /** Structured address data (provider-specific) */
  data?: Record<string, unknown>
}

/**
 * Options for fetching address suggestions.
 */
export interface SuggestionOptions {
  /** Maximum number of results */
  count?: number
  /** Restrict suggestion scope (e.g., city-level only) */
  bounds?: { from?: string; to?: string }
  /** Location filters (provider-specific) */
  filters?: Record<string, unknown>
}

/**
 * Address suggestion provider interface.
 *
 * Implement this to integrate any geocoding/address service:
 * DaData, Google Places, Mapbox, Nominatim, etc.
 *
 * @example Custom provider
 * ```typescript
 * const myProvider: AddressProvider = {
 *   async getSuggestions(query, options) {
 *     const res = await fetch(`/api/geocode?q=${query}&limit=${options?.count ?? 10}`)
 *     const data = await res.json()
 *     return data.map(item => ({
 *       label: item.display_name,
 *       value: item.display_name,
 *       data: item,
 *     }))
 *   }
 * }
 * ```
 */
export interface AddressProvider {
  /** Fetch address suggestions for a query string */
  getSuggestions(query: string, options?: SuggestionOptions): Promise<AddressSuggestion[]>
}
