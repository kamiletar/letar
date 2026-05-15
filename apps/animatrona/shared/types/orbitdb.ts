/**
 * Sync типы для Animatrona
 *
 * Типы для P2P синхронизации данных через Kubo PubSub/IPNS.
 * (Файл сохраняет имя orbitdb.ts для обратной совместимости импортов)
 */

// === User Profile ===

/**
 * Профиль пользователя
 */
export interface UserProfile {
  /** PeerId пользователя */
  peerId: string
  /** Отображаемое имя */
  displayName: string
  /** Friend Code (XXXX-XXXX) */
  friendCode: string
  /** URL аватара (data URL или IPFS CID) */
  avatarUrl?: string
  /** Цвет аватара (для генерации) */
  avatarColor?: string
  /** Статус (пользовательский текст) */
  status?: string
  /** Время создания профиля */
  createdAt: number
  /** Время последнего обновления */
  updatedAt: number
}

/**
 * Данные для обновления профиля
 */
export interface UserProfileUpdate {
  displayName?: string
  avatarUrl?: string
  avatarColor?: string
  status?: string
}

// === Friends ===

/**
 * Статус дружбы
 */
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked'

/**
 * Запрос в друзья
 */
export interface FriendRequest {
  /** Уникальный ID запроса */
  id: string
  /** PeerId отправителя */
  fromPeerId: string
  /** Friend Code отправителя */
  fromFriendCode: string
  /** Имя отправителя */
  fromDisplayName: string
  /** PeerId получателя */
  toPeerId: string
  /** Статус запроса */
  status: FriendshipStatus
  /** Время отправки */
  sentAt: number
  /** Время ответа (accept/reject) */
  respondedAt?: number
}

/**
 * Друг в списке
 */
export interface Friend {
  /** PeerId друга */
  peerId: string
  /** Friend Code */
  friendCode: string
  /** Отображаемое имя */
  displayName: string
  /** URL аватара */
  avatarUrl?: string
  /** Онлайн статус */
  isOnline: boolean
  /** Что сейчас смотрит (если включено) */
  watching?: WatchingInfo
  /** Время последней активности */
  lastSeenAt: number
  /** Время добавления в друзья */
  friendsSince: number
}

/**
 * Информация о текущем просмотре (для presence)
 */
export interface WatchingInfo {
  /** Название аниме */
  animeName: string
  /** Номер эпизода */
  episodeNumber: number
  /** Текущая позиция (примерно) */
  progress: number
}

// === Presence ===

/**
 * Presence сообщение (через Kubo PubSub)
 */
export interface PresenceMessage {
  /** PeerId отправителя */
  peerId: string
  /** Friend Code */
  friendCode: string
  /** Статус */
  status: 'online' | 'away' | 'dnd' | 'offline'
  /** Что сейчас смотрит */
  watching?: WatchingInfo
  /** Timestamp сообщения */
  timestamp: number
}

/**
 * Настройки приватности presence
 */
export interface PresenceSettings {
  /** Показывать свой онлайн статус */
  showOnlineStatus: boolean
  /** Показывать что смотришь */
  showWatching: boolean
  /** Интервал broadcast в секундах */
  broadcastInterval: number
}

// === Watch Party ===

/**
 * Комната Watch Party
 */
export interface WatchPartyRoom {
  /** Уникальный ID комнаты */
  id: string
  /** Название комнаты */
  name: string
  /** PeerId хоста */
  hostPeerId: string
  /** Имя хоста */
  hostName: string
  /** Текущее аниме */
  animeName: string
  /** Текущий эпизод */
  episodeNumber: number
  /** Путь к файлу (для локального контента) */
  filePath?: string
  /** CID контента (для IPFS) */
  contentCid?: string
  /** Комната активна */
  isActive: boolean
  /** Приватная комната (по приглашению) */
  isPrivate: boolean
  /** Максимум участников */
  maxParticipants: number
  /** Время создания */
  createdAt: number
}

/**
 * Участник Watch Party
 */
export interface WatchPartyParticipant {
  /** PeerId участника */
  peerId: string
  /** Имя участника */
  displayName: string
  /** URL аватара */
  avatarUrl?: string
  /** Роль: host/guest */
  role: 'host' | 'guest'
  /** Готовность к синхронизации */
  isReady: boolean
  /** Текущая позиция (для отображения рассинхрона) */
  currentPosition: number
  /** Время присоединения */
  joinedAt: number
}

/**
 * Состояние воспроизведения Watch Party
 */
export interface WatchPartyPlaybackState {
  /** Воспроизведение активно */
  isPlaying: boolean
  /** Текущая позиция (секунды) */
  position: number
  /** Скорость воспроизведения */
  playbackRate: number
  /** Timestamp этого состояния (для синхронизации) */
  timestamp: number
  /** PeerId того, кто изменил состояние */
  changedBy: string
}

/**
 * Сообщение синхронизации Watch Party (через Kubo PubSub)
 */
export interface WatchPartySyncMessage {
  /** Тип сообщения */
  type: 'play' | 'pause' | 'seek' | 'ready' | 'position_update'
  /** ID комнаты */
  roomId: string
  /** PeerId отправителя */
  senderId: string
  /** Позиция (для seek/position_update) */
  position?: number
  /** Timestamp отправки */
  timestamp: number
}

/**
 * Сообщение чата Watch Party
 */
export interface WatchPartyChatMessage {
  /** Уникальный ID сообщения */
  id: string
  /** ID комнаты */
  roomId: string
  /** PeerId отправителя */
  senderId: string
  /** Имя отправителя */
  senderName: string
  /** Текст сообщения */
  text: string
  /** Реакция (emoji) вместо текста */
  reaction?: string
  /** Timestamp отправки */
  timestamp: number
}

/**
 * Настройки Watch Party
 */
export interface WatchPartySettings {
  /** Автоматически синхронизировать позицию */
  autoSync: boolean
  /** Порог рассинхрона для предупреждения (секунды) */
  syncThreshold: number
  /** Показывать уведомления о сообщениях */
  showChatNotifications: boolean
}

/**
 * Приглашение в Watch Party
 */
export interface WatchPartyInvite {
  /** ID комнаты */
  roomId: string
  /** Название комнаты */
  roomName: string
  /** Имя хоста */
  hostName: string
  /** Аниме */
  animeName: string
  /** Deep link: animatrona://party/join/<roomId> */
  deepLink: string
  /** Время создания приглашения */
  createdAt: number
  /** Время истечения (24 часа) */
  expiresAt: number
}

// === Sync Events ===

/**
 * Событие запроса в друзья
 */
export interface FriendRequestReceivedEvent {
  request: FriendRequest
}

/**
 * Событие обновления presence
 */
export interface PresenceUpdatedEvent {
  peerId: string
  presence: PresenceMessage
}

/**
 * Событие Watch Party
 */
export interface WatchPartyEvent {
  type: 'playback_updated' | 'participant_joined' | 'participant_left' | 'message_received' | 'room_closed'
  roomId: string
  data: WatchPartyPlaybackState | WatchPartyParticipant | WatchPartyChatMessage | null
}
