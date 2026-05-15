/**
 * Mobile Server — модуль для доступа к библиотеке с мобильных устройств
 *
 * Экспортирует singleton сервера и утилиты.
 */

export { MobileServer, getMobileServer, type MobileServerOptions } from './server'
export type {
  IpInfo,
  MobileAnime,
  MobileAudioTrack,
  MobileEpisode,
  MobileServerInfo,
  MobileServerStatus,
  MobileSubtitleTrack,
  MobileWatchProgress,
} from './types'
export { generateQRCode, getAllLocalIPs, getLocalIP } from './utils'
