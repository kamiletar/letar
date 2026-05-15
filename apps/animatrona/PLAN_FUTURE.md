# Техническое задание: Федеративная P2P аниме-платформа на IPFS

**Версия:** 1.0\
**Дата:** 25 декабря 2025 г.\
**Статус:** Draft

---

## Содержание

1. [Введение и концепция](#1-введение-и-концепция)
2. [Архитектура системы](#2-архитектура-системы)
3. [IPFS интеграция](#3-ipfs-интеграция)
4. [Федеративная сеть трекеров](#4-федеративная-сеть-трекеров)
5. [Система репутации и мотивации](#5-система-репутации-и-мотивации)
6. [Система модерации](#6-система-модерации)
7. [Рейтинги и отзывы](#7-рейтинги-и-отзывы)
8. [Распределенная библиотека](#8-распределенная-библиотека)
9. [Технический стек](#9-технический-стек)
10. [API спецификации](#10-api-спецификации)
11. [База данных](#11-база-данных)
12. [Безопасность](#12-безопасность)
13. [UI/UX компоненты](#13-uiux-компоненты)
14. [Развертывание и масштабирование](#14-развертывание-и-масштабирование)
15. [Дорожная карта](#15-дорожная-карта)

---

## 1. Введение и концепция

### 1.1 Видение проекта

Создание децентрализованной P2P платформы для просмотра и распространения аниме-контента, где:

- **Пользователи** - полноправные участники сети, раздающие контент друг другу
- **Трекеры** - независимые серверы, каждый со своей тематикой и правилами модерации
- **Федерация** - трекеры свободно обмениваются метаданными и статистикой
- **IPFS** - обеспечивает децентрализованное хранение и раздачу видео
- **Репутация** - мотивирует пользователей к раздаче контента
- **Модерация** - децентрализованная, но эффективная система контроля контента

### 1.2 Ключевые преимущества

**Для пользователей:**

- Полный контроль над своей библиотекой
- Мотивация к раздаче через систему репутации
- Выбор трекеров по интересам и правилам модерации
- Цензуроустойчивость через IPFS
- Офлайн-доступ к закрепленному контенту

**Для владельцев трекеров:**

- Возможность создать свое сообщество с уникальной тематикой
- Собственная система модерации и правила
- Монетизация через подписки/донаты (опционально)
- Федерация с другими трекерами для расширения контента

**Для экосистемы:**

- Отсутствие единой точки отказа
- Распределенная нагрузка через P2P
- Сохранность редкого контента благодаря распределенному хранению
- Открытость и прозрачность протокола

### 1.3 Вдохновение и аналоги

**Технические:**

- **BitTorrent** - P2P раздача, tit-for-tat механизмы
- **Mastodon/Fediverse** - федеративная архитектура
- **Bluesky/AT Protocol** - портируемость идентичности, подписанные данные
- **PeerTube** - федеративный видео-хостинг

**Функциональные:**

- **Popcorn Time** - удобство P2P стриминга
- **MAL/AniList** - каталогизация аниме, рейтинги
- **Private торрент-трекеры** - системы репутации, sharing ratio

---

## 2. Архитектура системы

### 2.1 Обзор компонентов

```
┌─────────────────────────────────────────────────────────────┐
│                    ФЕДЕРАТИВНАЯ СЕТЬ                        │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Трекер #1   │◄──►│  Трекер #2   │◄──►│  Трекер #3   │  │
│  │  (Аниме)     │    │  (Дорамы)    │    │  (Фильмы)    │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │          │
└─────────┼───────────────────┼───────────────────┼──────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                    ┌─────────▼────────┐
                    │                  │
                    │  Electron-клиент │
                    │  с IPFS-нодой    │
                    │                  │
                    └─────────┬────────┘
                              │
                    ┌─────────▼────────┐
                    │                  │
                    │   IPFS Network   │
                    │   (P2P раздача)  │
                    │                  │
                    └──────────────────┘
```

### 2.2 Компоненты

#### 2.2.1 Клиентское приложение (Electron)

**Функции:**

- Встроенная IPFS нода (js-ipfs/go-ipfs)
- Видео-плеер с поддержкой HLS
- Управление личной библиотекой
- Подключение к нескольким трекерам
- Система пининга и раздачи
- UI для управления настройками

**Технологии:**

- Electron (cross-platform)
- React + TypeScript
- Chakra UI + Emotion
- TanStack Query (state management)
- IPFS (js-ipfs или go-ipfs wrapper)

#### 2.2.2 Сервер-трекер (Node.js/Bun)

**Функции:**

- Учет пиров и статистики раздач
- Хранение метаданных контента
- Федеративное API (обмен с другими трекерами)
- Система модерации
- Пользовательские рейтинги и отзывы
- Веб-интерфейс для просмотра каталога

**Технологии:**

- Node.js/Bun (runtime)
- Next.js (SSR для веб-интерфейса)
- PostgreSQL (основная БД)
- Redis (кэш, очереди)
- Prisma ORM
- ZenStack (для access control)

#### 2.2.3 IPFS Network

**Функции:**

- Распределенное хранение видео-файлов
- P2P обмен между пирами
- DHT для поиска контента
- Bitswap протокол для обмена блоками

---

## 3. IPFS интеграция

### 3.1 Встроенная IPFS нода

#### 3.1.1 Стратегия запуска ноды

**При первом запуске:**

1. **Проверка существующих нод:**

   ```typescript
   async function detectExistingIPFSNode(): Promise<NodeDetectionResult> {
     const commonPorts = [5001, 5002, 5003]

     for (const port of commonPorts) {
       try {
         const response = await fetch(`http://127.0.0.1:${port}/api/v0/version`, {
           method: 'POST',
           signal: AbortSignal.timeout(2000),
         })

         if (response.ok) {
           return {
             detected: true,
             apiPort: port,
             type: 'external',
           }
         }
       } catch {
         continue
       }
     }

     return { detected: false }
   }
   ```

2. **Диалог выбора:**

- Если обнаружена существующая нода → предложить использовать её или запустить отдельную
- Если не обнаружена → запустить встроенную ноду с уникальными портами

3. **Запуск встроенной ноды:**

   ```typescript
   import { create as createIPFS } from 'ipfs-core'

   const node = await createIPFS({
     repo: path.join(app.getPath('userData'), '.ipfs-anime'),
     config: {
       Addresses: {
         API: '/ip4/127.0.0.1/tcp/45001',
         Gateway: '/ip4/127.0.0.1/tcp/48080',
         Swarm: ['/ip4/0.0.0.0/tcp/44001', '/ip6/::/tcp/44001', '/ip4/0.0.0.0/udp/44002/quic'],
       },
       Bootstrap: [
         // Стандартные bootstrap ноды
         '/dnsaddr/bootstrap.libp2p.io/p2p/...',
         // Кастомные bootstrap ноды проекта
         '/dns4/bootstrap.anime-ipfs.org/tcp/4001/p2p/...',
       ],
       Swarm: {
         ConnMgr: {
           LowWater: 50,
           HighWater: 200,
         },
       },
     },
   })
   ```

#### 3.1.2 Оптимизация для видео

**Конфигурация для видео-контента:**

```typescript
const videoOptimizedConfig = {
  // Увеличенный размер блоков для видео
  chunker: 'size-2097152', // 2MB блоки

  // Приоритет локальных пиров
  routing: 'dhtclient',

  // Репликация важных блоков
  reprovide: {
    interval: '12h',
    strategy: 'pinned',
  },

  // Агрессивный битсвоп для быстрой загрузки
  bitswap: {
    maxMessageSize: 2097152, // 2MB
    ledgerCacheSize: 1024,
  },
}
```

**Поддержка HLS (HTTP Live Streaming):**

1. **Кодирование видео в HLS:**

   ```bash
   # На стороне загрузчика контента
   ffmpeg -i input.mp4 \
     -codec: copy -start_number 0 \
     -hls_time 10 -hls_list_size 0 \
     -f hls output.m3u8
   ```

2. **Структура в IPFS:**

   ```
   /ipfs/QmRootHash/
   ├── 720p/
   │   ├── playlist.m3u8
   │   ├── segment0.ts
   │   ├── segment1.ts
   │   └── ...
   ├── 1080p/
   │   ├── playlist.m3u8
   │   ├── segment0.ts
   │   └── ...
   └── master.m3u8
   ```

3. **Адаптивный битрейт (ABR):**

   ```typescript
   // Telescope-подобный алгоритм для IPFS
   class IPFSAwareBitrate {
     selectQuality(bandwidth: number, rtt: number, cacheHit: number) {
       // Учитываем RTT к провайдерам IPFS
       const effectiveBandwidth = bandwidth * (1 - rtt / 1000)

       // Учитываем cache hit ratio
       const adjustedBandwidth = effectiveBandwidth * (0.5 + 0.5 * cacheHit)

       if (adjustedBandwidth > 5000) return '1080p'
       if (adjustedBandwidth > 2500) return '720p'
       return '480p'
     }
   }
   ```

### 3.2 Пининг и раздача

#### 3.2.1 Выборочный пининг

```typescript
interface PinOptions {
  episodes: number[] // Какие серии закрепить
  quality: '720p' | '1080p' | 'both'
  includeSubtitles: boolean
  priority: 'high' | 'normal' | 'low'
}

async function pinAnime(anime: AnimeSeries, options: PinOptions): Promise<PinResult> {
  const pinnedCIDs: string[] = []

  for (const episode of anime.episodes) {
    if (!options.episodes.includes(episode.number)) continue

    // Закрепляем видео
    const videoCID = episode.qualities[options.quality]
    await ipfs.pin.add(videoCID, {
      recursive: true,
      progress: (bytes) => {
        emitProgress('pin', episode.number, bytes)
      },
    })
    pinnedCIDs.push(videoCID)

    // Закрепляем субтитры если нужно
    if (options.includeSubtitles && episode.subtitleCID) {
      await ipfs.pin.add(episode.subtitleCID)
      pinnedCIDs.push(episode.subtitleCID)
    }
  }

  return {
    success: true,
    pinnedCIDs,
    totalSize: await calculateTotalSize(pinnedCIDs),
  }
}
```

#### 3.2.2 Управление хранилищем

```typescript
class StorageManager {
  private maxStorageGB: number

  async enforceStorageLimit() {
    const currentUsage = await this.calculateUsage()

    if (currentUsage > this.maxStorageGB * 1024 ** 3) {
      // LRU стратегия - удаляем самые старые непросматриваемые
      const candidates = await this.getCandidatesForRemoval()

      for (const candidate of candidates) {
        await ipfs.pin.rm(candidate.cid)
        await this.db.markAsUnpinned(candidate.id)

        const newUsage = await this.calculateUsage()
        if (newUsage <= this.maxStorageGB * 1024 ** 3) break
      }
    }
  }

  private async getCandidatesForRemoval() {
    // Приоритет удаления:
    // 1. Просмотренные серии старше 30 дней
    // 2. Частично скачанные серии
    // 3. Серии с низким sharing ratio
    return await this.db.query(`
      SELECT * FROM pinned_content
      WHERE 
        (last_watched < NOW() - INTERVAL '30 days' AND completed = true)
        OR (downloaded_percent < 100)
        OR (sharing_ratio < 0.5)
      ORDER BY 
        priority ASC,
        last_watched ASC
      LIMIT 100
    `)
  }
}
```

### 3.3 Статистика и мониторинг

```typescript
interface NodeStats {
  peersConnected: number
  bandwidth: {
    in: number // bytes/sec
    out: number // bytes/sec
  }
  storage: {
    used: number // bytes
    limit: number // bytes
  }
  pins: {
    count: number
    size: number // bytes
  }
}

class IPFSMonitor {
  async getStats(): Promise<NodeStats> {
    const peers = await ipfs.swarm.peers()
    const bwStats = await ipfs.stats.bw()
    const repoStats = await ipfs.stats.repo()

    let pinsCount = 0
    let pinsSize = 0

    for await (const { cid } of ipfs.pin.ls()) {
      pinsCount++
      const stat = await ipfs.files.stat(`/ipfs/${cid}`)
      pinsSize += stat.cumulativeSize
    }

    return {
      peersConnected: peers.length,
      bandwidth: {
        in: bwStats.rateIn,
        out: bwStats.rateOut,
      },
      storage: {
        used: repoStats.repoSize,
        limit: repoStats.storageMax,
      },
      pins: {
        count: pinsCount,
        size: pinsSize,
      },
    }
  }
}
```

---

## 4. Федеративная сеть трекеров

### 4.1 Протокол федерации

Федерация трекеров построена на принципах **ActivityPub** с адаптацией под специфику видео-контента и P2P раздач.

#### 4.1.1 Базовые концепции

**Actor (Трекер):**

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://tracker.anime-ru.org/federation/actor",
  "type": "Service",
  "name": "Anime Tracker RU",
  "preferredUsername": "anime-ru",
  "inbox": "https://tracker.anime-ru.org/federation/inbox",
  "outbox": "https://tracker.anime-ru.org/federation/outbox",
  "publicKey": {
    "id": "https://tracker.anime-ru.org/federation/actor#main-key",
    "owner": "https://tracker.anime-ru.org/federation/actor",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n..."
  },
  "endpoints": {
    "sharedInbox": "https://tracker.anime-ru.org/federation/inbox",
    "content": "https://tracker.anime-ru.org/federation/content",
    "announces": "https://tracker.anime-ru.org/federation/announces"
  },
  "metadata": {
    "theme": "anime",
    "language": "ru",
    "contentRating": "all-ages",
    "features": ["streaming", "downloads", "subtitles"],
    "stats": {
      "totalContent": 1250,
      "activePeers": 342,
      "totalSeeders": 1823
    }
  }
}
```

**Activity (Синхронизация контента):**

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://tracker.anime-ru.org/activities/12345",
  "type": "Create",
  "actor": "https://tracker.anime-ru.org/federation/actor",
  "published": "2025-01-15T10:30:00Z",
  "to": ["https://www.w3.org/ns/activitystreams#Public"],
  "cc": ["https://tracker.anime-en.org/federation/actor"],
  "object": {
    "type": "VideoSeries",
    "id": "https://tracker.anime-ru.org/content/frieren",
    "name": "Frieren: Beyond Journey's End",
    "nameJa": "葬送のフリーレン",
    "summary": "Эпическое фэнтези о путешествии эльфийской маги...",
    "published": "2023-09-29",
    "mediaType": "video/mp4",
    "episodes": [
      {
        "number": 1,
        "name": "The Journey's End",
        "videoCID": "QmX5k...",
        "subtitleCID": "QmY7j...",
        "quality": ["720p", "1080p"],
        "duration": 1440,
        "size": 1073741824
      }
    ],
    "genres": ["fantasy", "adventure", "drama"],
    "externalIds": {
      "mal": "52991",
      "anilist": "154587"
    },
    "attribution": {
      "source": "https://myanimelist.net/anime/52991",
      "uploader": "user@tracker.anime-ru.org"
    }
  },
  "signature": {
    "type": "RsaSignature2017",
    "creator": "https://tracker.anime-ru.org/federation/actor#main-key",
    "created": "2025-01-15T10:30:00Z",
    "signatureValue": "..."
  }
}
```

#### 4.1.2 Endpoints трекера

**1. GET /federation/info** - Информация о трекере

```typescript
interface TrackerInfo {
  id: string
  name: string
  description: string
  url: string
  theme: string
  publicKey: string
  stats: {
    totalContent: number
    totalPeers: number
    totalSeeders: number
    uptime: number
  }
  federation: {
    connectedTrackers: number
    trustedTrackers: string[]
  }
}
```

**2. GET /federation/content** - Список контента

Query параметры:

- `type` - тип контента (anime, movie, series)
- `limit` - количество результатов (макс. 100)
- `offset` - смещение для пагинации
- `since` - ISO дата, контент новее этой даты

**3. POST /federation/inbox** - Получение активностей

Принимает ActivityStreams activities от других трекеров.

**4. GET /federation/announces/:cid** - Статистика раздачи

```typescript
interface AnnounceStats {
  cid: string
  seeders: number
  leechers: number
  completed: number
  lastUpdate: string
  peers: Array<{
    peerId: string
    uploaded: number
    downloaded: number
    left: number
  }>
}
```

**5. GET /federation/search** - Поиск контента

Query параметры:

- `q` - поисковый запрос
- `type` - фильтр по типу
- `genre` - фильтр по жанру
- `year` - фильтр по году

#### 4.1.3 Обнаружение трекеров

**WebFinger для обнаружения:**

```
GET https://tracker.anime-ru.org/.well-known/webfinger
  ?resource=acct:anime-ru@tracker.anime-ru.org

Response:
{
  "subject": "acct:anime-ru@tracker.anime-ru.org",
  "links": [
    {
      "rel": "self",
      "type": "application/activity+json",
      "href": "https://tracker.anime-ru.org/federation/actor"
    }
  ]
}
```

**Реестр трекеров (опционально):**

Публичный GitHub репозиторий со списком известных трекеров:

```yaml
# trackers.yaml
trackers:
  - name: 'Anime Tracker RU'
    url: 'https://tracker.anime-ru.org'
    theme: 'anime'
    language: 'ru'
    verified: true

  - name: 'Drama Tracker EN'
    url: 'https://tracker.drama-en.org'
    theme: 'drama'
    language: 'en'
    verified: true
```

### 4.2 Синхронизация контента

#### 4.2.1 Pull-based синхронизация

```typescript
class FederationSync {
  async syncFromTracker(trackerUrl: string) {
    // 1. Получаем новый контент
    const lastSync = await this.db.getLastSync(trackerUrl)
    const newContent = await fetch(`${trackerUrl}/federation/content?since=${lastSync}`).then((r) => r.json())

    // 2. Валидируем подписи
    const tracker = await this.db.getTracker(trackerUrl)
    for (const activity of newContent) {
      if (!this.verifySignature(activity, tracker.publicKey)) {
        console.warn('Invalid signature:', activity.id)
        continue
      }

      // 3. Импортируем контент
      await this.importContent(activity.object, tracker.id)
    }

    // 4. Обновляем время синхронизации
    await this.db.setLastSync(trackerUrl, new Date())
  }

  private async importContent(content: VideoSeries, trackerId: string) {
    // Проверяем дубликаты по externalId
    const existing = await this.db.findContent({
      externalId: content.externalIds?.mal,
      externalSource: 'mal',
    })

    if (existing) {
      // Объединяем данные (добавляем новые серии, обновляем статистику)
      await this.mergeContent(existing, content, trackerId)
    } else {
      // Создаем новую запись
      await this.db.createContent({
        ...content,
        originTrackerId: trackerId,
      })
    }
  }
}
```

#### 4.2.2 Агрегация статистики сидов

```typescript
class SeederAggregator {
  async getGlobalSeeders(cid: string): Promise<GlobalSeederStats> {
    const trackers = await this.db.getTrustedTrackers()

    const results = await Promise.allSettled(
      trackers.map(async (tracker) => {
        try {
          const response = await fetch(`${tracker.url}/federation/announces/${cid}`, {
            signal: AbortSignal.timeout(5000),
          })
          return await response.json()
        } catch {
          return { seeders: 0, leechers: 0 }
        }
      })
    )

    const stats = results
      .filter((r): r is PromiseFulfilledResult<AnnounceStats> => r.status === 'fulfilled')
      .map((r) => r.value)

    // Дедупликация пиров по peerId
    const uniquePeers = new Map<string, Peer>()
    for (const stat of stats) {
      for (const peer of stat.peers || []) {
        uniquePeers.set(peer.peerId, peer)
      }
    }

    const totalSeeders = Array.from(uniquePeers.values()).filter((p) => p.left === 0).length

    const totalLeechers = Array.from(uniquePeers.values()).filter((p) => p.left > 0).length

    return {
      totalSeeders,
      totalLeechers,
      byTracker: stats.map((s, i) => ({
        tracker: trackers[i].name,
        seeders: s.seeders,
        leechers: s.leechers,
      })),
    }
  }
}
```

### 4.3 Доверие и репутация трекеров

#### 4.3.1 Уровни доверия

```typescript
enum TrustLevel {
  BLOCKED = 0, // Заблокирован (спам, вредоносный контент)
  UNTRUSTED = 1, // Непроверенный (по умолчанию)
  KNOWN = 2, // Известный (есть история взаимодействия)
  TRUSTED = 3, // Доверенный (верифицированный администратором)
  VERIFIED = 4, // Верифицированный (в официальном реестре)
}

interface TrackerReputation {
  trackerId: string
  trustLevel: TrustLevel
  metrics: {
    uptime: number // % времени онлайн
    responseTime: number // средний RTT
    contentQuality: number // качество метаданных (0-1)
    moderationScore: number // эффективность модерации (0-1)
  }
  interactions: {
    contentSynced: number
    flagsReceived: number
    flagsConfirmed: number
  }
}
```

#### 4.3.2 Автоматическая оценка доверия

```typescript
class TrackerTrustScoring {
  calculateTrustScore(reputation: TrackerReputation): number {
    const weights = {
      uptime: 0.2,
      responseTime: 0.1,
      contentQuality: 0.3,
      moderationScore: 0.3,
      interactions: 0.1,
    }

    // Нормализация response time (100ms = отлично, 1000ms = плохо)
    const normalizedRT = Math.max(0, 1 - reputation.metrics.responseTime / 1000)

    // Оценка взаимодействий
    const interactionScore =
      reputation.interactions.flagsReceived > 0
        ? 1 - reputation.interactions.flagsConfirmed / reputation.interactions.flagsReceived
        : 1

    return (
      weights.uptime * reputation.metrics.uptime +
      weights.responseTime * normalizedRT +
      weights.contentQuality * reputation.metrics.contentQuality +
      weights.moderationScore * reputation.metrics.moderationScore +
      weights.interactions * interactionScore
    )
  }

  async updateTrustLevel(trackerId: string) {
    const reputation = await this.db.getTrackerReputation(trackerId)
    const score = this.calculateTrustScore(reputation)

    let newLevel: TrustLevel
    if (score >= 0.8) newLevel = TrustLevel.TRUSTED
    else if (score >= 0.6) newLevel = TrustLevel.KNOWN
    else if (score < 0.3) newLevel = TrustLevel.UNTRUSTED
    else newLevel = reputation.trustLevel // не меняем

    await this.db.updateTrackerTrustLevel(trackerId, newLevel)
  }
}
```

---

## 5. Система репутации и мотивации

Система репутации вдохновлена механизмами **BitTorrent** с улучшениями для долгосрочной мотивации.

### 5.1 Метрики репутации

#### 5.1.1 Базовые метрики

```typescript
interface UserMetrics {
  // Трафик
  uploaded: bigint // Всего отдано (байты)
  downloaded: bigint // Всего скачано (байты)
  ratio: number // uploaded / downloaded

  // Время
  seedingTime: number // Общее время сидирования (секунды)
  averageSeedTime: number // Среднее время на раздачу

  // Вклад
  uniqueContent: number // Уникальный контент, которым делится
  helpedPeers: number // Количество помощи другим пирам

  // Активность
  lastActive: Date
  joinedAt: Date
  consecutiveDays: number // Подряд дней активности
}
```

#### 5.1.2 Расчет репутации

```typescript
class ReputationCalculator {
  calculateReputation(metrics: UserMetrics): number {
    const weights = {
      ratio: 0.3,
      seedingTime: 0.25,
      uniqueContent: 0.2,
      helpedPeers: 0.15,
      longevity: 0.1,
    }

    // 1. Ratio score (логарифмическая шкала)
    const ratioScore = Math.min(1, Math.log10(metrics.ratio + 1) / Math.log10(5))

    // 2. Seeding time score (нормализация к 1000 часам)
    const seedingScore = Math.min(1, metrics.seedingTime / (1000 * 3600))

    // 3. Unique content score
    const contentScore = Math.min(1, metrics.uniqueContent / 50)

    // 4. Helped peers score
    const helpScore = Math.min(1, metrics.helpedPeers / 100)

    // 5. Longevity score (учет времени в сети и последовательности)
    const daysInNetwork = (Date.now() - metrics.joinedAt.getTime()) / (24 * 3600 * 1000)
    const longevityScore = Math.min(1, (daysInNetwork / 365) * 0.7 + (metrics.consecutiveDays / 30) * 0.3)

    const totalScore =
      weights.ratio * ratioScore +
      weights.seedingTime * seedingScore +
      weights.uniqueContent * contentScore +
      weights.helpedPeers * helpScore +
      weights.longevity * longevityScore

    // Нормализация к 100
    return Math.round(totalScore * 100)
  }
}
```

### 5.2 Уровни и ранги

```typescript
enum UserRank {
  NEWCOMER = 'Newcomer',           // 0-20
  CONTRIBUTOR = 'Contributor',     // 21-40
  REGULAR = 'Regular',             // 41-60
  VETERAN = 'Veteran',             // 61-80
  LEGEND = 'Legend',               // 81-100
}

interface RankBenefits {
  [UserRank.NEWCOMER]: {
    downloadLimit: 50 * 1024 ** 3,      // 50GB/день
    priorityInSwarm: 1,
    canUpload: false,
  };
  [UserRank.CONTRIBUTOR]: {
    downloadLimit: 100 * 1024 ** 3,     // 100GB/день
    priorityInSwarm: 2,
    canUpload: true,
    canCreateCollections: true,
  };
  [UserRank.REGULAR]: {
    downloadLimit: 200 * 1024 ** 3,     // 200GB/день
    priorityInSwarm: 3,
    canUpload: true,
    canCreateCollections: true,
    canInviteFriends: 5,
  };
  [UserRank.VETERAN]: {
    downloadLimit: Infinity,
    priorityInSwarm: 4,
    canUpload: true,
    canCreateCollections: true,
    canInviteFriends: 20,
    accessToBetaFeatures: true,
  };
  [UserRank.LEGEND]: {
    downloadLimit: Infinity,
    priorityInSwarm: 5,
    canUpload: true,
    canCreateCollections: true,
    canInviteFriends: Infinity,
    accessToBetaFeatures: true,
    canModerate: true,
    customBadge: true,
  };
}
```

### 5.3 Gamification

#### 5.3.1 Достижения (Achievements)

```typescript
interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  condition: (metrics: UserMetrics) => boolean
  reward: {
    reputationBonus: number
    badge?: string
  }
}

const achievements: Achievement[] = [
  {
    id: 'first-seed',
    name: 'Первый сид',
    description: 'Раздай свой первый файл',
    icon: '🌱',
    condition: (m) => m.uploaded > 0,
    reward: { reputationBonus: 5 },
  },
  {
    id: 'ratio-master',
    name: 'Мастер раздачи',
    description: 'Достигни ratio 2.0',
    icon: '⚡',
    condition: (m) => m.ratio >= 2.0,
    reward: { reputationBonus: 20, badge: 'ratio-master' },
  },
  {
    id: '24-7-seeder',
    name: 'Вечный сидер',
    description: 'Раздавай контент непрерывно 7 дней',
    icon: '♾️',
    condition: (m) => m.consecutiveDays >= 7,
    reward: { reputationBonus: 30 },
  },
  {
    id: 'content-curator',
    name: 'Куратор контента',
    description: 'Загрузи 10 уникальных аниме',
    icon: '📚',
    condition: (m) => m.uniqueContent >= 10,
    reward: { reputationBonus: 50, badge: 'curator' },
  },
  {
    id: 'network-supporter',
    name: 'Опора сети',
    description: 'Помоги 100 пирам',
    icon: '🤝',
    condition: (m) => m.helpedPeers >= 100,
    reward: { reputationBonus: 40 },
  },
]
```

#### 5.3.2 Лидерборд

```typescript
interface Leaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'all-time'
  category: 'ratio' | 'uploaded' | 'seeding-time' | 'reputation'
  entries: Array<{
    rank: number
    userId: string
    username: string
    value: number
    trend: 'up' | 'down' | 'same'
  }>
}
```

### 5.4 Мотивация к долгосрочной раздаче

#### 5.4.1 Bonus Points система

```typescript
class BonusPointsSystem {
  // Начисление bonus points за время сидирования
  calculateBonusPoints(
    contentSize: number,
    seedingTimeHours: number,
    contentAge: number // дни с момента добавления
  ): number {
    // Базовые очки: 1 point за 1GB за 1 час
    const basePoints = (contentSize / 1024 ** 3) * seedingTimeHours

    // Множитель за старый контент (мотивация сидить редкий контент)
    const ageMultiplier =
      contentAge > 180
        ? 2.0 // 2x для контента старше 6 месяцев
        : 1.0 + contentAge / 180 // линейный рост до 2x

    // Множитель за мало-раздаваемый контент
    const rarenessMultiplier = await this.getRarenessMultiplier(contentCID)

    return basePoints * ageMultiplier * rarenessMultiplier
  }

  private async getRarenessMultiplier(cid: string): Promise<number> {
    const seeders = await this.getSeederCount(cid)

    if (seeders < 2) return 3.0 // Критически редкий
    if (seeders < 5) return 2.0 // Редкий
    if (seeders < 10) return 1.5 // Малораспространенный
    return 1.0 // Обычный
  }

  // Использование bonus points
  async spendPoints(userId: string, points: number, action: string) {
    const user = await this.db.getUser(userId)

    if (user.bonusPoints < points) {
      throw new Error('Insufficient bonus points')
    }

    switch (action) {
      case 'boost-download':
        // Временный буст приоритета в swarm
        await this.boostDownloadPriority(userId, 24 /* hours */)
        break

      case 'unlock-premium-content':
        // Доступ к эксклюзивному контенту
        await this.unlockContent(userId, contentId)
        break

      case 'invite-friend':
        // Создание инвайт-кода
        return await this.createInviteCode(userId)
    }

    await this.db.deductBonusPoints(userId, points)
  }
}
```

#### 5.4.2 Freeleech события

```typescript
interface FreeleechEvent {
  id: string
  name: string
  startDate: Date
  endDate: Date
  contentFilter?: {
    genre?: string[]
    year?: number
    tracker?: string
  }
  multiplier: {
    download: number // 0 = freeleech, 0.5 = 50% засчитывается
    upload: number // 1.5 = 150% засчитывается
  }
}

// Пример: Weekend Freeleech
const weekendFreeleech: FreeleechEvent = {
  id: 'weekend-fl-2025-01',
  name: 'Weekend Freeleech',
  startDate: new Date('2025-01-18T00:00:00Z'),
  endDate: new Date('2025-01-20T23:59:59Z'),
  multiplier: {
    download: 0, // Скачивание не считается
    upload: 2.0, // Раздача считается вдвойне
  },
}
```

---

## 6. Система модерации

Децентрализованная модерация с инструментами для эффективного контроля контента.

### 6.1 Уровни модерации

#### 6.1.1 Локальная модерация (Instance-level)

Каждый трекер имеет собственную команду модераторов.

```typescript
interface Moderator {
  userId: string
  permissions: ModeratorPermission[]
  assignedAt: Date
  statistics: {
    actionsTotal: number
    accuracyRate: number // % подтвержденных действий
  }
}

enum ModeratorPermission {
  REVIEW_CONTENT = 'review_content',
  REMOVE_CONTENT = 'remove_content',
  BAN_USERS = 'ban_users',
  MANAGE_REPORTS = 'manage_reports',
  EDIT_METADATA = 'edit_metadata',
}
```

**Модераторские действия:**

```typescript
interface ModerationAction {
  id: string
  moderatorId: string
  targetType: 'content' | 'user' | 'comment'
  targetId: string
  action: 'approve' | 'remove' | 'flag' | 'ban' | 'warn'
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  evidence?: string[] // URLs к скриншотам, логам
  timestamp: Date
  reversible: boolean
  expiresAt?: Date // Для временных банов
}
```

#### 6.1.2 Пользовательская модерация (User-level)

Пользователи могут настраивать собственные фильтры.

```typescript
interface UserModerationSettings {
  blockedUsers: string[]
  blockedTrackers: string[]
  contentFilters: {
    hideNSFW: boolean
    hideGore: boolean
    hideSpoilers: boolean
    customKeywords: string[] // Блокировка по ключевым словам
  }
  trustedUploaders: string[] // Whitelist загрузчиков
}
```

#### 6.1.3 Федеративная модерация (Network-level)

Трекеры могут делиться информацией о проблемном контенте.

```typescript
interface FederatedModerationReport {
  reportId: string
  reportingTracker: string
  contentCID: string
  category: 'copyright' | 'illegal' | 'spam' | 'malware' | 'csam' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  evidence: {
    description: string
    attachments: string[]
    affectedUsers: number
  }
  signature: string // Подпись трекера
  createdAt: Date
}
```

**Обработка федеративных репортов:**

```typescript
class FederatedModerationHandler {
  async processReport(report: FederatedModerationReport) {
    // 1. Верификация подписи
    const tracker = await this.db.getTracker(report.reportingTracker)
    if (!this.verifySignature(report, tracker.publicKey)) {
      return
    }

    // 2. Проверка доверия к трекеру
    if (tracker.trustLevel < TrustLevel.KNOWN) {
      // Низкое доверие - требуется ручное рассмотрение
      await this.queueForManualReview(report)
      return
    }

    // 3. Автоматические действия для critical severity
    if (report.severity === 'critical' && report.category === 'csam') {
      // Немедленная блокировка контента
      await this.blockContent(report.contentCID)
      await this.notifyAuthorities(report)
    }

    // 4. Для остальных - добавляем в очередь
    await this.db.createModerationTicket({
      source: 'federated',
      report,
      status: 'pending',
    })
  }

  async shareReport(contentId: string, category: string) {
    const trustedTrackers = await this.db.getTrustedTrackers()

    const report: FederatedModerationReport = {
      reportId: generateId(),
      reportingTracker: this.trackerUrl,
      contentCID: await this.getContentCID(contentId),
      category,
      severity: this.calculateSeverity(category),
      evidence: await this.collectEvidence(contentId),
      signature: await this.signReport(report),
      createdAt: new Date(),
    }

    // Отправляем всем доверенным трекерам
    await Promise.allSettled(
      trustedTrackers.map((tracker) =>
        fetch(`${tracker.url}/federation/moderation/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        })
      )
    )
  }
}
```

### 6.2 Автоматическая модерация

#### 6.2.1 ML-модели для детекции

```typescript
class ContentModerationML {
  private models = {
    toxicity: null, // Модель детекции токсичного текста
    nsfw: null, // Модель детекции NSFW в изображениях
    spam: null, // Модель детекции спама
  }

  async moderateText(text: string): Promise<ModerationResult> {
    const toxicityScore = await this.models.toxicity.predict(text)

    return {
      safe: toxicityScore < 0.7,
      categories: {
        toxicity: toxicityScore,
        spam: await this.models.spam.predict(text),
      },
      flags: toxicityScore > 0.7 ? ['toxic-content'] : [],
    }
  }

  async moderateImage(imageBuffer: Buffer): Promise<ModerationResult> {
    const nsfwScore = await this.models.nsfw.predict(imageBuffer)

    return {
      safe: nsfwScore < 0.8,
      categories: {
        nsfw: nsfwScore,
      },
      flags: nsfwScore > 0.8 ? ['nsfw-content'] : [],
    }
  }
}
```

#### 6.2.2 Federated Learning для модерации

По примеру **FedMod** из исследований Fediverse:

```typescript
class FederatedModerationLearning {
  async trainLocalModel(instanceId: string) {
    // 1. Тренируем модель на локальных данных
    const localData = await this.db.getModerationData(instanceId)
    const localModel = await this.trainModel(localData)

    // 2. Находим похожие инстансы для коллаборации
    const similarInstances = await this.findSimilarInstances(instanceId)

    // 3. Federated Learning - обмениваемся параметрами модели
    const aggregatedParams = await this.federatedAggregation(localModel, similarInstances)

    // 4. Обновляем локальную модель
    await this.updateModel(instanceId, aggregatedParams)

    return {
      accuracy: await this.evaluateModel(instanceId),
      collaborators: similarInstances.length,
    }
  }

  private async findSimilarInstances(instanceId: string) {
    const myProfile = await this.getInstanceProfile(instanceId)
    const allInstances = await this.db.getAllInstances()

    return allInstances
      .map((instance) => ({
        instance,
        similarity: this.cosineSimilarity(myProfile, instance.profile),
      }))
      .filter(({ similarity }) => similarity > 0.7)
      .slice(0, 10) // Топ-10 похожих
      .map(({ instance }) => instance)
  }
}
```

### 6.3 Система репортов

```typescript
interface UserReport {
  id: string
  reporterId: string
  targetType: 'content' | 'user' | 'comment'
  targetId: string
  category: string
  description: string
  evidence?: {
    screenshots: string[]
    logs: string[]
  }
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  priority: number // Рассчитывается на основе severity и reporter reputation
  createdAt: Date
  assignedTo?: string // moderatorId
  resolution?: {
    action: string
    reason: string
    moderatorId: string
    resolvedAt: Date
  }
}

class ReportingSystem {
  async submitReport(report: Omit<UserReport, 'id' | 'status' | 'priority' | 'createdAt'>) {
    // Валидация репорта
    if (await this.isSpamReport(report)) {
      throw new Error('Spam report detected')
    }

    // Расчет приоритета
    const reporter = await this.db.getUser(report.reporterId)
    const priority = this.calculatePriority(report.category, reporter.reputation)

    // Создание репорта
    const newReport: UserReport = {
      ...report,
      id: generateId(),
      status: 'pending',
      priority,
      createdAt: new Date(),
    }

    await this.db.createReport(newReport)

    // Автоматическое назначение модератору если высокий приоритет
    if (priority > 8) {
      await this.autoAssignModerator(newReport.id)
    }

    return newReport
  }

  private calculatePriority(category: string, reporterReputation: number): number {
    const categoryPriorities = {
      csam: 10,
      illegal: 9,
      copyright: 7,
      spam: 5,
      toxicity: 4,
      other: 3,
    }

    const basePriority = categoryPriorities[category] || 3

    // Репутация репортера влияет на приоритет
    const reputationMultiplier = reporterReputation > 70 ? 1.2 : reporterReputation > 50 ? 1.0 : 0.8

    return Math.min(10, Math.round(basePriority * reputationMultiplier))
  }
}
```

### 6.4 Апелляции

```typescript
interface Appeal {
  id: string
  userId: string
  moderationActionId: string
  reason: string
  evidence: string[]
  status: 'pending' | 'accepted' | 'rejected'
  reviewedBy?: string
  reviewedAt?: Date
  outcome?: {
    decision: string
    actionReversed: boolean
    compensationProvided?: string
  }
}

class AppealSystem {
  async submitAppeal(userId: string, actionId: string, reason: string, evidence: string[]): Promise<Appeal> {
    const action = await this.db.getModerationAction(actionId)

    // Проверка возможности апелляции
    if (!action.reversible) {
      throw new Error('This action cannot be appealed')
    }

    if (Date.now() - action.timestamp.getTime() > 30 * 24 * 3600 * 1000) {
      throw new Error('Appeal period has expired (30 days)')
    }

    const appeal: Appeal = {
      id: generateId(),
      userId,
      moderationActionId: actionId,
      reason,
      evidence,
      status: 'pending',
      createdAt: new Date(),
    }

    await this.db.createAppeal(appeal)

    // Уведомление модераторов
    await this.notifyModerators(appeal)

    return appeal
  }

  async reviewAppeal(appealId: string, moderatorId: string, decision: 'accept' | 'reject') {
    const appeal = await this.db.getAppeal(appealId)
    const action = await this.db.getModerationAction(appeal.moderationActionId)

    if (decision === 'accept') {
      // Отменяем действие
      await this.reverseModerationAction(action)

      // Возможная компенсация (например, bonus points)
      const compensation = this.calculateCompensation(action)
      await this.provideCompensation(appeal.userId, compensation)

      appeal.outcome = {
        decision: 'Appeal accepted',
        actionReversed: true,
        compensationProvided: compensation,
      }
    } else {
      appeal.outcome = {
        decision: 'Appeal rejected',
        actionReversed: false,
      }
    }

    appeal.status = decision === 'accept' ? 'accepted' : 'rejected'
    appeal.reviewedBy = moderatorId
    appeal.reviewedAt = new Date()

    await this.db.updateAppeal(appeal)
  }
}
```

---

## 7. Рейтинги и отзывы

### 7.1 Рейтинговая система

```typescript
interface ContentRating {
  contentId: string
  userId: string
  score: number // 1-10
  review?: string
  tags: string[] // ["great-animation", "slow-pacing"]
  spoilers: boolean
  helpful: number // Количество "полезно"
  createdAt: Date
  updatedAt: Date
}

interface AggregatedRating {
  contentId: string
  averageScore: number
  totalRatings: number
  distribution: {
    // Распределение оценок
    1: number
    2: number
    // ... до 10
  }
  topTags: Array<{
    tag: string
    count: number
    sentiment: 'positive' | 'negative' | 'neutral'
  }>
}
```

### 7.2 Алгоритм агрегации рейтингов

```typescript
class RatingAggregator {
  // Взвешенный рейтинг (Bayesian Average)
  calculateWeightedRating(
    contentRatings: ContentRating[],
    globalAverage: number = 7.0,
    minimumVotes: number = 10
  ): number {
    const totalVotes = contentRatings.length
    const averageRating = contentRatings.reduce((sum, r) => sum + r.score, 0) / totalVotes

    // Байесовское среднее
    const weightedRating = (minimumVotes * globalAverage + totalVotes * averageRating) / (minimumVotes + totalVotes)

    return weightedRating
  }

  // Учет репутации оценщиков
  calculateTrustedRating(ratings: ContentRating[]): number {
    let weightedSum = 0
    let totalWeight = 0

    for (const rating of ratings) {
      const user = await this.db.getUser(rating.userId)
      const weight = this.getUserRatingWeight(user)

      weightedSum += rating.score * weight
      totalWeight += weight
    }

    return weightedSum / totalWeight
  }

  private getUserRatingWeight(user: User): number {
    // Вес зависит от репутации и количества оценок
    const baseWeight = 1.0

    const reputationBonus = user.reputation > 70 ? 1.5 : user.reputation > 50 ? 1.2 : 1.0

    const experienceBonus = user.totalRatings > 100 ? 1.3 : user.totalRatings > 50 ? 1.1 : 1.0

    return baseWeight * reputationBonus * experienceBonus
  }
}
```

### 7.3 Анти-манипуляция

```typescript
class RatingAntiManipulation {
  async detectSuspiciousRatings(contentId: string): Promise<string[]> {
    const ratings = await this.db.getContentRatings(contentId)
    const suspicious: string[] = []

    // 1. Массовые одинаковые оценки за короткий период
    const recentRatings = ratings.filter((r) => Date.now() - r.createdAt.getTime() < 24 * 3600 * 1000)

    const scoreCounts = {}
    for (const rating of recentRatings) {
      scoreCounts[rating.score] = (scoreCounts[rating.score] || 0) + 1
    }

    for (const [score, count] of Object.entries(scoreCounts)) {
      if (count > recentRatings.length * 0.7) {
        suspicious.push(`mass-${score}-bombing`)
      }
    }

    // 2. Новые аккаунты с высокой активностью оценок
    const newAccountRatings = ratings.filter((r) => {
      const user = await this.db.getUser(r.userId)
      const accountAge = Date.now() - user.joinedAt.getTime()
      return accountAge < 7 * 24 * 3600 * 1000 // Младше 7 дней
    })

    if (newAccountRatings.length > ratings.length * 0.3) {
      suspicious.push('new-account-manipulation')
    }

    // 3. Coordinated rating (одинаковое время оценок)
    const timeGroups = this.groupByTime(ratings, 300000) // 5 минут
    for (const group of timeGroups) {
      if (group.length > 10) {
        suspicious.push('coordinated-rating')
      }
    }

    return suspicious
  }

  async quarantineRatings(contentId: string, reason: string) {
    // Временно скрываем подозрительные оценки
    await this.db.updateRatings({
      contentId,
      status: 'quarantined',
      reason,
    })

    // Уведомляем модераторов
    await this.notifyModerators({
      type: 'rating-manipulation',
      contentId,
      reason,
    })
  }
}
```

---

## 8. Распределенная библиотека

### 8.1 Персональная библиотека

```typescript
interface Library {
  userId: string
  collections: Collection[]
  watchHistory: WatchHistoryEntry[]
  statistics: LibraryStatistics
}

interface Collection {
  id: string
  name: string
  description: string
  isPublic: boolean
  items: LibraryItem[]
  createdAt: Date
  updatedAt: Date
}

interface LibraryItem {
  contentId: string
  addedAt: Date
  isPinned: boolean
  pinnedEpisodes: number[]
  watchProgress: {
    [episodeNumber: number]: {
      currentTime: number
      duration: number
      completed: boolean
    }
  }
  customTags: string[]
  notes?: string
}

interface LibraryStatistics {
  totalItems: number
  totalSizePinned: number
  totalWatchTime: number
  genreDistribution: Record<string, number>
  mostWatchedSeries: string[]
}
```

### 8.2 Публичные коллекции

```typescript
interface PublicCollection extends Collection {
  creatorId: string
  followers: number
  rating: number
  tags: string[]
  featured: boolean // Выделенная коллекция трекером
}

class CollectionManager {
  async shareCollection(collectionId: string, publicity: 'public' | 'unlisted' | 'private') {
    const collection = await this.db.getCollection(collectionId)

    if (publicity === 'public') {
      // Публикуем в трекер
      await this.publishToTracker(collection)

      // Генерируем shareable link
      const link = await this.generateShareLink(collection)

      return link
    }
  }

  async followCollection(userId: string, collectionId: string) {
    const collection = await this.db.getPublicCollection(collectionId)

    // Создаем копию в библиотеке пользователя
    await this.db.createCollection({
      userId,
      name: `${collection.name} (from @${collection.creatorId})`,
      items: collection.items,
      sourceCollectionId: collectionId,
      autoSync: true, // Обновлять при изменении источника
    })

    // Уведомляем создателя
    await this.notifyCreator(collection.creatorId, userId)
  }

  async syncFollowedCollections(userId: string) {
    const followed = await this.db.getFollowedCollections(userId)

    for (const collection of followed) {
      if (!collection.autoSync) continue

      const source = await this.db.getPublicCollection(collection.sourceCollectionId)

      // Синхронизируем изменения
      const diff = this.calculateDiff(collection.items, source.items)

      if (diff.added.length > 0 || diff.removed.length > 0) {
        await this.applyDiff(collection.id, diff)

        // Уведомляем пользователя
        await this.notifyUser(userId, `Collection "${collection.name}" updated`)
      }
    }
  }
}
```

### 8.3 Рекомендательная система

```typescript
class RecommendationEngine {
  async getRecommendations(userId: string, limit: number = 20): Promise<Recommendation[]> {
    const user = await this.db.getUser(userId)
    const library = await this.db.getLibrary(userId)

    // 1. Collaborative Filtering
    const similarUsers = await this.findSimilarUsers(userId)
    const cfRecommendations = await this.getCollaborativeRecommendations(userId, similarUsers)

    // 2. Content-Based Filtering
    const favoriteGenres = this.extractFavoriteGenres(library)
    const cbRecommendations = await this.getContentBasedRecommendations(favoriteGenres, library)

    // 3. Trending content
    const trending = await this.getTrendingContent()

    // 4. Weighted combination
    const combined = this.combineRecommendations([
      { source: 'collaborative', items: cfRecommendations, weight: 0.4 },
      { source: 'content-based', items: cbRecommendations, weight: 0.4 },
      { source: 'trending', items: trending, weight: 0.2 },
    ])

    // 5. Filtering (убираем уже просмотренное)
    const filtered = combined.filter((rec) => !library.items.some((item) => item.contentId === rec.contentId))

    return filtered.slice(0, limit)
  }

  private async findSimilarUsers(userId: string): Promise<string[]> {
    const userLibrary = await this.db.getLibrary(userId)
    const allUsers = await this.db.getAllUsers()

    const similarities = await Promise.all(
      allUsers.map(async (otherUser) => {
        if (otherUser.id === userId) return null

        const otherLibrary = await this.db.getLibrary(otherUser.id)
        const similarity = this.jaccardSimilarity(
          userLibrary.items.map((i) => i.contentId),
          otherLibrary.items.map((i) => i.contentId)
        )

        return { userId: otherUser.id, similarity }
      })
    )

    return similarities
      .filter((s) => s !== null && s.similarity > 0.2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 50)
      .map((s) => s.userId)
  }
}
```

### 8.4 Синхронизация между устройствами

```typescript
class CrossDeviceSync {
  async syncLibrary(userId: string, deviceId: string) {
    // 1. Получаем состояние библиотеки на сервере
    const serverLibrary = await this.db.getLibrary(userId)

    // 2. Получаем локальное состояние
    const localLibrary = await this.getLocalLibrary(deviceId)

    // 3. Трехсторонний merge (3-way merge)
    const lastSync = await this.getLastSyncState(userId, deviceId)
    const merged = this.threeWayMerge(serverLibrary, localLibrary, lastSync)

    // 4. Применяем изменения
    await this.db.updateLibrary(userId, merged)
    await this.setLocalLibrary(deviceId, merged)

    // 5. Сохраняем новое состояние синхронизации
    await this.saveLastSyncState(userId, deviceId, merged)

    return {
      conflicts: merged.conflicts,
      itemsAdded: merged.added.length,
      itemsRemoved: merged.removed.length,
      itemsUpdated: merged.updated.length,
    }
  }

  private threeWayMerge(server: Library, local: Library, base: Library): MergeResult {
    const result = {
      items: [],
      conflicts: [],
      added: [],
      removed: [],
      updated: [],
    }

    // Реализация 3-way merge алгоритма
    // ...

    return result
  }
}
```

---

## 9. Технический стек

### 9.1 Клиент (Electron App)

**Основа:**

- **Electron** 28.x
- **React** 18.x
- **TypeScript** 5.x
- **Vite** (сборщик)

**UI:**

- **Chakra UI** 2.x
- **Emotion** (стилизация)
- **Framer Motion** (анимации)
- **React Icons**

**State Management:**

- **TanStack Query** (server state)
- **Zustand** (client state)
- **React Hook Form** / **TanStack Form** (формы)

**IPFS:**

- **js-ipfs** или **ipfs-http-client**
- **hls.js** (HLS playback)

**База данных (локальная):**

- **better-sqlite3** (для библиотеки и кэша)

**Другое:**

- **electron-store** (настройки)
- **electron-updater** (автообновление)

### 9.2 Сервер-трекер

**Runtime:**

- **Bun** 1.x (предпочтительно) или **Node.js** 20.x

**Framework:**

- **Next.js** 14.x (SSR для веб-интерфейса)
- **tRPC** (типобезопасное API)

**База данных:**

- **PostgreSQL** 16
- **Prisma** ORM
- **ZenStack** (access control)

**Кэш и очереди:**

- **Redis** 7.x
- **BullMQ** (job queues)

**Другое:**

- **Zod** (валидация)
- **Jose** (JWT, подписи)

### 9.3 DevOps

**Контейнеризация:**

- **Docker** + **Docker Compose**

**CI/CD:**

- **GitHub Actions**

**Мониторинг:**

- **Prometheus** + **Grafana**
- **Sentry** (error tracking)

**Логирование:**

- **Pino** (структурированные логи)
- **Loki** (агрегация логов)

---

## 10. API спецификации

### 10.1 Client ↔ Tracker API

**Base URL:** `https://tracker.example.com/api/v1`

#### 10.1.1 Аутентификация

```
POST /auth/register
{
  "username": "string",
  "email": "string",
  "password": "string",
  "inviteCode": "string?"
}

Response:
{
  "userId": "string",
  "token": "string"
}
```

```
POST /auth/login
{
  "username": "string",
  "password": "string"
}

Response:
{
  "token": "string",
  "user": User
}
```

#### 10.1.2 Контент

```
GET /content
Query: type, genre, year, limit, offset

Response:
{
  "items": Content[],
  "total": number,
  "hasMore": boolean
}
```

```
GET /content/:id

Response: Content
```

```
GET /search
Query: q, type, limit

Response:
{
  "results": Content[],
  "total": number
}
```

#### 10.1.3 Announce (трекер пиров)

```
POST /announce
{
  "peerId": "string",
  "cids": "string[]",
  "event": "started" | "completed" | "stopped",
  "uploaded": number,
  "downloaded": number,
  "left": number
}

Response:
{
  "interval": number,  // Интервал следующего announce (сек)
  "peers": Peer[]
}
```

#### 10.1.4 Рейтинги

```
POST /ratings
{
  "contentId": "string",
  "score": number,      // 1-10
  "review": "string?",
  "tags": "string[]",
  "spoilers": boolean
}

Response: Rating
```

```
GET /ratings/:contentId

Response:
{
  "ratings": Rating[],
  "aggregated": AggregatedRating
}
```

### 10.2 Tracker ↔ Tracker API (Federation)

**Base URL:** `https://tracker.example.com/federation`

#### 10.2.1 Discovery

```
GET /.well-known/webfinger
Query: resource=acct:tracker@example.com

Response:
{
  "subject": "acct:tracker@example.com",
  "links": [{
    "rel": "self",
    "type": "application/activity+json",
    "href": "https://tracker.example.com/federation/actor"
  }]
}
```

```
GET /actor

Response: ActivityPub Actor
```

#### 10.2.2 Content Sync

```
GET /content
Query: since, type, limit, offset

Response:
{
  "contents": ActivityStreams[],
  "signature": "string"
}
```

#### 10.2.3 Statistics

```
GET /announces/:cid

Response:
{
  "seeders": number,
  "leechers": number,
  "peers": Peer[]
}
```

#### 10.2.4 Moderation

```
POST /moderation/report
{
  "reportId": "string",
  "contentCID": "string",
  "category": "string",
  "severity": "string",
  "evidence": object,
  "signature": "string"
}
```

---

## 11. База данных

### 11.1 Схема Prisma (основные модели)

```prisma
// Полная схема уже была определена ранее в разделе 4.1.3
// Здесь дополнительные модели

model User {
  id            String   @id @default(cuid())
  username      String   @unique
  email         String   @unique
  passwordHash  String

  peerId        String?  @unique  // IPFS Peer ID

  reputation    Int      @default(0)
  rank          String   @default("Newcomer")

  uploaded      BigInt   @default(0)
  downloaded    BigInt   @default(0)

  bonusPoints   Int      @default(0)

  joinedAt      DateTime @default(now())
  lastActive    DateTime @default(now())

  library       Library?
  ratings       Rating[]
  reports       Report[]

  @@index([username])
  @@index([peerId])
}

model Library {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])

  collections Collection[]

  statistics  Json     // LibraryStatistics

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Collection {
  id          String   @id @default(cuid())
  libraryId   String
  library     Library  @relation(fields: [libraryId], references: [id])

  name        String
  description String?
  isPublic    Boolean  @default(false)

  items       CollectionItem[]

  followers   Int      @default(0)
  rating      Float?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([libraryId])
}

model CollectionItem {
  id           String     @id @default(cuid())
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id])

  contentId    String
  content      Content    @relation(fields: [contentId], references: [id])

  isPinned     Boolean    @default(false)
  customTags   String[]
  notes        String?

  addedAt      DateTime   @default(now())

  @@unique([collectionId, contentId])
  @@index([contentId])
}

model Rating {
  id         String   @id @default(cuid())

  userId     String
  user       User     @relation(fields: [userId], references: [id])

  contentId  String
  content    Content  @relation(fields: [contentId], references: [id])

  score      Int      // 1-10
  review     String?
  tags       String[]
  spoilers   Boolean  @default(false)

  helpful    Int      @default(0)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([userId, contentId])
  @@index([contentId])
}

model Report {
  id          String   @id @default(cuid())

  reporterId  String
  reporter    User     @relation(fields: [reporterId], references: [id])

  targetType  String   // "content", "user", "comment"
  targetId    String

  category    String
  description String
  evidence    Json?

  status      String   @default("pending")
  priority    Int

  assignedTo  String?

  createdAt   DateTime @default(now())

  resolution  Json?

  @@index([status, priority])
  @@index([targetType, targetId])
}

// ... остальные модели из раздела 4
```

### 11.2 Индексы и оптимизация

```sql
-- Индексы для быстрого поиска
CREATE INDEX idx_content_type_year ON "Content" (type, year);
CREATE INDEX idx_content_genres ON "Content" USING GIN (genres);
CREATE INDEX idx_episode_video_cid ON "Episode" (videoCID);

-- Индексы для announce
CREATE INDEX idx_peer_announce_timestamp ON "PeerAnnounce" (episodeId, timestamp DESC);

-- Full-text search
CREATE INDEX idx_content_fulltext ON "Content" USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(description, ''))
);
```

---

## 12. Безопасность

### 12.1 Аутентификация и авторизация

**JWT токены:**

```typescript
interface JWTPayload {
  userId: string
  username: string
  rank: string
  iat: number
  exp: number
}

// Генерация токена
async function generateToken(user: User): Promise<string> {
  const secret = process.env.JWT_SECRET!

  return await new SignJWT({
    userId: user.id,
    username: user.username,
    rank: user.rank,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret))
}

// Верификация
async function verifyToken(token: string): Promise<JWTPayload> {
  const secret = process.env.JWT_SECRET!

  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))

  return payload as JWTPayload
}
```

**Permissions (через ZenStack):**

```zmodel
model Content {
  // ... поля

  @@allow('read', true)  // Все могут читать
  @@allow('create', auth().rank == 'Contributor' || auth().rank == 'Veteran')
  @@allow('update', auth() == uploader)
  @@allow('delete', auth() == uploader || auth().canModerate)
}
```

### 12.2 Защита от атак

**Rate Limiting:**

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // Макс. 100 запросов
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', limiter)

// Stricter limits для критичных endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5, // Макс. 5 попыток
})

app.use('/api/auth/login', authLimiter)
```

**CSRF Protection:**

```typescript
import csrf from 'csurf'

const csrfProtection = csrf({ cookie: true })

app.post('/api/sensitive-action', csrfProtection, async (req, res) => {
  // ...
})
```

**Input Validation:**

```typescript
import { z } from 'zod'

const ContentCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  episodes: z.array(
    z.object({
      number: z.number().int().positive(),
      videoCID: z.string().regex(/^Qm[a-zA-Z0-9]{44}$/),
    })
  ),
})

app.post('/api/content', async (req, res) => {
  const data = ContentCreateSchema.parse(req.body)
  // ...
})
```

### 12.3 IPFS Security

**Только доверенный контент:**

```typescript
class IPFSSecurityManager {
  private trustedUploaders = new Set<string>()

  async validateContent(cid: string, uploaderId: string): Promise<boolean> {
    // 1. Проверка загрузчика
    if (!this.trustedUploaders.has(uploaderId)) {
      const uploader = await this.db.getUser(uploaderId)
      if (uploader.rank === 'Newcomer') {
        return false // Новички не могут загружать
      }
    }

    // 2. Сканирование на вредоносный контент
    const suspicious = await this.scanForMalware(cid)
    if (suspicious) {
      await this.reportMalware(cid, uploaderId)
      return false
    }

    return true
  }

  private async scanForMalware(cid: string): Promise<boolean> {
    // Проверка через ClamAV или подобное
    // ...
    return false
  }
}
```

**Sandboxing для untrusted content:**

```typescript
// Не загружаем контент автоматически от непроверенных источников
// Показываем preview только после подтверждения пользователя

async function loadUntrustedContent(cid: string) {
  const userConfirmed = await showWarningDialog('This content is from an untrusted source. Load anyway?')

  if (!userConfirmed) return

  // Загружаем в изолированную среду
  await ipfs.cat(cid, { timeout: 10000 })
}
```

---

## 13. UI/UX компоненты

### 13.1 Главный экран

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  [Logo] [Search]           [User] [Settings] [≡]    │
├─────────────────────────────────────────────────────┤
│ ┌─────────┐                                         │
│ │         │  Рекомендуемое                          │
│ │ Sidebar │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│ │         │  │     │ │     │ │     │ │     │       │
│ │ - Home  │  │ Img │ │ Img │ │ Img │ │ Img │       │
│ │ - Lib   │  │     │ │     │ │     │ │     │       │
│ │ - Browse│  └─────┘ └─────┘ └─────┘ └─────┘       │
│ │ - Top   │                                         │
│ │         │  Сейчас раздаю                          │
│ │ Stats:  │  ┌─────────────────────────────┐        │
│ │ ↑ 5MB/s │  │ Frieren Ep 12 ━━━━●─────  │        │
│ │ ↓ 2MB/s │  │ 8 seeders | 120GB        │        │
│ │ 23 peers│  └─────────────────────────────┘        │
│ └─────────┘                                         │
└─────────────────────────────────────────────────────┘
```

**Компоненты:**

```tsx
// Sidebar
<Box w="250px" bg="gray.800" p={4}>
  <VStack spacing={4} align="stretch">
    <Link to="/">
      <HStack>
        <Icon as={FiHome} />
        <Text>Главная</Text>
      </HStack>
    </Link>

    <Link to="/library">
      <HStack>
        <Icon as={FiBookmark} />
        <Text>Моя библиотека</Text>
        <Badge>{libraryCount}</Badge>
      </HStack>
    </Link>

    <Divider />

    <SeedingIndicator />
  </VStack>
</Box>

// Seeding Indicator
<Card p={3}>
  <VStack align="stretch" spacing={2}>
    <HStack justify="space-between">
      <HStack>
        <Icon as={FiUpload} color="green.400" />
        <Text fontSize="sm">Раздача</Text>
      </HStack>
      <Text fontSize="sm" fontWeight="bold">
        {formatBandwidth(uploadSpeed)}
      </Text>
    </HStack>

    <HStack justify="space-between">
      <HStack>
        <Icon as={FiDownload} color="blue.400" />
        <Text fontSize="sm">Загрузка</Text>
      </HStack>
      <Text fontSize="sm" fontWeight="bold">
        {formatBandwidth(downloadSpeed)}
      </Text>
    </HStack>

    <HStack justify="space-between">
      <HStack>
        <Icon as={FiUsers} />
        <Text fontSize="sm">Пиры</Text>
      </HStack>
      <Text fontSize="sm" fontWeight="bold">{peerCount}</Text>
    </HStack>
  </VStack>
</Card>
```

### 13.2 Плеер

```tsx
<Box position="relative" bg="black" h="100vh">
  {/* Видео */}
  <video ref={videoRef} src={videoUrl} style={{ width: '100%', height: '100%' }} />

  {/* Controls */}
  <Box position="absolute" bottom={0} left={0} right={0} bg="blackAlpha.700" p={4}>
    <VStack spacing={2}>
      {/* Progress bar */}
      <Slider value={progress} onChange={seek}>
        <SliderTrack>
          <SliderFilledTrack />
        </SliderTrack>
        <SliderThumb />
      </Slider>

      <HStack w="100%" justify="space-between">
        {/* Play/Pause */}
        <HStack>
          <IconButton icon={playing ? <FiPause /> : <FiPlay />} onClick={togglePlay} />
          <Text>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </HStack>

        {/* Settings */}
        <HStack>
          <Menu>
            <MenuButton as={IconButton} icon={<FiSettings />} />
            <MenuList>
              <MenuItem>Качество: 1080p</MenuItem>
              <MenuItem>Субтитры: Русский</MenuItem>
              <MenuItem>Скорость: 1x</MenuItem>
            </MenuList>
          </Menu>

          <IconButton icon={<FiMaximize />} onClick={toggleFullscreen} />
        </HStack>
      </HStack>
    </VStack>
  </Box>

  {/* IPFS Loading indicator */}
  {isBuffering && (
    <Box position="absolute" top="50%" left="50%">
      <Spinner size="xl" />
      <Text mt={2}>Загрузка из IPFS...</Text>
      <Text fontSize="sm" color="gray.400">
        {seeders} сидов | {formatBandwidth(downloadSpeed)}
      </Text>
    </Box>
  )}
</Box>
```

### 13.3 Библиотека

```tsx
<Box p={6}>
  <Heading mb={4}>Моя библиотека</Heading>

  {/* Stats */}
  <SimpleGrid columns={4} spacing={4} mb={6}>
    <Stat>
      <StatLabel>Аниме</StatLabel>
      <StatNumber>{stats.totalItems}</StatNumber>
    </Stat>

    <Stat>
      <StatLabel>Закреплено</StatLabel>
      <StatNumber>{formatBytes(stats.totalSizePinned)}</StatNumber>
    </Stat>

    <Stat>
      <StatLabel>Просмотрено</StatLabel>
      <StatNumber>{formatTime(stats.totalWatchTime)}</StatNumber>
    </Stat>

    <Stat>
      <StatLabel>Раздано</StatLabel>
      <StatNumber>{formatBytes(stats.totalUploaded)}</StatNumber>
    </Stat>
  </SimpleGrid>

  {/* Filters */}
  <HStack mb={4}>
    <Select placeholder="Все жанры" w="200px">
      <option>Action</option>
      <option>Comedy</option>
      <option>Drama</option>
    </Select>

    <Select placeholder="Сортировка" w="200px">
      <option>Недавно добавленные</option>
      <option>По названию</option>
      <option>По рейтингу</option>
    </Select>

    <Spacer />

    <ButtonGroup>
      <IconButton icon={<FiGrid />} />
      <IconButton icon={<FiList />} />
    </ButtonGroup>
  </HStack>

  {/* Grid */}
  <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
    {library.map((item) => (
      <AnimeCard key={item.id} anime={item} />
    ))}
  </Grid>
</Box>
```

---

## 14. Развертывание и масштабирование

### 14.1 Docker Compose для трекера

```yaml
version: '3.8'

services:
  tracker:
    build: .
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/tracker
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      - db
      - redis
    volumes:
      - ./data:/app/data

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: tracker
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - tracker

volumes:
  postgres_data:
  redis_data:
```

### 14.2 Масштабирование

**Horizontal scaling для трекера:**

```yaml
# docker-compose.scale.yml
services:
  tracker:
    deploy:
      replicas: 3

  load-balancer:
    image: haproxy:alpine
    ports:
      - '80:80'
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg
```

**Sharding для PostgreSQL (при необходимости):**

```typescript
// Разделение по геолокации пользователей
function getUserShard(userId: string): string {
  const user = await db.getUser(userId)

  if (user.country === 'RU') return 'shard-ru'
  if (user.country === 'US') return 'shard-us'
  return 'shard-default'
}
```

### 14.3 CDN для статики

```typescript
// Использование CDN для обложек, постеров
const CDN_URL = process.env.CDN_URL || 'https://cdn.tracker.example.com'

function getCoverUrl(cid: string): string {
  // Фоллбек: попытка загрузить через CDN, если не получилось - через IPFS gateway
  return `${CDN_URL}/ipfs/${cid}`
}
```

---

## 15. Дорожная карта

### 15.1 Phase 1: MVP (3-4 месяца)

**Месяц 1-2: Основа**

- ✅ Базовая архитектура клиента (Electron + React)
- ✅ IPFS нода интеграция
- ✅ Видео-плеер с HLS поддержкой
- ✅ Базовая система пининга
- ✅ Минимальная библиотека

**Месяц 3: Трекер**

- ✅ Сервер-трекер (Next.js + PostgreSQL)
- ✅ API для announce
- ✅ Базовая система учета пиров
- ✅ Простой веб-интерфейс

**Месяц 4: Запуск**

- ✅ Тестирование P2P раздачи
- ✅ Первый публичный трекер
- ✅ Базовая документация
- ✅ Alpha-релиз для тестеров

### 15.2 Phase 2: Федерация (2-3 месяца)

**Месяц 5-6:**

- Federation API (ActivityPub)
- Синхронизация контента между трекерами
- WebFinger для discovery
- Доверие и репутация трекеров

**Месяц 7:**

- Тестирование федерации с 2-3 трекерами
- Агрегация статистики сидов
- Beta-релиз

### 15.3 Phase 3: Репутация и Gamification (2 месяца)

**Месяц 8:**

- Система репутации
- Ранги и уровни
- Достижения
- Bonus points

**Месяц 9:**

- Лидерборды
- Freeleech события
- Инвайт-система

### 15.4 Phase 4: Модерация (1-2 месяца)

**Месяц 10:**

- Локальная модерация
- Система репортов
- Автоматическая детекция (ML)
- Апелляции

**Месяц 11:**

- Федеративная модерация
- Пользовательские фильтры

### 15.5 Phase 5: Улучшения (ongoing)

**Месяц 12+:**

- Рекомендательная система
- Публичные коллекции
- Mobile приложение (React Native?)
- Улучшение производительности
- Дополнительные функции по запросу сообщества

---

## Заключение

Данное техническое задание описывает полноценную федеративную P2P платформу для аниме-контента, объединяющую:

1. **Децентрализацию** через IPFS
2. **Федерацию** по примеру Mastodon/Fediverse
3. **Мотивацию** через репутацию и gamification
4. **Модерацию** на трех уровнях (локальная, федеративная, пользовательская)
5. **Качество контента** через рейтинги и отзывы

Платформа спроектирована с учетом лучших практик из BitTorrent, ActivityPub, Fediverse и современных P2P исследований.

Ключевые преимущества:

- Цензуроустойчивость
- Отсутствие единой точки отказа
- Мотивация к долгосрочной раздаче
- Гибкая модерация
- Возможность создавать собственные тематические трекеры

Следующий шаг - начать разработку MVP согласно дорожной карте.

---

**Вопросы для обсуждения:**

1. Использовать js-ipfs или go-ipfs через IPC?
2. Какой протокол подписи для федерации (RSA, Ed25519)?
3. Нужна ли поддержка торрент-файлов для совместимости?
4. Какую ML-модель использовать для автомодерации?
5. Mobile приложение - приоритет или нет?

**Контакты:**

- GitHub: [ссылка на репозиторий]
- Discord: [ссылка на сервер сообщества]
- Email: dev@anime-ipfs.org
