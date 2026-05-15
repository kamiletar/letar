'use client'

/**
 * Рендерер анимированных эффектов слоя.
 * Используется в обоих режимах: fullscreen и normal.
 */

import React from 'react'
import type { BlendEffect, EffectType } from '../_constants/viewer-constants'
import { AnimatedAurora } from './animated-aurora'
import { AnimatedConicGradient } from './animated-conic-gradient'
import { AnimatedPlasma } from './animated-plasma'
import { AnimatedRadialGradient } from './animated-radial-gradient'
import { AnimatedSolidColor } from './animated-solid-color'
import { AnimatedTunnel } from './animated-tunnel'

interface EffectLayerRendererProps {
  /** Включён ли эффект (activeEffect !== 'disabled') */
  enabled: boolean
  /** Тип эффекта (gradient, solid, conic, aurora, plasma, tunnel) */
  effectType: EffectType
  /** Blend mode эффекта */
  mixBlendMode: BlendEffect
  /** Длительность анимации градиента */
  gradientDuration: number
  /** Множитель скорости от аудио синхронизации */
  speedMultiplier: number
}

/**
 * Рендерит анимированный эффект слоя.
 */
export const EffectLayerRenderer = React.memo(function EffectLayerRenderer({
  enabled,
  effectType,
  mixBlendMode,
  gradientDuration,
  speedMultiplier,
}: EffectLayerRendererProps) {
  if (!enabled) {
    return null
  }

  switch (effectType) {
    case 'gradient':
      return (
        <AnimatedRadialGradient
          mixBlendMode={mixBlendMode}
          gradientDuration={gradientDuration}
          speedMultiplier={speedMultiplier}
        />
      )

    case 'solid':
      return (
        <AnimatedSolidColor
          mixBlendMode={mixBlendMode}
          gradientDuration={gradientDuration}
          speedMultiplier={speedMultiplier}
        />
      )

    case 'conic':
      return (
        <AnimatedConicGradient
          mixBlendMode={mixBlendMode}
          gradientDuration={gradientDuration}
          speedMultiplier={speedMultiplier}
        />
      )

    case 'aurora':
      return (
        <AnimatedAurora
          mixBlendMode={mixBlendMode}
          gradientDuration={gradientDuration}
          speedMultiplier={speedMultiplier}
        />
      )

    case 'plasma':
      return (
        <AnimatedPlasma
          mixBlendMode={mixBlendMode}
          gradientDuration={gradientDuration}
          speedMultiplier={speedMultiplier}
        />
      )

    case 'tunnel':
      return (
        <AnimatedTunnel
          mixBlendMode={mixBlendMode}
          gradientDuration={gradientDuration}
          speedMultiplier={speedMultiplier}
        />
      )

    default:
      return null
  }
})
