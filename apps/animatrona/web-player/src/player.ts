/**
 * Animatrona Web Player — Vanilla JS Player
 *
 * Standalone плеер для IPFS-распространённого контента.
 * Работает с manifest.json для загрузки эпизодов.
 */

/** Типы из shared/types/web-player.ts (дублируем для standalone) */
interface WebPlayerManifest {
  version: number
  type: 'anime' | 'movie'
  anime: {
    name: string
    originalName?: string
    year?: number
    poster?: string
  }
  episodes: Array<{
    number: number
    name?: string
    season: number
    duration: number
    video: string
    audio: Array<{
      language: string
      title: string
      src: string
    }>
    subtitles: Array<{
      language: string
      title: string
      format: 'ass' | 'srt' | 'vtt'
      src: string
      fonts?: string[]
    }>
    chapters?: Array<{
      start: number
      end: number
      title: string
      type: string
    }>
  }>
  defaults: {
    audioTrack?: string
    subtitleTrack?: string
  }
  resourceMode: 'embedded' | 'referenced'
}

/** Настройки IPFS Gateway */
const IPFS_GATEWAYS = [
  'http://127.0.0.1:8081/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
]

/**
 * Безопасное создание элемента episode item
 */
function createEpisodeItem(ep: WebPlayerManifest['episodes'][0], index: number): HTMLDivElement {
  const item = document.createElement('div')
  item.className = 'episode-item'
  item.dataset.index = String(index)

  const numberSpan = document.createElement('span')
  numberSpan.className = 'episode-number'
  numberSpan.textContent = String(ep.number)

  const nameSpan = document.createElement('span')
  nameSpan.className = 'episode-name'
  nameSpan.textContent = ep.name || `Episode ${ep.number}`

  item.appendChild(numberSpan)
  item.appendChild(nameSpan)

  return item
}

/**
 * Безопасное создание элемента dropdown item
 */
function createDropdownItem(text: string, isActive: boolean): HTMLButtonElement {
  const item = document.createElement('button')
  item.className = 'dropdown-item' + (isActive ? ' active' : '')
  item.textContent = text
  return item
}

/**
 * Главный класс Web Player
 */
class WebPlayer {
  private manifest: WebPlayerManifest | null = null
  private currentEpisodeIndex = 0
  private currentAudioTrack: string | null = null
  private currentSubtitleTrack: string | null = null

  // DOM elements
  private video: HTMLVideoElement
  private audio: HTMLAudioElement
  private videoWrapper: HTMLElement
  private controls: HTMLElement
  private progressBar: HTMLElement
  private progressPlayed: HTMLElement
  private progressBuffered: HTMLElement
  private volumeSlider: HTMLInputElement
  private episodeList: HTMLElement
  private subtitleOverlay: HTMLElement

  // State
  private isSeeking = false
  private controlsTimeout: number | null = null
  private audioSyncInterval: number | null = null

  constructor() {
    // Get DOM elements
    this.video = document.getElementById('video') as HTMLVideoElement
    this.audio = document.getElementById('audio') as HTMLAudioElement
    this.videoWrapper = document.getElementById('video-wrapper') as HTMLElement
    this.controls = document.getElementById('controls') as HTMLElement
    this.progressBar = document.getElementById('progress-bar') as HTMLElement
    this.progressPlayed = document.getElementById('progress-played') as HTMLElement
    this.progressBuffered = document.getElementById('progress-buffered') as HTMLElement
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement
    this.episodeList = document.getElementById('episode-list') as HTMLElement
    this.subtitleOverlay = document.getElementById('subtitle-overlay') as HTMLElement

    this.init()
  }

  private async init(): Promise<void> {
    try {
      // Load manifest
      const response = await fetch('../manifest.json')
      if (!response.ok) {
        throw new Error('Failed to load manifest.json')
      }
      this.manifest = await response.json()

      // Update UI
      this.updateAnimeInfo()
      this.renderEpisodeList()
      this.setupEventListeners()

      // Load first episode
      if (this.manifest!.episodes.length > 0) {
        await this.loadEpisode(0)
      }
    } catch (error) {
      console.error('Failed to initialize player:', error)
      this.showError('Failed to load manifest.json')
    }
  }

