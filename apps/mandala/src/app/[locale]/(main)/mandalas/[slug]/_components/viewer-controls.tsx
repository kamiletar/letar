'use client'

/**
 * Панель управления просмотром мандалы.
 *
 * Подкомпоненты вынесены в ./controls/:
 * - control-buttons.tsx — кнопки паузы и направления
 * - playback-controls.tsx — слайдеры скорости
 * - effects-controls.tsx — blend/layer эффекты
 * - atmosphere-controls.tsx — ночь, дыхание, виньетка, свечение
 * - audio-controls.tsx — музыка и синхронизация
 */

import { Box, HStack, IconButton, Slider, Switch, Text, VStack } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef } from 'react'
import { LuSettings, LuSparkles, LuX } from 'react-icons/lu'

import { BLEND_EFFECTS, type CustomAudioTrack, EFFECT_TYPES } from '../_constants/viewer-constants'
import type { ViewerSettings } from '../_schemas/viewer-settings.schema'

import {
  // Атмосфера
  AtmosphereSwitches,
  // Аудио
  AudioControls,
  AutoEffectControl,
  // Эффекты
  BlendLayerSelectors,
  // Кнопки управления
  FullscreenPauseButton,
  FullscreenReverseButton,
  GradientSpeedSlider,
  // Визуальные эффекты
  HueRotateControls,
  PauseSwitch,
  ReverseSwitch,
  // Слайдеры скорости
  SpinSpeedSlider,
  VignetteGlowControls,
} from './controls'

// =============================================================================
// Типы
// =============================================================================

interface ViewerControlsProps {
  /** Текущие настройки */
  settings: ViewerSettings
  /** Callback при изменении настроек */
  onSettingsChange: (settings: Partial<ViewerSettings>) => void
  /** Режим отображения */
  variant?: 'normal' | 'fullscreen'
  /** Видимость панели (для синхронизации с другими плавающими элементами) */
  isVisible?: boolean
  /** Кастомные аудио-треки пользователя */
  customTracks?: CustomAudioTrack[]
  /** Callback для открытия менеджера треков */
  onOpenTrackManager?: () => void
  /** Callback для открытия селектора саундскейпов */
  onOpenSoundscape?: () => void
  /** Callback для скрытия панели (fullscreen) */
  onHide?: () => void
}

// =============================================================================
// Компонент
// =============================================================================

/**
 * Панель управления просмотром мандалы.
 * В fullscreen режиме появляется при движении мыши и скрывается через 3 сек.
 */
