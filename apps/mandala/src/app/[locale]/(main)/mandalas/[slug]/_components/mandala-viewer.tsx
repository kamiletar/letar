'use client'

/**
 * Компонент просмотра мандалы с анимацией и эффектами.
 */

import { Box, Button, Grid, Heading, IconButton, Portal, Spinner, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuLayoutGrid, LuMaximize, LuMinimize } from 'react-icons/lu'
import { BLEND_EFFECTS } from '../_constants/viewer-constants'
import { useAudioAnalyzer } from '../_hooks/use-audio-analyzer'
import { useAudioKeyboardShortcuts } from '../_hooks/use-audio-keyboard-shortcuts'
import { useAudioPlayback } from '../_hooks/use-audio-playback'
import { useAudioSyncedEffects } from '../_hooks/use-audio-synced-effects'
import { useBreathingScale } from '../_hooks/use-breathing-scale'
import { useCustomAudioTracks } from '../_hooks/use-custom-audio-tracks'
import { useFullscreenControls } from '../_hooks/use-fullscreen-controls'
import { useGestureControls } from '../_hooks/use-gesture-controls'
import { useHueRotateEffect } from '../_hooks/use-hue-rotate-effect'
import { useMandalaNavigation } from '../_hooks/use-mandala-navigation'
import { useViewerSettingsStorage } from '../_hooks/use-viewer-settings-storage'
import type { AtmospherePresetId, ViewerSettings } from '../_schemas/viewer-settings.schema'
import { AudioProgressRing } from './audio-progress-ring'
import { AudioSpectrumVisualizer } from './audio-spectrum-visualizer'
import { BreathingOverlay } from './breathing-overlay'
import { CustomAudioManager } from './custom-audio-manager'
import { EffectLayerRenderer } from './effect-layer-renderer'
import { FloatingMiniPlayer } from './floating-mini-player'
import { GlowOverlay } from './glow-overlay'
import { MandalaCanvas } from './mandala-canvas'
import { MandalaCarousel } from './mandala-carousel'
import { type AdjacentMandala, MandalaNavigation } from './mandala-navigation'
import { MeditationAudioPlayer } from './meditation-audio-player'
import { MeditationTimer } from './meditation-timer'
import { NightModeOverlay } from './night-mode-overlay'
import { QuickPresets } from './quick-presets'
import { ShareButton } from './share-button'
import { ViewerControls } from './viewer-controls'
import { VignetteOverlay } from './vignette-overlay'

// Динамические импорты для тяжёлых компонентов (снижение bundle size)
const BreathingGuide = dynamic(() => import('./breathing-guide').then((m) => m.BreathingGuide), {
  ssr: false,
  loading: () => null,
})

const SoundscapeSelector = dynamic(() => import('./soundscape-selector').then((m) => m.SoundscapeSelector), {
  ssr: false,
  loading: () => (
    <Box position="fixed" inset={0} bg="blackAlpha.900" display="flex" alignItems="center" justifyContent="center">
      <Spinner size="xl" color="purple.400" />
    </Box>
  ),
})

// =============================================================================
// Типы
// =============================================================================

/** Мандала с разрешёнными URL для отображения */
interface MandalaWithUrls {
  slug: string
  name: string
  description: string | null
  isSquare: boolean
  defaultEffectIndex: number
  imageUrl: string
  centerImageUrl: string | null
  watermarkUrl: string | null
}

interface MandalaViewerProps {
  mandala: MandalaWithUrls
  /** Все мандалы для навигации */
  allMandalas: AdjacentMandala[]
  /** Начальный индекс в массиве */
  initialIndex: number
}

// =============================================================================
// Компонент
// =============================================================================