  private updateAnimeInfo(): void {
    if (!this.manifest) return

    const titleEl = document.getElementById('anime-title')
    const yearEl = document.getElementById('anime-year')

    if (titleEl) titleEl.textContent = this.manifest.anime.name
    if (yearEl && this.manifest.anime.year) {
      yearEl.textContent = String(this.manifest.anime.year)
    }

    // Update page title
    document.title = `${this.manifest.anime.name} — Web Player`
  }

  private renderEpisodeList(): void {
    if (!this.manifest) return

    // Очищаем список безопасно
    while (this.episodeList.firstChild) {
      this.episodeList.removeChild(this.episodeList.firstChild)
    }

    this.manifest.episodes.forEach((ep, index) => {
      const item = createEpisodeItem(ep, index)
      item.addEventListener('click', () => this.loadEpisode(index))
      this.episodeList.appendChild(item)
    })
  }

  private async loadEpisode(index: number): Promise<void> {
    if (!this.manifest || index < 0 || index >= this.manifest.episodes.length) return

    const episode = this.manifest.episodes[index]
    this.currentEpisodeIndex = index

    // Update episode list UI
    this.episodeList.querySelectorAll('.episode-item').forEach((item, i) => {
      item.classList.toggle('active', i === index)
    })

    // Update episode title
    const titleEl = document.getElementById('episode-title')
    if (titleEl) {
      titleEl.textContent = `S${episode.season}E${episode.number} — ${episode.name || 'Episode ' + episode.number}`
    }

    // Get video URL
    const videoUrl = this.getResourceUrl(episode.video)
    this.video.src = videoUrl

    // Load default audio track (or first one)
    const defaultAudioKey = this.manifest.defaults.audioTrack
    const audioTrack = defaultAudioKey
      ? episode.audio.find((a) => `${a.language}:${a.title}` === defaultAudioKey)
      : episode.audio[0]

    if (audioTrack && episode.audio.length > 0) {
      await this.selectAudioTrack(`${audioTrack.language}:${audioTrack.title}`)
    }

    // Load default subtitle track
    const defaultSubKey = this.manifest.defaults.subtitleTrack
    if (defaultSubKey) {
      const subTrack = episode.subtitles.find((s) => `${s.language}:${s.title}` === defaultSubKey)
      if (subTrack) {
        await this.selectSubtitleTrack(`${subTrack.language}:${subTrack.title}`)
      }
    }

    // Update track menus
    this.updateAudioMenu()
    this.updateSubtitleMenu()

    // Start playback
    this.video.load()
    this.video.play().catch(() => {
      // Autoplay blocked, show paused state
      this.videoWrapper.classList.add('paused')
    })
  }

  private getResourceUrl(src: string): string {
    if (!this.manifest) return src

    // If embedded mode or relative path, return as-is
    if (this.manifest.resourceMode === 'embedded' || src.startsWith('./') || src.startsWith('../')) {
      return '../' + src
    }

    // Referenced mode — use IPFS gateway
    // Try local gateway first, then public ones
    return IPFS_GATEWAYS[0] + src
  }

  private async selectAudioTrack(key: string): Promise<void> {
    if (!this.manifest) return

    const episode = this.manifest.episodes[this.currentEpisodeIndex]
    const track = episode.audio.find((a) => `${a.language}:${a.title}` === key)
    if (!track) return

    this.currentAudioTrack = key
    const audioUrl = this.getResourceUrl(track.src)

    // Sync audio position with video
    const currentTime = this.video.currentTime
    const wasPlaying = !this.video.paused

    this.audio.src = audioUrl
    this.audio.currentTime = currentTime
    this.audio.volume = this.video.volume
    this.audio.muted = this.video.muted

    if (wasPlaying) {
      await this.audio.play().catch(console.error)
    }

    // Start audio sync
    this.startAudioSync()
    this.updateAudioMenu()
  }

  private async selectSubtitleTrack(key: string | null): Promise<void> {
    if (!this.manifest) return

    this.currentSubtitleTrack = key
    this.subtitleOverlay.textContent = ''

    if (!key) {
      this.updateSubtitleMenu()
      return
    }

    const episode = this.manifest.episodes[this.currentEpisodeIndex]
    const track = episode.subtitles.find((s) => `${s.language}:${s.title}` === key)
    if (!track) return

    // Примечание: этот dev-плеер не используется в production.
    // Экспортируемый плеер (asset-bundler.ts) использует SubtitlesOctopus для ASS субтитров.
    this.updateSubtitleMenu()
  }

