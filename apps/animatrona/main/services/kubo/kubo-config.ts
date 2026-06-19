/**
 * Конфигурация Kubo демона для Animatrona
 *
 * Порты выбраны так, чтобы не конфликтовать с IPFS Desktop:
 * - IPFS Desktop: API 5001, Gateway 8080, Swarm 4001
 * - Animatrona Kubo: API 5011, Gateway 8081, Swarm 4011
 */

/**
 * Кастомный relay-сервер для Animatrona (go-libp2p + WithInfiniteLimits)
 * Роль: IPNS resolution, circuit relay для Bitswap через relay
 * WithInfiniteLimits() = соединения не transient = Bitswap работает
 * Registration API: POST http://193.37.68.73:41080/register
 * Конфигурация: infra/animatrona-relay/
 */
export const PRIVATE_RELAY = '/ip4/193.37.68.73/tcp/41001/p2p/12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA'
export const RELAY_PEER_ID = '12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA'
export const RELAY_REGISTER_URL = 'http://193.37.68.73:41080/register'

/**
 * Production gateway (s2.letar.best)
 * Роль: обслуживает anime.letar.best, получает блоки напрямую от ПК через bitswap
 * Прямое TCP соединение (outbound) обходит NAT — relay не нужен для данных
 */
export const GATEWAY_PEER_ID = '12D3KooWJtQXuNd4g5w3fH7bCSj4o4DA1PLBFjRGowiBbf6zqxa6'
export const GATEWAY_ADDR = '/ip4/185.28.85.195/tcp/42001'

/**
 * Pinner1 (mail.letar.best) — Kubo нода для долгосрочного хранения
 * Роль: пиннит контент после публикации на трекер
 * Прямое TCP/QUIC соединение (outbound) обходит NAT
 * Docker: infra/animatrona-pinner/, Swarm порт 43001
 */
export const PINNER_PEER_ID = '12D3KooWLJ3juXbEmfhBu4YTWBKQJCkgC5k9N8SMeBqTzscSxq9j'
export const PINNER_ADDR = '/ip4/193.37.68.73/tcp/43001'

/**
 * Pinner2 (130.12.46.31) — СПИСАН (OOM, плохой HDD), заменён на pinner3
 * Оставлено как deprecated константа для случая если встретится в старом cache.
 * НЕ используется в KUBO_CONFIG.Bootstrap / Peering.
 *
 * @deprecated используйте PINNER3_* или sync из API трекера
 */
export const PINNER2_PEER_ID = '12D3KooWR9QwdLbXcqfP6BCFuzSaMZ9NxW7249cJbW5jHrTftnq3'
export const PINNER2_ADDR = '/ip4/130.12.46.31/tcp/4001'

/**
 * Pinner3 (188.127.235.38) — третий пин-сервер для долгосрочного хранения
 * 500GB HDD + SSD кэш, PebbleDS, server profile
 * Docker: infra/animatrona-pinner3/, стандартные порты (4001 Swarm, 5001 API)
 */
export const PINNER3_PEER_ID = '12D3KooWP5hrqw8HHXUGaepSSRhsa8isoTAbcnRnKkjgHhWRLxiV'
export const PINNER3_ADDR = '/ip4/188.127.235.38/tcp/4001'

/**
 * Pinner4 / Gateway (s3 188.127.235.141) — четвёртый пин-сервер + gateway.letar.best
 * Роль: долгосрочное хранение + IPFS gateway (CNAME gateway.letar.best → s3.letar.best)
 * Docker: /opt/pin-queue/, стандартные порты (4001 Swarm, 5001 API, 8080 Gateway)
 */
export const PINNER4_PEER_ID = '12D3KooWM7KtRLjqRmJzva7Qy5KZzfaLES4Fk8GgnjabbWoo8A52'
export const PINNER4_ADDR = '/ip4/188.127.235.141/tcp/4001'

/**
 * Порты для embedded Kubo
 */
export const KUBO_PORTS = {
  /** RPC API порт */
  api: 5011,
  /** HTTP Gateway порт */
  gateway: 8081,
  /** Swarm TCP порт */
  swarmTcp: 4011,
  /** Swarm QUIC порт */
  swarmQuic: 4011,
} as const

/**
 * Конфигурация Kubo для Animatrona
 *
 * Настроена для:
 * - DHT client mode (работа за NAT)
 * - Relay client (подключение через relay)
 * - Hole punching (DCUtR)
 * - PubSub для P2P синхронизации
 */
