'use client'

// Загрузка файла сэмпла на пэд драм-кита: файл → декодирование → приватное IndexedDB-хранилище
// (samples-db.ts) → декодированный AudioBuffer кэшируется прямо в DrumEngine (см. drums.ts).
// Второй эффект держит кэш живого движка синхронным с патчем — если пэд уже ссылается на
// sampleId (загрузка сохранённого патча), буфер подгружается из IndexedDB без участия пользователя.

import type { DrumEngine } from '@/lib/audio/drums'
import { deleteSample, generateSampleId, getSample, saveSample } from '@/lib/storage/samples-db'
import type { DrumkitPatch } from '@/lib/patch/schema'
import type { RefObject } from 'react'
import { useCallback, useEffect } from 'react'

interface UseDrumSamplesOptions {
  drumEngineRef: RefObject<DrumEngine | null>
  drumPatch: DrumkitPatch
  onPadChange: (index: number, sampleId: string, name: string) => void
}

export function useDrumSamples({ drumEngineRef, drumPatch, onPadChange }: UseDrumSamplesOptions) {
  // Подгружает и декодирует в кэш движка все сэмплы, уже назначенные на пэды текущего патча
  // (нужно и при первой загрузке патча из IndexedDB, и при пересоздании движка).
  useEffect(() => {
    const engine = drumEngineRef.current
    if (!engine) {
      return
    }
    let cancelled = false
    for (const pad of drumPatch.engine.pads) {
      const sampleId = pad.sample?.sampleId
      if (!sampleId || engine.hasSampleBuffer(sampleId)) {
        continue
      }
      getSample(sampleId)
        .then((stored) => {
          if (cancelled || !stored) {
            return
          }
          return engine.decodeAudioData(stored.data.slice(0)).then((buffer) => {
            if (!cancelled) {
              engine.setSampleBuffer(sampleId, buffer)
            }
          })
        })
        .catch(() => {
          // Битый/неподдерживаемый файл — пэд просто останется без звука, ошибка уже
          // залогирована самим decodeAudioData в консоль браузера
        })
    }
    return () => {
      cancelled = true
    }
  }, [drumEngineRef, drumPatch])

  const uploadSample = useCallback(
    async (padIndex: number, file: File) => {
      const engine = drumEngineRef.current
      if (!engine) {
        return
      }
      const arrayBuffer = await file.arrayBuffer()
      const buffer = await engine.decodeAudioData(arrayBuffer.slice(0))
      const sampleId = generateSampleId()

      await saveSample({
        id: sampleId,
        name: file.name,
        data: arrayBuffer,
        mimeType: file.type || 'audio/wav',
        createdAt: new Date().toISOString(),
      })

      engine.setSampleBuffer(sampleId, buffer)
      onPadChange(padIndex, sampleId, file.name)
    },
    [drumEngineRef, onPadChange]
  )

  const removeSample = useCallback(async (sampleId: string) => {
    await deleteSample(sampleId)
  }, [])

  return { uploadSample, removeSample }
}