  private startAudioSync(): void {
    if (this.audioSyncInterval) {
      clearInterval(this.audioSyncInterval)
    }

    this.audioSyncInterval = window.setInterval(() => {
      if (Math.abs(this.video.currentTime - this.audio.currentTime) > 0.1) {
        this.audio.currentTime = this.video.currentTime
      }
    }, 1000)
  }

  private updateAudioMenu(): void {
    if (!this.manifest) return

    const menu = document.getElementById('audio-menu')
    if (!menu) return

    const episode = this.manifest.episodes[this.currentEpisodeIndex]

    // Очищаем меню безопасно
    while (menu.firstChild) {
      menu.removeChild(menu.firstChild)
    }

    episode.audio.forEach((track) => {
      const key = `${track.language}:${track.title}`
      const item = createDropdownItem(
        `${track.title} (${track.language.toUpperCase()})`,
        key === this.currentAudioTrack,
      )
      item.addEventListener('click', () => {
        this.selectAudioTrack(key)
        this.closeDropdowns()
      })
      menu.appendChild(item)
    })
  }

  private updateSubtitleMenu(): void {
    if (!this.manifest) return

    const menu = document.getElementById('subtitle-menu')
    if (!menu) return

    const episode = this.manifest.episodes[this.currentEpisodeIndex]

    // Очищаем меню безопасно
    while (menu.firstChild) {
      menu.removeChild(menu.firstChild)
    }

    // "Off" option
    const offItem = createDropdownItem('Off', !this.currentSubtitleTrack)
    offItem.addEventListener('click', () => {
      this.selectSubtitleTrack(null)
      this.closeDropdowns()
    })
    menu.appendChild(offItem)

    episode.subtitles.forEach((track) => {
      const key = `${track.language}:${track.title}`
      const item = createDropdownItem(
        `${track.title} (${track.language.toUpperCase()})`,
        key === this.currentSubtitleTrack,
      )
      item.addEventListener('click', () => {
        this.selectSubtitleTrack(key)
        this.closeDropdowns()
      })
      menu.appendChild(item)
    })
  }