export const KUBO_CONFIG = {
  // Лимит хранилища — дефолт Kubo 10GB слишком мало для аниме-библиотеки
  Datastore: {
    StorageMax: '500GB',
    // Дефолт 1h слишком часто — GC грузит CPU. Раз в 48 часов достаточно
    GCPeriod: '48h',
  },

  Addresses: {
    API: `/ip4/127.0.0.1/tcp/${KUBO_PORTS.api}`,
    Gateway: `/ip4/127.0.0.1/tcp/${KUBO_PORTS.gateway}`,
    Swarm: [
      `/ip4/0.0.0.0/tcp/${KUBO_PORTS.swarmTcp}`,
      `/ip4/0.0.0.0/udp/${KUBO_PORTS.swarmQuic}/quic-v1`,
      `/ip4/0.0.0.0/udp/${KUBO_PORTS.swarmQuic}/quic-v1/webtransport`,
    ],
  },

  // CORS — чтобы renderer мог обращаться к gateway напрямую
  API: {
    HTTPHeaders: {
      'Access-Control-Allow-Origin': ['*'],
      'Access-Control-Allow-Methods': ['GET', 'HEAD', 'OPTIONS'],
    },
  },
  Gateway: {
    HTTPHeaders: {
      'Access-Control-Allow-Origin': ['*'],
      'Access-Control-Allow-Methods': ['GET', 'HEAD', 'OPTIONS'],
      'Access-Control-Allow-Headers': ['Range', 'Content-Type'],
      'Access-Control-Expose-Headers': ['Content-Length', 'Content-Range', 'Accept-Ranges'],
    },
  },

  Bootstrap: [
    // ⚠️ Relay НЕ должен быть в Bootstrap! Он в StaticRelays + Peering.
    // Тройное подключение (Bootstrap + StaticRelays + Peering) создаёт
    // гонку соединений — go-libp2p закрывает дубликаты, убивая reservation.

    // Это HARDCODED FALLBACK — актуальный список подтягивается из tracker API
    // (см. peer-sync-service.ts). Используется только если API + cache недоступны.

    // Pinner1 (mail) — основной пин-сервер
    `${PINNER_ADDR}/p2p/${PINNER_PEER_ID}`,
    // Pinner3 — третий пин-сервер (500GB HDD+SSD cache)
    `${PINNER3_ADDR}/p2p/${PINNER3_PEER_ID}`,
    // Pinner4 (s3) — gateway.letar.best + четвёртый пин-сервер
    `${PINNER4_ADDR}/p2p/${PINNER4_PEER_ID}`,

    // Публичные bootstrap ноды Protocol Labs
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',

    // Прямые IP адреса (fallback если DNS не работает)
    '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
    '/ip4/147.75.109.213/tcp/4001/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  ],

  Swarm: {
    ConnMgr: {
      // Высокие лимиты для запаса. С отключённым AcceleratedDHTClient burst
      // соединений невелик, но мы держим запас для relay/peering и DHT-discovery
      // через HTTP routers + bootstrap.
      LowWater: 600,
      HighWater: 1200,
      GracePeriod: '60s',
    },
    // ResourceMgr: лимиты задаются через libp2p-resource-limit-overrides.json
    ResourceMgr: {
      Enabled: true,
    },
    RelayClient: {
      Enabled: true,
      StaticRelays: [PRIVATE_RELAY],
    },
    RelayService: {
      Enabled: false, // Мы не релей, только клиент
    },
    EnableHolePunching: true,
  },

  Routing: {
    Type: 'autoclient', // Auto + HTTP routers, но всегда client → AutoRelay работает
    // AcceleratedDHTClient отключён на десктоп-клиенте: создаёт 700-1500 соединений
    // и full DHT crawl каждые ~10-30 минут → периодические CPU-спайки.
    // Поиск контента всё равно работает через HTTP routers (delegated routing) и Peering.
    AcceleratedDHTClient: false,
  },

  // Provide: Sweep для эффективного анонса контента в DHT.
  // Strategy 'roots' — анонсируем только корневые CID (directoryCid каждого аниме).
  // Дочерние блоки защищены рекурсивным пином, обнаруживаются через root по DHT.
  // 'pinned' раньше заставлял Kubo обходить весь DAG при старте (5-10 мин GB/s read SSD).
  Provide: {
    Strategy: 'roots' as const,
    DHT: {
      SweepEnabled: true,
      ResumeEnabled: true,
    },
  },

  // Reprovider: переанонс контента в DHT раз в 24 часа (по умолчанию 22ч).
  // Strategy 'pinned' дублирует Provide.Strategy для совместимости со старыми версиями Kubo.
  Reprovider: {
    Interval: '24h',
    Strategy: 'pinned' as const,
  },

  Pubsub: {
    Enabled: true,
    Router: 'gossipsub',
  },

  // Отключаем mDNS — не нужен для DHT discovery
  Discovery: {
    MDNS: {
      Enabled: false,
    },
  },

  // Peering со специфичными нодами — Kubo автоматически поддерживает соединения
  Peering: {
    Peers: [
      // ⚠️ Relay НЕ в Peering! Только в StaticRelays.
      // Peering создаёт параллельное TCP-соединение к relay, конкурируя с AutoRelay.
      // go-libp2p обнаруживает дублирующие connections → закрывает одно →
      // если закрывает AutoRelay's → reservation потеряна мгновенно.
      // AutoRelay через StaticRelays — единственный путь подключения к relay.
      // Relay monitor восстанавливает при потере.

      // Gateway — прямое TCP/QUIC соединение для bitswap (outbound обходит NAT)
      {
        ID: GATEWAY_PEER_ID,
        Addrs: [GATEWAY_ADDR, '/ip4/185.28.85.195/udp/42001/quic-v1'],
      },
      // Pinner1 — прямое TCP/QUIC соединение для быстрого пиннинга (outbound обходит NAT)
      {
        ID: PINNER_PEER_ID,
        Addrs: [PINNER_ADDR, '/ip4/193.37.68.73/udp/43001/quic-v1'],
      },
      // Pinner3 — третий пин-сервер (500GB HDD+SSD cache)
      {
        ID: PINNER3_PEER_ID,
        Addrs: [PINNER3_ADDR, '/ip4/188.127.235.38/udp/4001/quic-v1'],
      },
      // Pinner4 (s3) — gateway.letar.best + четвёртый пин-сервер
      {
        ID: PINNER4_PEER_ID,
        Addrs: [PINNER4_ADDR, '/ip4/188.127.235.141/udp/4001/quic-v1'],
      },
    ],
  },
} as const

/**
 * Порты IPFS Desktop (для детекции)
 */
export const IPFS_DESKTOP_PORTS = {
  api: 5001,
  gateway: 8080,
  swarm: 4001,
} as const

/**
 * URL для проверки IPFS Desktop API
 */
export const IPFS_DESKTOP_API_URL = `http://127.0.0.1:${IPFS_DESKTOP_PORTS.api}/api/v0`
