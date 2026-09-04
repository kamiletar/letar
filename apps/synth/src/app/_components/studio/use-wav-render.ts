'use client'

import { renderPatchToWav } from '@/lib/audio/render'
import type { Patch } from '@/lib/patch/schema'
import { useCallback, useState } from 'react'

export type WavRenderStatus = 'idle' | 'rendering' | 'done' | 'error'

// Детерминированный рендер патча в WAV (OfflineAudioContext) — в отличие от живой записи
// не зависит от системного аудиостека и всегда даёт один и тот же файл (см. render.ts).
export function useWavRender() {
  const [status, setStatus] = useState<WavRenderStatus>('idle')
  const [url, setUrl] = useState<string | null>(null)
  // Имя файла для скачивания — фиксируется один раз, в момент готовности рендера (внутри
  // колбэка renderPatchToWav().then, не в рендере компонента): Date.now() там — обычный
  // обработчик события, а не чтение времени во время рендера (react(purity)).
  const [downloadName, setDownloadName] = useState<string | null>(null)

  const render = useCallback((patch: Patch) => {
    setStatus('rendering')
    void renderPatchToWav(patch)
      .then((blob) => {
        setUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev)
          }
          return URL.createObjectURL(blob)
        })
        setDownloadName(`synth-render-${Date.now()}.wav`)
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [])

  return { status, url, downloadName, render }
}