  private setupEventListeners(): void {
    // Play/Pause
    const btnPlay = document.getElementById('btn-play')
    btnPlay?.addEventListener('click', () => this.togglePlay())
    this.video.addEventListener('click', () => this.togglePlay())

    // Video events
    this.video.addEventListener('play', () => {
      this.videoWrapper.classList.remove('paused')
      this.audio.play().catch(console.error)
    })

    this.video.addEventListener('pause', () => {
      this.videoWrapper.classList.add('paused')
      this.audio.pause()
    })

    this.video.addEventListener('timeupdate', () => this.updateProgress())
    this.video.addEventListener('progress', () => this.updateBuffered())
    this.video.addEventListener('loadedmetadata', () => this.updateDuration())
    this.video.addEventListener('ended', () => this.onEnded())

    // Progress bar
    this.progressBar.addEventListener('click', (e) => this.seekToPosition(e))
    this.progressBar.addEventListener('mousedown', () => (this.isSeeking = true))
    document.addEventListener('mouseup', () => (this.isSeeking = false))
    document.addEventListener('mousemove', (e) => {
      if (this.isSeeking) this.seekToPosition(e)
    })

    // Volume
    this.volumeSlider.addEventListener('input', () => {
      const volume = parseFloat(this.volumeSlider.value)
      this.video.volume = volume
      this.audio.volume = volume
      this.videoWrapper.classList.toggle('muted', volume === 0)
    })

    const btnMute = document.getElementById('btn-mute')
    btnMute?.addEventListener('click', () => this.toggleMute())

    // Rewind/Forward
    const btnRewind = document.getElementById('btn-rewind')
    const btnForward = document.getElementById('btn-forward')
    btnRewind?.addEventListener('click', () => this.seek(-10))
    btnForward?.addEventListener('click', () => this.seek(10))

    // Fullscreen
    const btnFullscreen = document.getElementById('btn-fullscreen')
    btnFullscreen?.addEventListener('click', () => this.toggleFullscreen())

    // Dropdowns
    document.getElementById('btn-audio')?.addEventListener('click', () => {
      this.toggleDropdown('audio-dropdown')
    })
    document.getElementById('btn-subtitle')?.addEventListener('click', () => {
      this.toggleDropdown('subtitle-dropdown')
    })

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (!target.closest('.dropdown')) {
        this.closeDropdowns()
      }
    })

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e))

    // Controls auto-hide
    this.videoWrapper.addEventListener('mousemove', () => this.showControls())
    this.videoWrapper.addEventListener('mouseleave', () => this.hideControls())

    // Initial state
    this.videoWrapper.classList.add('paused')
  }

  private togglePlay(): void {
    if (this.video.paused) {
      this.video.play().catch(console.error)
    } else {
      this.video.pause()
    }
  }

  private toggleMute(): void {
    const muted = !this.video.muted
    this.video.muted = muted
    this.audio.muted = muted
    this.videoWrapper.classList.toggle('muted', muted)
  }

  private seek(delta: number): void {
    const newTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + delta))
    this.video.currentTime = newTime
    this.audio.currentTime = newTime
  }

  private seekToPosition(e: MouseEvent): void {
    const rect = this.progressBar.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const time = percent * this.video.duration
    this.video.currentTime = time
    this.audio.currentTime = time
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      this.videoWrapper.classList.remove('fullscreen')
    } else {
      this.videoWrapper.requestFullscreen()
      this.videoWrapper.classList.add('fullscreen')
    }
  }

  private toggleDropdown(id: string): void {
    const dropdown = document.getElementById(id)
    if (!dropdown) return

    const isOpen = dropdown.classList.contains('open')
    this.closeDropdowns()
    if (!isOpen) {
      dropdown.classList.add('open')
    }
  }

  private closeDropdowns(): void {
    document.querySelectorAll('.dropdown').forEach((d) => d.classList.remove('open'))
  }

  private updateProgress(): void {
    if (!this.video.duration) return
    const percent = (this.video.currentTime / this.video.duration) * 100
    this.progressPlayed.style.width = `${percent}%`

    // Update time display
    const current = document.getElementById('time-current')
    if (current) current.textContent = this.formatTime(this.video.currentTime)
  }

  private updateBuffered(): void {
    if (!this.video.duration || this.video.buffered.length === 0) return
    const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1)
    const percent = (bufferedEnd / this.video.duration) * 100
    this.progressBuffered.style.width = `${percent}%`
  }

  private updateDuration(): void {
    const duration = document.getElementById('time-duration')
    if (duration) duration.textContent = this.formatTime(this.video.duration)
  }

  private onEnded(): void {
    // Auto-play next episode
    if (this.manifest && this.currentEpisodeIndex < this.manifest.episodes.length - 1) {
      this.loadEpisode(this.currentEpisodeIndex + 1)
    }
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  private showControls(): void {
    this.controls.classList.add('visible')
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout)
    }
    this.controlsTimeout = window.setTimeout(() => this.hideControls(), 3000)
  }

  private hideControls(): void {
    if (!this.video.paused) {
      this.controls.classList.remove('visible')
    }
  }

  private handleKeyboard(e: KeyboardEvent): void {
    // Ignore if typing in input
    if ((e.target as HTMLElement).tagName === 'INPUT') return

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault()
        this.togglePlay()
        break
      case 'ArrowLeft':
      case 'j':
        e.preventDefault()
        this.seek(-10)
        break
      case 'ArrowRight':
      case 'l':
        e.preventDefault()
        this.seek(10)
        break
      case 'ArrowUp':
        e.preventDefault()
        this.video.volume = Math.min(1, this.video.volume + 0.1)
        this.audio.volume = this.video.volume
        this.volumeSlider.value = String(this.video.volume)
        break
      case 'ArrowDown':
        e.preventDefault()
        this.video.volume = Math.max(0, this.video.volume - 0.1)
        this.audio.volume = this.video.volume
        this.volumeSlider.value = String(this.video.volume)
        break
      case 'm':
        this.toggleMute()
        break
      case 'f':
        this.toggleFullscreen()
        break
    }
  }

  private showError(message: string): void {
    const titleEl = document.getElementById('anime-title')
    if (titleEl) titleEl.textContent = message
  }
}

// Initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new WebPlayer()
})
