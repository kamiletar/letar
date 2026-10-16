import type { MediaClientOptions } from './feature'

export type AudioStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'error'
export interface AudioUploadGrant {
  uploadToken: string
  tusUrl: string
  expiresIn: number
}
export interface AudioStatusResult {
  status: AudioStatus
  durationSec?: number
}

/** Серверный клиент закрытых аудиофайлов. Разрешение пользователя проверяет приложение перед каждым вызовом. */
export function createAudioClient(options: MediaClientOptions) {
  const baseUrl = options.baseUrl ?? process.env.MEDIA_SERVER_URL ?? ''
  const apiKey = options.apiKey ?? process.env.MEDIA_API_KEY ?? ''
  const prefix = `${baseUrl}/api/v1/${encodeURIComponent(options.appId)}/audio`
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const result = await fetch(`${prefix}${path}`, {
      method,
      headers: body === undefined
        ? { 'X-Media-Key': apiKey }
        : { 'X-Media-Key': apiKey, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!result.ok) { throw new Error(`Audio media server: ${result.status}`) }
    return result.status === 204 ? undefined as T : result.json() as Promise<T>
  }
  return {
    isConfigured: () => !!(baseUrl && apiKey),
    requestUpload: (audioId: string, size: number) =>
      request<AudioUploadGrant>('/request-upload', 'POST', { audioId, size }),
    getStatus: (audioId: string) => request<AudioStatusResult>(`/${encodeURIComponent(audioId)}/status`),
    getPlayback: (audioId: string) =>
      request<{ url: string; expiresIn: number }>(`/${encodeURIComponent(audioId)}/playback`, 'POST'),
    deleteAudio: (audioId: string) => request<void>(`/${encodeURIComponent(audioId)}`, 'DELETE'),
  }
}
