/**
 * Sync Module — P2P синхронизация через Kubo PubSub/IPNS
 *
 * P2P синхронизация данных между устройствами.
 * Использует SQLite (Prisma) для хранения и Kubo для P2P.
 */

export { generateFriendCode, isValidFriendCodeFormat, normalizeFriendCode, verifyFriendCode } from './friend-code'
export { FriendRequestsSync, getFriendRequestsSync } from './friend-requests-sync'
export { PresenceSync, getPresenceSync } from './presence-sync'
export { UserProfileSync, getUserProfileSync } from './user-profile-sync'
export { WatchPartySync, getWatchPartySync } from './watch-party-sync'
export { WatchProgressSync, getWatchProgressSync } from './watch-progress-sync'
