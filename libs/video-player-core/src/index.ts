/**
 * @letar/video-player-core
 *
 * Vanilla JS ядро видеоплеера на базе Shaka Player
 *
 * @example
 * ```ts
 * import { ShakaPlayerManager, AudioSyncManager } from '@letar/video-player-core'
 * import shaka from 'shaka-player'
 *
 * const manager = new ShakaPlayerManager({ container: document.getElementById('player')! })
 * await manager.init({ src: 'video.mp4', Shaka: shaka })
 *
 * manager.on('ready', () => console.log('Ready!'))
 * manager.on('timeupdate', ({ currentTime }) => console.log(currentTime))
 *
 * manager.play()
 * manager.destroy()
 * ```
 */

// Constants
export * from './constants'

// Types
export * from './types'

// Utils
export * from './utils'

// Managers
export * from './managers'
