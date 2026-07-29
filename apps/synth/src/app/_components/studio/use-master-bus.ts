'use client'

import { createMasterAnalyser } from '@/lib/audio/analyser'
import { getAudioContext } from '@/lib/audio/context'
import { buildReverbIR } from '@/lib/audio/reverb'
import { createSpatialPanner, setPannerPosition } from '@/lib/audio/spatial'
import type { SubtractivePatch } from '@/lib/patch/schema'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

export interface MasterBus {
  masterGain: GainNode
  dryGain: GainNode
  convolver: ConvolverNode
  reverbWet: GainNode
  panner: PannerNode
  analyser: AnalyserNode
}

// Собирает мастер-шину студии один раз при старте звука:
// masterGain → panner (HRTF-пространство) → [dryGain → dest] + [convolver → reverbWet → dest].
// masterGain также веткой уходит в analyser (VJ-визуал) — «tap», не влияет на звук.
function buildBus(ctx: AudioContext, patch: SubtractivePatch): MasterBus {
  const masterGain = ctx.createGain()
  const dryGain = ctx.createGain()
  dryGain.gain.value = 1

  const convolver = ctx.createConvolver()
  const reverbWet = ctx.createGain()
  reverbWet.gain.value = patch.engine.fx.reverb.wet

  const panner = createSpatialPanner(ctx)
  setPannerPosition(panner, ctx, patch.engine.fx.space.azimuth * (Math.PI / 2), patch.engine.fx.space.depth)

  const analyser = createMasterAnalyser(ctx)

  masterGain.connect(panner)
  panner.connect(dryGain)
  dryGain.connect(ctx.destination)
  panner.connect(convolver)
  convolver.connect(reverbWet)
  reverbWet.connect(ctx.destination)
  masterGain.connect(analyser)

  void buildReverbIR(ctx, patch.engine.fx.reverb.decay).then((buf) => {
    convolver.buffer = buf
  })

  return { masterGain, dryGain, convolver, reverbWet, panner, analyser }
}

/**
 * Мастер-шина студии (реверб + HRTF-пространство), собирается один раз при старте звука
 * и дальше держится живой при изменении ручек — без пересборки аудио-графа.
 *
 * FX (reverb/space) читается только из SUB-патча и общий для всех трёх движков — так было
 * задумано с самого начала (нет отдельной FX-секции у FM/DRUM в схеме патча), не баг.
 */
export function useMasterBus(patch: SubtractivePatch, patchRef: RefObject<SubtractivePatch>, started: boolean) {
  const [bus, setBus] = useState<MasterBus | null>(null)
  const orbitRafRef = useRef<number | null>(null)

  const start = useCallback(
    (ctx: AudioContext): MasterBus => {
      const built = buildBus(ctx, patchRef.current)
      setBus(built)
      return built
    },
    [patchRef]
  )

  // Мгновенно обновляем wet gain при движении ручки
  useEffect(() => {
    if (!bus) {
      return
    }
    bus.reverbWet.gain.value = patch.engine.fx.reverb.wet
  }, [bus, patch.engine.fx.reverb.wet])

  // Пересоздаём IR при смене decay (не при старте — там уже строится в buildBus)
  useEffect(() => {
    if (!bus) {
      return
    }
    const ctx = getAudioContext()
    void buildReverbIR(ctx, patch.engine.fx.reverb.decay).then((buf) => {
      bus.convolver.buffer = buf
    })
  }, [bus, patch.engine.fx.reverb.decay])

  // Ручная позиция (азимут/глубина) — применяется, пока не включена авто-орбита
  useEffect(() => {
    if (!bus || patch.engine.fx.space.autoOrbit) {
      return
    }
    const ctx = getAudioContext()
    setPannerPosition(bus.panner, ctx, patch.engine.fx.space.azimuth * (Math.PI / 2), patch.engine.fx.space.depth)
  }, [bus, patch.engine.fx.space.azimuth, patch.engine.fx.space.depth, patch.engine.fx.space.autoOrbit])

  // Авто-орбита: звук непрерывно обходит слушателя по кругу, а не стоит на месте
  useEffect(() => {
    if (!bus || !started || !patch.engine.fx.space.autoOrbit) {
      return
    }
    const ctx = getAudioContext()
    const panner = bus.panner
    const startTime = ctx.currentTime

    const tick = () => {
      const { orbitRate, depth } = patchRef.current.engine.fx.space
      const angle = (ctx.currentTime - startTime) * orbitRate * Math.PI * 2
      setPannerPosition(panner, ctx, angle, depth)
      orbitRafRef.current = requestAnimationFrame(tick)
    }
    orbitRafRef.current = requestAnimationFrame(tick)

    return () => {
      if (orbitRafRef.current) {
        cancelAnimationFrame(orbitRafRef.current)
        orbitRafRef.current = null
      }
    }
  }, [bus, started, patch.engine.fx.space.autoOrbit, patchRef])

  return { start, bus }
}
