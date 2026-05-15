/**
 * libp2p конфигурация (legacy)
 *
 * DEPRECATED: Kubo использует свою конфигурацию из kubo-config.ts
 * Этот файл сохранён для обратной совместимости.
 */

import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { autoNAT } from '@libp2p/autonat'
import { bootstrap } from '@libp2p/bootstrap'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { dcutr } from '@libp2p/dcutr'
import { identify } from '@libp2p/identify'
import type { PeerId } from '@libp2p/interface'
import { kadDHT } from '@libp2p/kad-dht'
import { mdns } from '@libp2p/mdns'
import { mplex } from '@libp2p/mplex'
import { noise } from '@libp2p/noise'
import { ping } from '@libp2p/ping'
import { simpleMetrics } from '@libp2p/simple-metrics'
import { tcp } from '@libp2p/tcp'
import { uPnPNAT } from '@libp2p/upnp-nat'
import { webSockets } from '@libp2p/websockets'
import { yamux } from '@libp2p/yamux'
import type { Libp2pOptions } from 'libp2p'

import type { IpfsConfig } from '../../../shared/types/ipfs'

/**
 * Глобальное хранилище метрик трафика
 * Обновляется через onMetrics callback в simpleMetrics
 */
export const trafficMetrics = {
  bytesIn: 0,
  bytesOut: 0,
}

/**
 * Локальный IPFS Desktop (Kubo) — для прямого подключения на том же компьютере
 * mDNS требует Bonjour на Windows, поэтому используем прямой адрес
 */
const LOCAL_KUBO_PEER = '/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWBPstGdEdtuBciTf9EobuvQQpgCCgkab3t8byjz5V5UZi'

/**
 * Приватный relay сервер для Animatrona
 * Не публикуется в DHT, доступен только пользователям Animatrona
 * Конфигурация: infra/animatrona-relay/
 */
const PRIVATE_RELAY = '/ip4/193.37.68.73/tcp/41001/p2p/12D3KooWLUL6FhLPLhcyBMcNTXP65225G4H1Ai8HdyvBWi5MKxnh'

/**
 * Публичные bootstrap ноды IPFS
 * Используются для первоначального обнаружения пиров
 *
 * ВАЖНО: Используем прямые IP адреса (не dnsaddr) для надёжности на Windows.
 * dnsaddr требует DNS TXT resolution который может не работать.
 */
const BOOTSTRAP_PEERS = [
  // Локальный IPFS Desktop — подключаемся первым для быстрого обмена
  LOCAL_KUBO_PEER,

  // Приватный relay — для NAT traversal между пользователями Animatrona
  PRIVATE_RELAY,

  // === ПРЯМЫЕ TCP АДРЕСА (самые надёжные) ===

  // Protocol Labs bootstrap (mars.i.ipfs.io)
  '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',

  // Protocol Labs bootstrap nodes (различные регионы)
  '/ip4/147.75.109.213/tcp/4001/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/ip4/147.75.109.29/tcp/4001/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/ip4/147.75.83.83/tcp/4001/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/ip4/147.75.77.187/tcp/4001/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',

  // Cloudflare IPFS Gateway (публичный, высокая доступность)
  '/ip4/172.65.0.13/tcp/4001/p2p/QmcfgsJsMtx6qJb74akCw1M24X1zFwgGo11h1cuhwQjtJP',

  // Pinata bootstrap nodes
  '/ip4/138.201.67.219/tcp/4001/p2p/QmPExYFkbC9BMh3MXd4sH22JV7yKYRWkFRPBGBvUDwPQyS',
  '/ip4/138.201.67.220/tcp/4001/p2p/QmYrA66MZrSu22s5Qp2rbNJjGBdGCTF4LwUjzC5RqW5RbS',

  // === dnsaddr как fallback (может не работать на Windows) ===
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
]

/**
 * Создать конфигурацию libp2p для Helia
 *
 * @param peerId - PeerId ноды
 * @param config - Пользовательские настройки
 */