export function MandalaViewer({ mandala, allMandalas, initialIndex }: MandalaViewerProps) {
  const t = useTranslations('viewer.aria')
  const searchParams = useSearchParams()
  const router = useRouter()

  // Инициализация fullscreen из URL параметра
  const initialFullscreen = searchParams.get('fullscreen') === '1'
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen)

  // Настройки с автосохранением в localStorage
  const { settings, updateSettings } = useViewerSettingsStorage(mandala.slug, mandala.defaultEffectIndex)

  // Ref на audio элемент для Web Audio API анализа
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  // Кастомные аудио-треки пользователя (из OPFS)
  const { tracks: customTracks, addTrack, removeTrack, getFileUrl } = useCustomAudioTracks()
  const [isTrackManagerOpen, setIsTrackManagerOpen] = useState(false)
  const [customTrackBlobUrl, setCustomTrackBlobUrl] = useState<string | null>(null)
  const [isSoundscapeOpen, setIsSoundscapeOpen] = useState(false)
  const [isCarouselOpen, setIsCarouselOpen] = useState(false)
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false)

  // Ref для контейнера (жесты)
  const viewerContainerRef = useRef<HTMLDivElement>(null)

  // Навигация между мандалами
  const { currentIndex, displayedMandala, prevMandala, nextMandala, navigateToMandala } = useMandalaNavigation({
    allMandalas,
    initialIndex,
  })

  // Обработчик изменения настроек
  const handleSettingsChange = useCallback(
    (newSettings: Partial<ViewerSettings>) => {
      updateSettings(newSettings)
    },
    [updateSettings]
  )

  // Browser fullscreen (скрывает панель браузера)
  const toggleBrowserFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsBrowserFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsBrowserFullscreen(false)
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }, [])

  // Отслеживание изменений browser fullscreen (ESC и т.д.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Fullscreen контролы (visibility, keyboard, wheel)
  const { controlsVisible, hideControls } = useFullscreenControls({
    initialFullscreen,
    isFullscreen,
    onExitFullscreen: () => setIsFullscreen(false),
    spinDuration: settings.spinDuration,
    onSpinDurationChange: (duration) => handleSettingsChange({ spinDuration: duration }),
    isCarouselOpen,
    onToggleCarousel: () => setIsCarouselOpen((prev) => !prev),
    onCloseCarousel: () => setIsCarouselOpen(false),
  })

  // Аудио playback
  const {
    isPlaying,
    audioProgress,
    currentTime,
    duration,
    currentTrackName,
    currentPlaylistIndex,
    playlistLength,
    playlist,
    handlePlayPause,
    handleNextTrack,
    handlePrevTrack,
    handleSeek,
    switchToTrack,
    toggleRepeatMode,
    toggleShuffle,
    handleReorder,
  } = useAudioPlayback({
    audioElement,
    audioTrack: settings.audioTrack,
    customAudioTrackId: settings.customAudioTrackId,
    customTracks,
    repeatMode: settings.repeatMode,
    isShuffled: settings.isShuffled,
    onSettingsChange: handleSettingsChange,
  })

  // Загрузка blob URL при выборе кастомного трека
  useEffect(() => {
    if (!settings.customAudioTrackId) {
      setCustomTrackBlobUrl(null)
      return
    }
    getFileUrl(settings.customAudioTrackId).then(setCustomTrackBlobUrl)
  }, [settings.customAudioTrackId, getFileUrl])

  // Режим дыхания отключает аудио-синхронизацию
  const audioSyncDisabled = settings.breathingEnabled

  // Анализ аудио через Web Audio API (отключен при режиме дыхания)
  // При микрофоне audioElement не используется, но анализатор всё равно работает
  const audioAnalyzerData = useAudioAnalyzer(
    audioElement,
    !audioSyncDisabled && settings.audioSyncEnabled && settings.audioSyncMode !== 'off',
    settings.audioSource
  )

  // Вычисление синхронизированных эффектов
  const audioSyncedEffects = useAudioSyncedEffects({
    analyzerData: audioAnalyzerData,
    mode: settings.audioSyncMode,
    enabled: !audioSyncDisabled && settings.audioEnabled && settings.audioSyncEnabled,
    bassSensitivity: settings.bassSensitivity,
    beatSensitivity: settings.beatSensitivity,
    beatPulseEnabled: settings.beatPulseEnabled,
    adaptiveGradientEnabled: settings.adaptiveGradientEnabled,
    adaptiveSpinEnabled: settings.adaptiveSpinEnabled,
  })

  // Hue-rotate эффект (цветовое вращение)
  const hueAngle = useHueRotateEffect(audioAnalyzerData, {
    enabled: settings.hueRotateEnabled,
    mode: settings.hueRotateMode,
    baseSpeed: settings.hueRotateBaseSpeed,
    bassModulation: settings.hueRotateBassModulation,
    beatJumpSize: settings.hueRotateBeatJump,
    smoothing: settings.hueRotateSmoothing,
    audioSyncMode: settings.audioSyncMode,
  })

  // Масштаб для режима дыхания (вдох → 1.0, выдох → 0.12)
  // Синхронизирован с BreathingGuide через режим дыхания
  const { scale: breathingScale } = useBreathingScale({
    enabled: settings.breathingEnabled,
    mode: settings.breathingMode,
    minScale: 0.12,
    maxScale: 1.0,
  })

  // Клавиатурные сокращения
  useAudioKeyboardShortcuts({
    settings,
    onSettingsChange: handleSettingsChange,
    enabled: isFullscreen,
    onPlayPause: handlePlayPause,
    onNextTrack: handleNextTrack,
    onPrevTrack: handlePrevTrack,
    onToggleSpectrum: () => handleSettingsChange({ showSpectrum: !settings.showSpectrum }),
  })

  // Жестовое управление
  useGestureControls({
    containerRef: viewerContainerRef,
    enabled: isFullscreen,
    onVolumeChange: (delta) => {
      const newVolume = Math.max(0, Math.min(100, settings.audioVolume + delta * 50))
      handleSettingsChange({ audioVolume: Math.round(newVolume) })
    },
    onSeek: (deltaSeconds) => {
      if (audioElement) {
        audioElement.currentTime = Math.max(0, Math.min(audioElement.duration, audioElement.currentTime + deltaSeconds))
      }
    },
    onDoubleTap: handlePlayPause,
  })

  // Итоговый масштаб мандалы: дыхание + лёгкая аудио-модуляция, либо чистый beatScale
  const mandalaScale = settings.breathingEnabled
    ? breathingScale * (1 + audioSyncedEffects.pulseIntensity * 0.02) // Лёгкая пульсация (+2% на пике баса)
    : audioSyncedEffects.beatScale

  // Изображение для отображения (в fullscreen может отличаться от prop mandala)
  const displayedImageUrl = isFullscreen ? displayedMandala.imageUrl : mandala.imageUrl
  const displayedCenterImageUrl = isFullscreen ? displayedMandala.centerImageUrl : mandala.centerImageUrl
  const displayedIsSquare = isFullscreen ? displayedMandala.isSquare : mandala.isSquare

  // Вычисляемые значения эффектов
  const activeEffect = useMemo(() => BLEND_EFFECTS[settings.effectIndex] || 'disabled', [settings.effectIndex])
  const isEffectEnabled = activeEffect !== 'disabled'

  // Мемоизированные группы настроек для предотвращения лишних ререндеров дочерних компонентов
  const canvasSettings = useMemo(
    () => ({
      spinDuration: settings.spinDuration,
      isPaused: settings.isPaused,
      isReverse: settings.isReverse,
      crossfadeDuration: settings.crossfadeDuration,
    }),
    [settings.spinDuration, settings.isPaused, settings.isReverse, settings.crossfadeDuration]
  )

  const glowSettings = useMemo(
    () => ({
      glowEnabled: settings.glowEnabled,
      glowColor: settings.glowColor,
      glowIntensity: settings.glowIntensity,
    }),
    [settings.glowEnabled, settings.glowColor, settings.glowIntensity]
  )

  const effectSettings = useMemo(
    () => ({
      effectType: settings.effectType,
      gradientDuration: settings.gradientDuration,
    }),
    [settings.effectType, settings.gradientDuration]
  )

  const vignetteSettings = useMemo(
    () => ({
      vignetteEnabled: settings.vignetteEnabled,
      vignetteIntensity: settings.vignetteIntensity,
    }),
    [settings.vignetteEnabled, settings.vignetteIntensity]
  )

  // Обработчик выбора пресета
  const handlePresetSelect = useCallback(
    (presetId: AtmospherePresetId, presetSettings: Partial<ViewerSettings>) => {
      updateSettings({
        ...presetSettings,
        currentPreset: presetId,
      })
    },
    [updateSettings]
  )

  // Стабильные callbacks для MeditationTimer — избегаем рестарта интервала
  const handleMeditationComplete = useCallback(() => {
    handleSettingsChange({ meditationEnabled: false })
  }, [handleSettingsChange])

  const handleMeditationCancel = useCallback(() => {
    handleSettingsChange({ meditationEnabled: false })
  }, [handleSettingsChange])

  // Редирект при выходе из fullscreen, если мандала изменилась
  useEffect(() => {
    if (!isFullscreen && displayedMandala.slug !== mandala.slug) {
      router.replace(`/mandalas/${displayedMandala.slug}`)
      router.refresh()
    }
  }, [isFullscreen, displayedMandala.slug, mandala.slug, router])

  // Автопереход на следующую мандалу
  useEffect(() => {
    if (!isFullscreen || !settings.autoNextEnabled || !nextMandala) {
      return
    }

    const timer = setTimeout(() => {
      navigateToMandala(nextMandala.slug)
    }, settings.autoNextInterval * 1000)

    return () => clearTimeout(timer)
  }, [isFullscreen, settings.autoNextEnabled, settings.autoNextInterval, nextMandala, navigateToMandala])

  // =========================================================================
  // Fullscreen режим
  // =========================================================================
  if (isFullscreen) {
    return (
      <>
        <Box
          ref={viewerContainerRef}
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={9999}
          bg="black"
          overflow="hidden"
        >
          {/* Canvas-анимация мандалы */}
          <MandalaCanvas
            imageUrl={displayedImageUrl}
            centerImageUrl={displayedCenterImageUrl}
            isSquare={displayedIsSquare}
            spinDuration={canvasSettings.spinDuration}
            isPaused={canvasSettings.isPaused}
            isReverse={canvasSettings.isReverse}
            spinSpeedMultiplier={audioSyncedEffects.spinSpeedMultiplier}
            beatScale={mandalaScale}
            crossfadeDuration={canvasSettings.crossfadeDuration}
            hueAngle={hueAngle}
          />

          {/* Свечение */}
          <GlowOverlay
            enabled={glowSettings.glowEnabled}
            color={glowSettings.glowColor}
            intensity={glowSettings.glowIntensity}
            pulseIntensity={audioSyncedEffects.pulseIntensity}
          />

          {/* Анимированный эффект слоя */}
          <EffectLayerRenderer
            enabled={isEffectEnabled}
            effectType={effectSettings.effectType}
            mixBlendMode={activeEffect}
            gradientDuration={effectSettings.gradientDuration}
            speedMultiplier={audioSyncedEffects.gradientSpeedMultiplier}
          />

          {/* Виньетка */}
          <VignetteOverlay
            enabled={vignetteSettings.vignetteEnabled}
            intensity={vignetteSettings.vignetteIntensity}
            pulseIntensity={audioSyncedEffects.pulseIntensity}
          />

          {/* Ночной режим */}
          <NightModeOverlay enabled={settings.nightMode} />

          {/* Анимация дыхания */}
          <BreathingOverlay enabled={settings.breathingEnabled && !settings.showBreathingRing} />
          <BreathingGuide
            enabled={settings.breathingEnabled && settings.showBreathingRing}
            mode={settings.breathingMode}
            showRing={settings.showBreathingRing}
            showHints={true}
          />

          {/* Кольцо прогресса аудио */}
          <AudioProgressRing
            audioElement={audioElement}
            visible={settings.audioEnabled && settings.showProgressRing && controlsVisible}
            pulseIntensity={audioSyncedEffects.pulseIntensity}
            pulseEnabled={settings.audioSyncEnabled}
          />

          {/* Спектр-визуализатор */}
          <AudioSpectrumVisualizer
            audioElement={audioElement}
            visible={settings.audioEnabled && settings.showSpectrum}
            color={settings.spectrumColor}
            intensity={settings.spectrumIntensity}
          />

          {/* Таймер медитации */}
          <MeditationTimer
            enabled={settings.meditationEnabled}
            duration={settings.meditationDuration}
            onComplete={handleMeditationComplete}
            onCancel={handleMeditationCancel}
            visible={controlsVisible}
          />

          {/* Фоновая музыка */}
          <MeditationAudioPlayer
            enabled={settings.audioEnabled}
            trackId={settings.audioTrack}
            customTrackBlobUrl={customTrackBlobUrl}
            volume={settings.audioVolume}
            onAudioRef={setAudioElement}
          />

          {/* Навигация */}
          <MandalaNavigation
            prevMandala={prevMandala}
            nextMandala={nextMandala}
            variant="fullscreen"
            isVisible={controlsVisible}
            onNavigate={navigateToMandala}
          />

          {/* Кнопки управления */}
          <Box
            position="absolute"
            top={4}
            left={4}
            zIndex={10001}
            opacity={controlsVisible ? 0.7 : 0}
            _hover={{ opacity: 1 }}
            transition="opacity 0.3s"
            display="flex"
            gap={2}
            pointerEvents={controlsVisible ? 'auto' : 'none'}
          >
            <IconButton
              aria-label={t('close')}
              onClick={() => setIsFullscreen(false)}
              colorPalette="gray"
              variant="ghost"
              size="lg"
              bg="blackAlpha.600"
              backdropFilter="blur(10px)"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ bg: 'blackAlpha.700' }}
            >
              ✕
            </IconButton>
            <IconButton
              aria-label={t('mandalaCarousel')}
              size="lg"
              variant="ghost"
              colorPalette="gray"
              onClick={() => setIsCarouselOpen(true)}
              bg="blackAlpha.600"
              backdropFilter="blur(10px)"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ bg: 'blackAlpha.700' }}
            >
              <LuLayoutGrid />
            </IconButton>
            <IconButton
              aria-label={isBrowserFullscreen ? t('exitFullscreen') : t('fullscreen')}
              size="lg"
              variant="ghost"
              colorPalette="gray"
              onClick={toggleBrowserFullscreen}
              bg="blackAlpha.600"
              backdropFilter="blur(10px)"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ bg: 'blackAlpha.700' }}
            >
              {isBrowserFullscreen ? <LuMinimize /> : <LuMaximize />}
            </IconButton>
            <ShareButton
              mandalaImageUrl={displayedMandala.imageUrl}
              mandalaName={displayedMandala.name}
              mandalaSlug={displayedMandala.slug}
              settings={settings}
              size="lg"
              variant="fullscreen"
            />
          </Box>

          {/* Пресеты атмосферы */}
          <QuickPresets
            currentPreset={settings.currentPreset}
            onSelectPreset={handlePresetSelect}
            visible={controlsVisible}
          />

          {/* Панель управления */}
          <ViewerControls
            settings={settings}
            onSettingsChange={handleSettingsChange}
            variant="fullscreen"
            isVisible={controlsVisible}
            customTracks={customTracks}
            onOpenTrackManager={() => setIsTrackManagerOpen(true)}
            onOpenSoundscape={() => setIsSoundscapeOpen(true)}
            onHide={hideControls}
          />

          {/* Мини-плеер */}
          <Portal>
            <FloatingMiniPlayer
              trackName={currentTrackName}
              isPlaying={isPlaying}
              volume={settings.audioVolume}
              progress={audioProgress}
              currentTime={currentTime}
              duration={duration}
              currentIndex={currentPlaylistIndex}
              playlistLength={playlistLength}
              playlist={playlist}
              repeatMode={settings.repeatMode}
              isShuffled={settings.isShuffled}
              onPlayPause={handlePlayPause}
              onVolumeChange={(vol) => handleSettingsChange({ audioVolume: vol })}
              onSeek={handleSeek}
              onNextTrack={handleNextTrack}
              onPrevTrack={handlePrevTrack}
              onTrackSelect={switchToTrack}
              onToggleRepeat={toggleRepeatMode}
              onToggleShuffle={toggleShuffle}
              onReorder={handleReorder}
              visible={settings.audioEnabled && settings.showMiniPlayer}
            />
          </Portal>

          {/* Подсказки */}
          <Box
            position="absolute"
            bottom={4}
            left={4}
            zIndex={9999}
            color="gray.500"
            fontSize="sm"
            opacity={controlsVisible ? 0.5 : 0}
            transition="opacity 0.3s"
            pointerEvents="none"
          >
            <Text>Колесо мыши — скорость</Text>
            <Text>C — карусель мандал</Text>
            <Text>ESC — выход</Text>
          </Box>
        </Box>

        {/* Карусель */}
        <Portal>
          <MandalaCarousel
            mandalas={allMandalas.map((m) => ({
              slug: m.slug,
              name: m.name,
              imageUrl: m.imageUrl,
            }))}
            currentIndex={currentIndex}
            onSelect={(slug) => {
              navigateToMandala(slug)
              setIsCarouselOpen(false)
            }}
            visible={isCarouselOpen}
            onClose={() => setIsCarouselOpen(false)}
          />
        </Portal>

        {/* Менеджер треков */}
        <Portal>
          <CustomAudioManager
            isOpen={isTrackManagerOpen}
            onClose={() => setIsTrackManagerOpen(false)}
            tracks={customTracks}
            onAddTrack={addTrack}
            onRemoveTrack={removeTrack}
            onSelectTrack={(id) => handleSettingsChange({ customAudioTrackId: id, audioTrack: 'none' })}
            selectedTrackId={settings.customAudioTrackId}
          />
        </Portal>

        {/* Селектор саундскейпов */}
        <Portal>
          <SoundscapeSelector
            isOpen={isSoundscapeOpen}
            onClose={() => setIsSoundscapeOpen(false)}
            currentTrackId={settings.audioTrack}
            currentCustomTrackId={settings.customAudioTrackId}
            customTracks={customTracks}
            onSelectTrack={(trackId) => handleSettingsChange({ audioTrack: trackId, customAudioTrackId: null })}
            onSelectCustomTrack={(trackId) => handleSettingsChange({ customAudioTrackId: trackId, audioTrack: 'none' })}
            onOpenTrackManager={() => {
              setIsSoundscapeOpen(false)
              setIsTrackManagerOpen(true)
            }}
          />
        </Portal>
      </>
    )
  }

  // =========================================================================
  // Обычный режим — двухколоночный на md+
  // =========================================================================
  return (
    <Box position="relative">
      {/* Заголовок */}
      <Box
        display="flex"
        flexDirection={{ base: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ base: 'flex-start', md: 'center' }}
        gap={4}
        mb={6}
      >
        <Box>
          <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color="fg">
            {mandala.name}
          </Heading>
          {mandala.description && (
            <Text fontSize="lg" color="gray.300" mt={2}>
              {mandala.description}
            </Text>
          )}
        </Box>

        <Box display="flex" gap={3} flexShrink={0}>
          <Button colorPalette="purple" onClick={() => setIsFullscreen(true)} data-onboarding="fullscreen-btn">
            На весь экран
          </Button>
          <ShareButton
            mandalaImageUrl={mandala.imageUrl}
            mandalaName={mandala.name}
            mandalaSlug={mandala.slug}
            settings={settings}
            variant="normal"
          />
        </Box>
      </Box>

      <Grid templateColumns={{ base: '1fr', md: '1fr 360px' }} gap={{ base: 6, md: 8 }} alignItems="start">
        {/* Мандала с навигацией */}
        <Box position="relative">
          <MandalaNavigation prevMandala={prevMandala} nextMandala={nextMandala} variant="normal" />

          <Box
            position="relative"
            overflow="hidden"
            borderRadius="lg"
            cursor="pointer"
            onClick={() => setIsFullscreen(true)}
            _hover={{ transform: 'scale(1.01)' }}
            transition="transform 0.3s"
            aspectRatio={1}
            bg="black"
          >
            <MandalaCanvas
              imageUrl={mandala.imageUrl}
              centerImageUrl={mandala.centerImageUrl}
              isSquare={mandala.isSquare}
              spinDuration={canvasSettings.spinDuration}
              isPaused={canvasSettings.isPaused}
              isReverse={canvasSettings.isReverse}
              spinSpeedMultiplier={audioSyncedEffects.spinSpeedMultiplier}
              beatScale={mandalaScale}
              crossfadeDuration={canvasSettings.crossfadeDuration}
              hueAngle={hueAngle}
            />

            <GlowOverlay
              enabled={glowSettings.glowEnabled}
              color={glowSettings.glowColor}
              intensity={glowSettings.glowIntensity}
              pulseIntensity={audioSyncedEffects.pulseIntensity}
            />

            <EffectLayerRenderer
              enabled={isEffectEnabled}
              effectType={effectSettings.effectType}
              mixBlendMode={activeEffect}
              gradientDuration={effectSettings.gradientDuration}
              speedMultiplier={audioSyncedEffects.gradientSpeedMultiplier}
            />

            <VignetteOverlay
              enabled={vignetteSettings.vignetteEnabled}
              intensity={vignetteSettings.vignetteIntensity}
              pulseIntensity={audioSyncedEffects.pulseIntensity}
            />

            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              bg="blackAlpha.700"
              color="white"
              px={4}
              py={2}
              borderRadius="md"
              opacity={0}
              _groupHover={{ opacity: 1 }}
              transition="opacity 0.3s"
              pointerEvents="none"
            >
              Нажмите для полноэкранного просмотра
            </Box>
          </Box>
        </Box>

        {/* Панель управления */}
        <Box position={{ md: 'sticky' }} top={{ md: 4 }}>
          <ViewerControls
            settings={settings}
            onSettingsChange={handleSettingsChange}
            variant="normal"
            customTracks={customTracks}
            onOpenTrackManager={() => setIsTrackManagerOpen(true)}
          />
        </Box>
      </Grid>

      {/* Менеджер треков */}
      <CustomAudioManager
        isOpen={isTrackManagerOpen}
        onClose={() => setIsTrackManagerOpen(false)}
        tracks={customTracks}
        onAddTrack={addTrack}
        onRemoveTrack={removeTrack}
        onSelectTrack={(id) => handleSettingsChange({ customAudioTrackId: id, audioTrack: 'none' })}
        selectedTrackId={settings.customAudioTrackId}
      />
    </Box>
  )
}
