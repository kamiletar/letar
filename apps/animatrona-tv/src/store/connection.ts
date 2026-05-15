/**
 * Connection store для Animatrona TV
 */
import { createConnectionStore } from '@letar/animatrona-shared'

export type { ConnectionData, ConnectionState } from '@letar/animatrona-shared'

export const useConnectionStore = createConnectionStore('animatrona-tv-connection')