export function ViewerControls({
  settings,
  onSettingsChange,
  variant = 'normal',
  isVisible: isVisibleProp = true,
  customTracks = [],
  onOpenTrackManager,
  onOpenSoundscape,
  onHide,
}: ViewerControlsProps) {
  const t = useTranslations('viewer.aria')
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoLayerTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isFullscreen = variant === 'fullscreen'

  // Стабильная ссылка на callback для избежания переустановки интервалов
  const onSettingsChangeRef = useRef(onSettingsChange)
  onSettingsChangeRef.current = onSettingsChange

  // В fullscreen используем внешний isVisible, в normal — всегда видимо
  const panelVisible = isFullscreen ? isVisibleProp : true

  // ===== Мемоизированные handlers для предотвращения ререндеров =====
  const handleControlsModeSimple = useCallback(() => onSettingsChangeRef.current({ controlsMode: 'simple' }), [])
  const handleControlsModeAdvanced = useCallback(() => onSettingsChangeRef.current({ controlsMode: 'advanced' }), [])
  const handleSpinDurationChange = useCallback(
    (duration: number) => onSettingsChangeRef.current({ spinDuration: duration }),
    []
  )
  const handleGradientDurationChange = useCallback(
    (duration: number) => onSettingsChangeRef.current({ gradientDuration: duration }),
    []
  )
  const handlePausedChange = useCallback((paused: boolean) => onSettingsChangeRef.current({ isPaused: paused }), [])
  const handleReverseChange = useCallback((reverse: boolean) => onSettingsChangeRef.current({ isReverse: reverse }), [])
  const handleAudioEnabledChange = useCallback(
    (e: { checked: boolean }) => onSettingsChangeRef.current({ audioEnabled: e.checked }),
    []
  )
  const handleAutoNextEnabledChange = useCallback(
    (e: { checked: boolean }) => onSettingsChangeRef.current({ autoNextEnabled: e.checked }),
    []
  )
  const handleAutoNextIntervalChange = useCallback(
    (details: { value: number[] }) => onSettingsChangeRef.current({ autoNextInterval: details.value[0] }),
    []
  )
  const handleCrossfadeDurationChange = useCallback(
    (details: { value: number[] }) => onSettingsChangeRef.current({ crossfadeDuration: details.value[0] }),
    []
  )

  // ===== Авто-режимы =====

  // Авто-режим — смена blend-эффектов каждые N секунд
  useEffect(() => {
    if (!settings.autoEffects) {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current)
        autoTimerRef.current = null
      }
      return
    }

    autoTimerRef.current = setInterval(() => {
      const nextIndex = (settings.effectIndex + 1) % BLEND_EFFECTS.length
      onSettingsChangeRef.current({ effectIndex: nextIndex })
    }, settings.autoEffectInterval * 1000)

    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current)
      }
    }
  }, [settings.autoEffects, settings.autoEffectInterval, settings.effectIndex])

  // Авто-режим — смена layer-эффектов каждые N секунд
  useEffect(() => {
    if (!settings.autoLayerEffects) {
      if (autoLayerTimerRef.current) {
        clearInterval(autoLayerTimerRef.current)
        autoLayerTimerRef.current = null
      }
      return
    }

    autoLayerTimerRef.current = setInterval(() => {
      const currentIndex = EFFECT_TYPES.indexOf(settings.effectType)
      const nextIndex = (currentIndex + 1) % EFFECT_TYPES.length
      onSettingsChangeRef.current({ effectType: EFFECT_TYPES[nextIndex] })
    }, settings.autoLayerEffectInterval * 1000)

    return () => {
      if (autoLayerTimerRef.current) {
        clearInterval(autoLayerTimerRef.current)
      }
    }
  }, [settings.autoLayerEffects, settings.autoLayerEffectInterval, settings.effectType])

  // ===== Fullscreen режим =====

  if (isFullscreen) {
    return (
      <Box
        position="absolute"
        bottom="max(16px, env(safe-area-inset-bottom))" // Учёт notch на iPhone
        left="50%"
        transform="translateX(-50%)"
        zIndex={10000}
        opacity={panelVisible ? 0.9 : 0}
        pointerEvents={panelVisible ? 'auto' : 'none'}
        transition="opacity 0.3s"
        bg="blackAlpha.800"
        borderRadius="xl"
        p={4}
        backdropFilter="blur(10px)"
        maxH="calc(100dvh - 120px)"
        maxW={{ base: 'calc(100vw - 16px)', md: 'full' }} // Не выходить за границы на мобильных
        overflowY="auto"
      >
        <VStack gap={4} align="stretch" minW="320px">
          {/* Переключатель режимов: простой/расширенный + кнопка закрытия */}
          <HStack justify="space-between" pb={2} borderBottomWidth="1px" borderColor="whiteAlpha.200">
            <HStack gap={1}>
              <Tooltip content={t('simpleMode')}>
                <IconButton
                  aria-label={t('simpleMode')}
                  size={{ base: 'md', md: 'sm' }}
                  variant={settings.controlsMode === 'simple' ? 'solid' : 'ghost'}
                  colorPalette="purple"
                  onClick={handleControlsModeSimple}
                >
                  <LuSparkles />
                </IconButton>
              </Tooltip>
              <Tooltip content={t('advancedMode')}>
                <IconButton
                  aria-label={t('advancedMode')}
                  size={{ base: 'md', md: 'sm' }}
                  variant={settings.controlsMode === 'advanced' ? 'solid' : 'ghost'}
                  colorPalette="purple"
                  onClick={handleControlsModeAdvanced}
                >
                  <LuSettings />
                </IconButton>
              </Tooltip>
            </HStack>
            {onHide && (
              <Tooltip content={t('hidePanel')}>
                <IconButton
                  aria-label={t('hidePanel')}
                  size={{ base: 'md', md: 'sm' }}
                  variant="ghost"
                  colorPalette="gray"
                  onClick={onHide}
                >
                  <LuX />
                </IconButton>
              </Tooltip>
            )}
          </HStack>

          {/* Скорость вращения */}
          <SpinSpeedSlider
            spinDuration={settings.spinDuration}
            onChange={handleSpinDurationChange}
            variant="fullscreen"
          />

          {/* Управление вращением */}
          <HStack justify="center" gap={2}>
            <FullscreenPauseButton isPaused={settings.isPaused} onChange={handlePausedChange} />
            <FullscreenReverseButton isReverse={settings.isReverse} onChange={handleReverseChange} />
          </HStack>

          {/* Бленд и Слой — только в расширенном режиме */}
          {settings.controlsMode === 'advanced' && (
            <>
              <BlendLayerSelectors
                effectIndex={settings.effectIndex}
                effectType={settings.effectType}
                onChange={onSettingsChange}
                variant="fullscreen"
              />

              {/* Скорость градиента */}
              <GradientSpeedSlider
                gradientDuration={settings.gradientDuration}
                onChange={handleGradientDurationChange}
                variant="fullscreen"
              />

              {/* Авто-режимы */}
              <AutoEffectControl
                enabled={settings.autoEffects}
                interval={settings.autoEffectInterval}
                label="Смена эффектов"
                colorPalette="green"
                minInterval={5}
                maxInterval={60}
                onEnabledChange={(enabled) => onSettingsChange({ autoEffects: enabled })}
                onIntervalChange={(interval) => onSettingsChange({ autoEffectInterval: interval })}
                variant="fullscreen"
              />

              <AutoEffectControl
                enabled={settings.autoLayerEffects}
                interval={settings.autoLayerEffectInterval}
                label="Смена слоёв"
                colorPalette="teal"
                minInterval={5}
                maxInterval={120}
                onEnabledChange={(enabled) => onSettingsChange({ autoLayerEffects: enabled })}
                onIntervalChange={(interval) => onSettingsChange({ autoLayerEffectInterval: interval })}
                variant="fullscreen"
              />
            </>
          )}

          {/* Атмосфера */}
          <AtmosphereSwitches
            nightMode={settings.nightMode}
            breathingEnabled={settings.breathingEnabled}
            meditationEnabled={settings.meditationEnabled}
            meditationDuration={settings.meditationDuration}
            onChange={onSettingsChange}
            variant="fullscreen"
          />

          {/* Виньетка и свечение — только в расширенном режиме */}
          {settings.controlsMode === 'advanced' && (
            <VignetteGlowControls
              vignetteEnabled={settings.vignetteEnabled}
              vignetteIntensity={settings.vignetteIntensity}
              glowEnabled={settings.glowEnabled}
              glowIntensity={settings.glowIntensity}
              onChange={onSettingsChange}
              variant="fullscreen"
            />
          )}

          {/* Музыка */}
          <Box borderTopWidth="1px" borderColor="whiteAlpha.200" pt={3}>
            <HStack justify="space-between" mb={2}>
              <Switch.Root
                checked={settings.audioEnabled}
                onCheckedChange={handleAudioEnabledChange}
                colorPalette="pink"
                size="sm"
                data-onboarding="audio-btn"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Label color="white" fontSize="sm">
                  Музыка
                </Switch.Label>
              </Switch.Root>
              <Text color="pink.300" fontSize="sm">
                {settings.audioVolume}%
              </Text>
            </HStack>

            {settings.audioEnabled && (
              <AudioControls
                audioEnabled={settings.audioEnabled}
                audioTrack={settings.audioTrack}
                customAudioTrackId={settings.customAudioTrackId}
                audioVolume={settings.audioVolume}
                audioSyncEnabled={settings.audioSyncEnabled}
                audioSource={settings.audioSource}
                audioPreset={settings.audioPreset}
                audioSyncMode={settings.audioSyncMode}
                beatPulseEnabled={settings.beatPulseEnabled}
                adaptiveGradientEnabled={settings.adaptiveGradientEnabled}
                adaptiveSpinEnabled={settings.adaptiveSpinEnabled}
                bassSensitivity={settings.bassSensitivity}
                beatSensitivity={settings.beatSensitivity}
                customTracks={customTracks}
                onChange={onSettingsChange}
                onOpenTrackManager={onOpenTrackManager}
                onOpenSoundscape={onOpenSoundscape}
                variant="fullscreen"
              />
            )}
          </Box>

          {/* Hue-Rotate эффект — только в расширенном режиме */}
          {settings.controlsMode === 'advanced' && (
            <Box borderTopWidth="1px" borderColor="whiteAlpha.200" pt={3}>
              <HueRotateControls
                hueRotateEnabled={settings.hueRotateEnabled}
                hueRotateMode={settings.hueRotateMode}
                hueRotateBaseSpeed={settings.hueRotateBaseSpeed}
                hueRotateBassModulation={settings.hueRotateBassModulation}
                hueRotateBeatJump={settings.hueRotateBeatJump}
                hueRotateSmoothing={settings.hueRotateSmoothing}
                onChange={onSettingsChange}
                variant="fullscreen"
              />
            </Box>
          )}

          {/* Автопереход — только в расширенном режиме */}
          {settings.controlsMode === 'advanced' && (
            <Box borderTopWidth="1px" borderColor="whiteAlpha.200" pt={3}>
              <HStack justify="space-between" mb={2}>
                <Switch.Root
                  checked={settings.autoNextEnabled}
                  onCheckedChange={handleAutoNextEnabledChange}
                  colorPalette="cyan"
                  size="sm"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Label color="white" fontSize="sm">
                    Автопереход
                  </Switch.Label>
                </Switch.Root>
                <Text color="cyan.300" fontSize="sm">
                  {settings.autoNextInterval}с
                </Text>
              </HStack>

              {settings.autoNextEnabled && (
                <Slider.Root
                  value={[settings.autoNextInterval]}
                  onValueChange={handleAutoNextIntervalChange}
                  min={10}
                  max={300}
                  step={10}
                  colorPalette="cyan"
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range />
                    </Slider.Track>
                    <Slider.Thumb index={0} boxSize={{ base: '32px', md: '20px' }} />
                  </Slider.Control>
                </Slider.Root>
              )}

              {/* Crossfade */}
              <Box mt={3}>
                <HStack justify="space-between" mb={2}>
                  <Text color="white" fontSize="sm">
                    Crossfade
                  </Text>
                  <Text color="cyan.300" fontSize="sm">
                    {settings.crossfadeDuration.toFixed(1)}с
                  </Text>
                </HStack>
                <Slider.Root
                  value={[settings.crossfadeDuration]}
                  onValueChange={handleCrossfadeDurationChange}
                  min={0.2}
                  max={10}
                  step={0.1}
                  colorPalette="cyan"
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range />
                    </Slider.Track>
                    <Slider.Thumb index={0} boxSize={{ base: '32px', md: '20px' }} />
                  </Slider.Control>
                </Slider.Root>
              </Box>
            </Box>
          )}
        </VStack>
      </Box>
    )
  }

  // ===== Обычный режим =====

  return (
    <Box bg="bg.panel" borderRadius="lg" p={4} mb={4} borderWidth="1px" borderColor="border.subtle">
      <VStack gap={4} align="stretch">
        <Text fontWeight="medium" color="fg">
          Настройки просмотра
        </Text>

        {/* Скорость вращения */}
        <SpinSpeedSlider spinDuration={settings.spinDuration} onChange={handleSpinDurationChange} />

        {/* Управление */}
        <HStack gap={4}>
          <PauseSwitch isPaused={settings.isPaused} onChange={handlePausedChange} />
          <ReverseSwitch isReverse={settings.isReverse} onChange={handleReverseChange} />
        </HStack>

        {/* Бленд и Слой */}
        <BlendLayerSelectors
          effectIndex={settings.effectIndex}
          effectType={settings.effectType}
          onChange={onSettingsChange}
        />

        {/* Скорость градиента */}
        <GradientSpeedSlider gradientDuration={settings.gradientDuration} onChange={handleGradientDurationChange} />

        {/* Авто-режимы */}
        <AutoEffectControl
          enabled={settings.autoEffects}
          interval={settings.autoEffectInterval}
          label="Автоматическая смена эффектов"
          colorPalette="green"
          minInterval={5}
          maxInterval={60}
          onEnabledChange={(enabled) => onSettingsChange({ autoEffects: enabled })}
          onIntervalChange={(interval) => onSettingsChange({ autoEffectInterval: interval })}
        />

        <AutoEffectControl
          enabled={settings.autoLayerEffects}
          interval={settings.autoLayerEffectInterval}
          label="Автоматическая смена слоёв"
          colorPalette="teal"
          minInterval={5}
          maxInterval={120}
          onEnabledChange={(enabled) => onSettingsChange({ autoLayerEffects: enabled })}
          onIntervalChange={(interval) => onSettingsChange({ autoLayerEffectInterval: interval })}
        />

        {/* Атмосферные функции */}
        <Box borderTopWidth="1px" borderColor="border.subtle" pt={4}>
          <Text fontSize="sm" color="fg.muted" mb={3}>
            Атмосфера
          </Text>
          <VStack gap={3} align="stretch">
            <AtmosphereSwitches
              nightMode={settings.nightMode}
              breathingEnabled={settings.breathingEnabled}
              meditationEnabled={settings.meditationEnabled}
              meditationDuration={settings.meditationDuration}
              onChange={onSettingsChange}
            />
            <VignetteGlowControls
              vignetteEnabled={settings.vignetteEnabled}
              vignetteIntensity={settings.vignetteIntensity}
              glowEnabled={settings.glowEnabled}
              glowIntensity={settings.glowIntensity}
              onChange={onSettingsChange}
            />
          </VStack>
        </Box>

        {/* Музыка */}
        <Box borderTopWidth="1px" borderColor="border.subtle" pt={4}>
          <Text fontSize="sm" color="fg.muted" mb={3}>
            Музыка для медитации
          </Text>
          <VStack gap={3} align="stretch">
            {/* Переключатель музыки */}
            <HStack justify="space-between">
              <Switch.Root
                checked={settings.audioEnabled}
                onCheckedChange={handleAudioEnabledChange}
                colorPalette="pink"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Label>Фоновая музыка</Switch.Label>
              </Switch.Root>
              {settings.audioEnabled && (
                <Text fontSize="xs" color="fg.muted">
                  {settings.audioVolume}%
                </Text>
              )}
            </HStack>

            {/* Настройки музыки */}
            {settings.audioEnabled && (
              <AudioControls
                audioEnabled={settings.audioEnabled}
                audioTrack={settings.audioTrack}
                customAudioTrackId={settings.customAudioTrackId}
                audioVolume={settings.audioVolume}
                audioSyncEnabled={settings.audioSyncEnabled}
                audioSource={settings.audioSource}
                audioPreset={settings.audioPreset}
                audioSyncMode={settings.audioSyncMode}
                beatPulseEnabled={settings.beatPulseEnabled}
                adaptiveGradientEnabled={settings.adaptiveGradientEnabled}
                adaptiveSpinEnabled={settings.adaptiveSpinEnabled}
                bassSensitivity={settings.bassSensitivity}
                beatSensitivity={settings.beatSensitivity}
                customTracks={customTracks}
                onChange={onSettingsChange}
                onOpenTrackManager={onOpenTrackManager}
              />
            )}
          </VStack>
        </Box>

        {/* Hue-Rotate эффект — только в расширенном режиме */}
        {settings.controlsMode === 'advanced' && (
          <Box borderTopWidth="1px" borderColor="border" pt={4}>
            <HueRotateControls
              hueRotateEnabled={settings.hueRotateEnabled}
              hueRotateMode={settings.hueRotateMode}
              hueRotateBaseSpeed={settings.hueRotateBaseSpeed}
              hueRotateBassModulation={settings.hueRotateBassModulation}
              hueRotateBeatJump={settings.hueRotateBeatJump}
              hueRotateSmoothing={settings.hueRotateSmoothing}
              onChange={onSettingsChange}
              variant="normal"
            />
          </Box>
        )}
      </VStack>
    </Box>
  )
}
