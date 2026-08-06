/**
 * Preload — Социальные функции
 *
 * Профиль, друзья, presence, Watch Party, Deep Links.
 */

import { ipcRenderer } from 'electron'
import type {
  Friend,
  FriendRequest,
  PresenceMessage,
  PresenceSettings,
  UserProfile,
  UserProfileUpdate,
  WatchingInfo,
  WatchPartyChatMessage,
  WatchPartyInvite,
  WatchPartyParticipant,
  WatchPartyPlaybackState,
  WatchPartyRoom,
} from '../../shared/types/orbitdb'
import { on } from './ipc-helper'

/** Profile (профиль пользователя и Friend Code) */
export const profilePreload = {
  /** Получить профиль пользователя */
  get: (): Promise<{ success: boolean; data?: UserProfile | null; error?: string }> =>
    ipcRenderer.invoke('profile:get'),

  /** Обновить профиль пользователя */
  update: (updates: UserProfileUpdate): Promise<{ success: boolean; data?: UserProfile | null; error?: string }> =>
    ipcRenderer.invoke('profile:update', updates),

  /** Получить PeerId текущего пользователя */
  getPeerId: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('profile:get-peer-id'),

  /** Получить Friend Code текущего пользователя */
  getFriendCode: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('friend-code:get'),

  /** Сгенерировать Friend Code из PeerId */
  generateFriendCode: (peerId: string): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('friend-code:generate', peerId),

  /** Верифицировать Friend Code */
  verifyFriendCode: (code: string, peerId: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('friend-code:verify', code, peerId),

  /** Проверить формат Friend Code */
  validateFriendCodeFormat: (code: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('friend-code:validate-format', code),

  /** Подписка на обновления профиля */
  onUpdated: on<[UserProfile]>('profile:updated'),
}

/** Friends (друзья и запросы в друзья) */
export const friendsPreload = {
  /** Получить список друзей */
  list: (): Promise<{ success: boolean; data?: Friend[]; error?: string }> => ipcRenderer.invoke('friends:list'),

  /** Удалить из друзей */
  remove: (peerId: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('friends:remove', peerId),

  /** Заблокировать пользователя */
  block: (peerId: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('friends:block', peerId),

  /** Проверить блокировку */
  isBlocked: (peerId: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('friends:is-blocked', peerId),

  /** Отправить запрос в друзья */
  sendRequest: (targetPeerId: string): Promise<{ success: boolean; data?: FriendRequest | null; error?: string }> =>
    ipcRenderer.invoke('friend-request:send', targetPeerId),

  /** Получить входящие запросы */
  getIncomingRequests: (): Promise<{ success: boolean; data?: FriendRequest[]; error?: string }> =>
    ipcRenderer.invoke('friend-request:incoming'),

  /** Получить исходящие запросы */
  getOutgoingRequests: (): Promise<{ success: boolean; data?: FriendRequest[]; error?: string }> =>
    ipcRenderer.invoke('friend-request:outgoing'),

  /** Принять запрос */
  acceptRequest: (requestId: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('friend-request:accept', requestId),

  /** Отклонить запрос */
  rejectRequest: (requestId: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('friend-request:reject', requestId),

  /** Подписка на новые запросы */
  onRequestReceived: on<[FriendRequest]>('friend-request:received'),

  /** Подписка на обновление запросов */
  onRequestUpdated: on<[FriendRequest]>('friend-request:updated'),

  /** Подписка на обновление списка друзей */
  onFriendsUpdated: on<[Friend[]]>('friends:updated'),
}

/** Presence (онлайн-статусы) */
export const presencePreload = {
  /** Запустить presence сервис */
  start: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('presence:start'),

  /** Остановить presence сервис */
  stop: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('presence:stop'),

  /** Обновить настройки presence */
  updateSettings: (settings: Partial<PresenceSettings>): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('presence:updateSettings', settings),

  /** Обновить watching статус */
  setWatching: (watching: WatchingInfo | undefined): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('presence:setWatching', watching),

  /** Получить presence друга */
  getFriendPresence: (peerId: string): Promise<{ success: boolean; data?: PresenceMessage | null; error?: string }> =>
    ipcRenderer.invoke('presence:getFriendPresence', peerId),

  /** Получить все presence */
  getAllPresence: (): Promise<{ success: boolean; data?: Record<string, PresenceMessage>; error?: string }> =>
    ipcRenderer.invoke('presence:getAllPresence'),

  /** Проверить онлайн-статус друга */
  isFriendOnline: (peerId: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('presence:isFriendOnline', peerId),

  /** Подписка на обновление presence */
  onPresenceUpdated: on<[{ peerId: string; presence: PresenceMessage }]>('presence:updated'),

  /** Подписка на переход друга в онлайн */
  onFriendOnline: on<[string]>('presence:friendOnline'),

  /** Подписка на переход друга в оффлайн */
  onFriendOffline: on<[string]>('presence:friendOffline'),
}

/** Watch Party (совместный просмотр) */
export const watchPartyPreload = {
  /** Создать комнату */
  create: (options: {
    name: string
    animeName: string
    episodeNumber: number
    filePath?: string
    contentCid?: string
    isPrivate?: boolean
    maxParticipants?: number
  }): Promise<{ success: boolean; data?: WatchPartyRoom | null; error?: string }> =>
    ipcRenderer.invoke('watch-party:create', options),

  /** Присоединиться к комнате */
  join: (roomId: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('watch-party:join', roomId),

  /** Покинуть комнату */
  leave: (): Promise<{ success: boolean; data?: boolean; error?: string }> => ipcRenderer.invoke('watch-party:leave'),

  /** Закрыть комнату (только хост) */
  close: (): Promise<{ success: boolean; data?: boolean; error?: string }> => ipcRenderer.invoke('watch-party:close'),

  /** Получить текущую комнату */
  getCurrent: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('watch-party:getCurrent'),

  /** Получить участников */
  getParticipants: (): Promise<{ success: boolean; data?: WatchPartyParticipant[]; error?: string }> =>
    ipcRenderer.invoke('watch-party:getParticipants'),

  /** Получить состояние playback */
  getPlaybackState: (): Promise<{ success: boolean; data?: WatchPartyPlaybackState | null; error?: string }> =>
    ipcRenderer.invoke('watch-party:getPlaybackState'),

  /** Play */
  play: (): Promise<{ success: boolean; data?: boolean; error?: string }> => ipcRenderer.invoke('watch-party:play'),

  /** Pause */
  pause: (): Promise<{ success: boolean; data?: boolean; error?: string }> => ipcRenderer.invoke('watch-party:pause'),

  /** Seek */
  seek: (position: number): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('watch-party:seek', position),

  /** Отправить сообщение */
  sendMessage: (text: string): Promise<{ success: boolean; data?: WatchPartyChatMessage | null; error?: string }> =>
    ipcRenderer.invoke('watch-party:sendMessage', text),

  /** Отправить реакцию */
  sendReaction: (
    reaction: string,
  ): Promise<{ success: boolean; data?: WatchPartyChatMessage | null; error?: string }> =>
    ipcRenderer.invoke('watch-party:sendReaction', reaction),

  /** Подписка на обновление playback */
  onPlaybackUpdated: on<[{ roomId: string; state: WatchPartyPlaybackState }]>('watch-party:playbackUpdated'),

  /** Подписка на присоединение участника */
  onParticipantJoined: on<[{ roomId: string; participant: WatchPartyParticipant }]>('watch-party:participantJoined'),

  /** Подписка на уход участника */
  onParticipantLeft: on<[{ roomId: string; peerId: string }]>('watch-party:participantLeft'),

  /** Подписка на сообщения чата */
  onMessageReceived: on<[{ roomId: string; message: WatchPartyChatMessage }]>('watch-party:messageReceived'),

  /** Подписка на закрытие комнаты */
  onRoomClosed: on<[{ roomId: string }]>('watch-party:roomClosed'),
}

/** Deep Link API */
export const deepLinkPreload = {
  /** Подписаться на deep links */
  subscribe: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('deep-link:subscribe'),

  /** Отписаться от deep links */
  unsubscribe: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('deep-link:unsubscribe'),

  /** Сгенерировать invite для Watch Party */
  generateWatchPartyInvite: (
    roomId: string,
    roomName: string,
    hostName: string,
    animeName: string,
  ): Promise<{ success: boolean; data?: WatchPartyInvite; error?: string }> =>
    ipcRenderer.invoke('deep-link:generateWatchPartyInvite', roomId, roomName, hostName, animeName),

  /** Сгенерировать link для добавления друга */
  generateFriendLink: (friendCode: string): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('deep-link:generateFriendLink', friendCode),

  /** Показать уведомление о приглашении */
  showInviteNotification: (invite: WatchPartyInvite): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('deep-link:showInviteNotification', invite),

  /** Проверить, поддерживаются ли уведомления */
  notificationsSupported: (): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('deep-link:notificationsSupported'),

  /** Подписка на получение deep link */
  onReceived: on<[{ type: 'party_join' | 'friend_add' | 'unknown'; data: Record<string, string> }]>(
    'deep-link:received',
  ),
}
