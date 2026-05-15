import { source } from '@/lib/source'
import { createFromSource } from 'fumadocs-core/search/server'

// Статический кэш поискового индекса
export const revalidate = false
export const { staticGET: GET } = createFromSource(source)