export function createLibp2pOptions(peerId: PeerId, config: IpfsConfig): Partial<Libp2pOptions> {
  const services: Record<string, unknown> = {
    // Identify — базовый протокол для обмена информацией о пирах
    identify: identify(),
    // Ping — проверка доступности пиров (требуется для kad-dht)
    ping: ping(),
    // AutoNAT — определение типа NAT для понимания доступности
    autoNAT: autoNAT(),
    // DCUtR — Direct Connection Upgrade through Relay (NAT hole punching)
    dcutr: dcutr(),
    // UPnP NAT — автоматический проброс портов через роутер
    // Требует UPnP на роутере, но если работает — нода становится публично доступной
    upnp: uPnPNAT({
      description: 'Animatrona IPFS',
      ttl: 7200, // 2 часа
    }),
  }

  // DHT для обнаружения пиров и content routing
  if (config.enableDht) {
    services.dht = kadDHT({
      // Client mode — нода за NAT не может быть DHT сервером
      // В client mode нода делает DHT queries но не отвечает на запросы других
      // Это критично для работы за NAT!
      clientMode: true,
    })
  }

  // GossipSub для pubsub (нужен для IPNS)
  if (config.enableGossipsub) {
    services.pubsub = gossipsub({
      // Не форвардим сообщения по умолчанию
      allowPublishToZeroTopicPeers: true,
      // Подписываемся только на нужные топики
      emitSelf: false,
    })
  }

  return {
    peerId,

    // Metrics — отслеживание статистики трафика (bytesIn/bytesOut)
    // ВАЖНО: должен быть top-level option, не в services!
    metrics: simpleMetrics({
      onMetrics: (metrics) => {
        // Суммируем трафик из всех компонентов
        let totalIn = 0
        let totalOut = 0
        for (const [, data] of metrics) {
          totalIn += (data as { dataReceived?: number }).dataReceived ?? 0
          totalOut += (data as { dataSent?: number }).dataSent ?? 0
        }
        trafficMetrics.bytesIn = totalIn
        trafficMetrics.bytesOut = totalOut
      },
      intervalMs: 2000,
    }),

    // Адреса для прослушивания
    // Открываем TCP порт для локальных соединений (mDNS, другие IPFS ноды)
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0', // Случайный свободный порт для TCP
      ],
    },

    // Транспорты
    transports: [
      // TCP для прямых соединений
      tcp(),
      // WebSocket для браузерных нод
      webSockets(),
      // Circuit Relay для NAT traversal
      circuitRelayTransport(),
    ],

    // Stream multiplexing
    streamMuxers: [
      // Yamux — предпочтительный (лучше производительность)
      yamux(),
      // Mplex — fallback для совместимости
      mplex(),
    ],

    // Шифрование
    connectionEncrypters: [noise()],

    // Лимиты соединений
    // Оптимизировано для активного DHT discovery
    connectionManager: {
      maxConnections: config.maxConnections,
      minConnections: config.minConnections,
      // Авто-dial чаще для быстрого набора пиров (было 30000)
      autoDialInterval: 10000,
      // Параллельные dial'ы для ускорения bootstrap
      autoDialConcurrency: 10,
      // Больше входящих pending для NAT hole punching
      maxIncomingPendingConnections: 50,
      // Увеличенные таймауты неактивности — предотвращают преждевременное закрытие соединений
      // По умолчанию js-libp2p закрывает idle соединения очень быстро
      inboundSocketInactivityTimeout: 120000, // 2 минуты
      outboundSocketInactivityTimeout: 120000, // 2 минуты
    },

    // Bootstrap и mDNS для обнаружения пиров
    peerDiscovery: [
      // Bootstrap — публичные ноды для первоначального подключения к сети
      bootstrap({
        list: BOOTSTRAP_PEERS,
        timeout: 5000, // Увеличено с 3000 для надёжности dnsaddr резолвинга
      }),
      // mDNS — автоматическое обнаружение пиров в локальной сети
      // Позволяет Helia и IPFS Desktop (Kubo) находить друг друга
      mdns(),
    ],

    // Сервисы
    services,
  }
}

/**
 * Экспорт для тестирования и конфигурации
 */
export { BOOTSTRAP_PEERS, PRIVATE_RELAY }
