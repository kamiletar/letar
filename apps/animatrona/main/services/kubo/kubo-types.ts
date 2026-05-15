/**
 * Типы для KuboService
 *
 * Общие типы, используемые всеми подмодулями kubo-*.
 * KuboMode и KuboServiceStatus также продублированы в shared/types/ipfs.ts
 * для использования в renderer процессе.
 */

/**
 * Режим работы KuboService
 */
export type KuboMode = 'external' | 'embedded' | 'none'

/**
 * Статус KuboService
 */
export interface KuboServiceStatus {
  /** Запущен ли сервис */
  isRunning: boolean
  /** Режим работы */
  mode: KuboMode
  /** PeerId ноды */
  peerId: string | null
  /** URL API */
  apiUrl: string | null
  /** Порт Gateway */
  gatewayPort: number | null
  /** Версия Kubo */
  version: string | null
  /** Количество подключённых пиров */
  connectedPeers: number
}

/**
 * События KuboService
 */
export interface KuboServiceEvents {
  'status:changed': (status: KuboServiceStatus) => void
  'peer:connected': (peerId: string) => void
  'peer:disconnected': (peerId: string) => void
  error: (error: Error) => void
}

/**
 * Текущие порты Kubo (могут отличаться от дефолтных если порты заняты)
 */
export interface KuboCurrentPorts {
  api: number
  gateway: number
  swarmTcp: number
  swarmQuic: number
}
