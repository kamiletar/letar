/**
 * @letar/video-player-react
 *
 * React bindings для @letar/video-player-core
 *
 * @example
 * ```tsx
 * import { useShakaPlayer, useAudioSync, usePlayerControls, SubtitleOverlay } from '@letar/video-player-react'
 * import { SKIP_TIME, toPlayableUrl } from '@letar/video-player-core'
 * import shaka from 'shaka-player'
 *
 * function VideoPlayer({ src, subtitleUrl }) {
 *   const containerRef = useRef<HTMLDivElement>(null)
 *   const audioRef = useRef<HTMLAudioElement>(null)
 *   const usesSeparateAudioRef = useRef(true)
 *
 *   const { videoRef, isVideoReady } = useShakaPlayer({
 *     src,
 *     containerRef,
 *     audioRef,
 *     usesSeparateAudioRef,
 *     ShakaClass: shaka,
 *   })
 *
 *   useAudioSync({ videoRef, audioRef, usesSeparateAudio: true, isVideoReady })
 *
 *   const { togglePlay, toggleMute } = usePlayerControls({
 *     videoRef,
 *     audioRef,
 *     containerRef,
 *     usesSeparateAudio: true,
 *     usesSeparateAudioRef,
 *     duration: 0,
 *     setIsMuted: () => {},
 *   })
 *
 *   return (
 *     <div ref={containerRef} onClick={togglePlay}>
 *       <audio ref={audioRef} />
 *       <SubtitleOverlay videoRef={videoRef} subtitleUrl={subtitleUrl} />
 *     </div>
 *   )
 * }
 * ```
 */

// Hooks
export * from './hooks'

// Components
export * from './components'

// Types
export * from './types'

// Utils
export * from './utils'

// Theme
export * from './theme'
