// Запись реального аудио с внешнего устройства (например, SMK-37 PRO в режиме USB-audio
// interface) — в отличие от MasterRecorder (recorder.ts), источник звука здесь физическое
// железо через getUserMedia, а не наш собственный AudioContext.

import { buildMusicalAudioConstraints } from './media-constraints'

export interface AudioInputDevice {
  deviceId: string
  label: string
}

/**
 * Запрашивает разрешение на аудиовход (если ещё не выдано) и возвращает список устройств.
 * Без предварительного разрешения браузер не отдаёт `label` — вызывающий код должен
 * вызвать это после явного действия пользователя (клика), не при монтировании компонента.
 */
export async function listAudioInputDevices(): Promise<AudioInputDevice[]> {
  const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
  probe.getTracks().forEach((track) => track.stop())

  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'audioinput')
    .map((d) => ({ deviceId: d.deviceId, label: d.label || 'Аудиовход (без имени)' }))
}

export class HardwareRecorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: BlobPart[] = []

  async start(deviceId: string): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: buildMusicalAudioConstraints(deviceId),
    })
    this.chunks = []
    const recorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data)
      }
    }
    recorder.start()
    this.recorder = recorder
  }

  isRecording(): boolean {
    return this.recorder?.state === 'recording'
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const recorder = this.recorder
      const stream = this.stream
      if (!recorder) {
        resolve(new Blob())
        return
      }
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: 'audio/webm' }))
        stream?.getTracks().forEach((track) => track.stop())
      }
      recorder.stop()
      this.stream = null
    })
  }

  dispose(): void {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop()
    }
    this.stream?.getTracks().forEach((track) => track.stop())
  }
}
