/**
 * Sync Module — P2P синхронизация через Kubo PubSub/IPNS
 *
 * P2P синхронизация данных между устройствами.
 * Использует SQLite (Prisma) для хранения и Kubo для P2P.
 */

export { generateFriendCode, isValidFriendCodeFormat, normalizeFriendCode, verifyFriendCode } from './friend-code'
export { FriendRequestsSync, getFriendRequestsSync } from './friend-requests-sync'
export { getPresenceSync, PresenceSync } from './presence-sync'
export { getUserProfileSync, UserProfileSync } from './user-profile-sync'
export { getWatchPartySync, WatchPartySync } from './watch-party-sync'
export { getWatchProgressSync, WatchProgressSync } from './watch-progress-sync'
