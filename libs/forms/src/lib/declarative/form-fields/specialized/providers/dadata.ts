import type { AddressProvider, AddressSuggestion, SuggestionOptions } from './types'

const DADATA_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'

interface DaDataConfig {
  /** DaData API token */
  token: string
  /** Custom API base URL (default: DaData production) */
  baseUrl?: string
}

/**
 * Create a DaData address provider (Russia).
 *
 * @example
 * ```typescript
 * import { createDaDataProvider } from '@letar/forms'
 *
 * const dadata = createDaDataProvider({ token: process.env.DADATA_TOKEN })
 *
 * <Form.Field.Address name="address" provider={dadata} />
 * ```
 */
export function createDaDataProvider(config: DaDataConfig): AddressProvider {
  const { token, baseUrl = DADATA_URL } = config

  return {
    async getSuggestions(query: string, options?: SuggestionOptions): Promise<AddressSuggestion[]> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = {
        query,
        count: options?.count ?? 10,
      }

      // DaData-specific: from_bound/to_bound for city-level restriction
      if (options?.bounds) {
        if (options.bounds.from) body.from_bound = { value: options.bounds.from }
        if (options.bounds.to) body.to_bound = { value: options.bounds.to }
      }

      // DaData-specific: locations filter
      if (options?.filters) {
        body.locations = [options.filters]
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      const suggestions = data.suggestions ?? []

      return suggestions.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any): AddressSuggestion => ({
          label: s.value,
          value: s.value,
          data: s.data,
        })
      )
    },
  }
}
