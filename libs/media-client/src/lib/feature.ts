export interface MediaClientOptions {
  /** Идентификатор приложения на медиасервере, сегмент пути `/api/v1/:appId/...` */
  appId: string
  /** По умолчанию — process.env.MEDIA_SERVER_URL */
  baseUrl?: string
  /** По умолчанию — process.env.MEDIA_API_KEY, заголовок X-Media-Key */
  apiKey?: string
}

export interface RequestUploadTokenResult {
  uploadToken: string
  uploadUrl: string
  tusUrl: string
  expiresIn: number
}

export interface TranscodeStatusResult {
  status: string
  progress?: number
}

export interface MediaClient {
  isConfigured(): boolean
  /** Запрашивает одноразовый upload-токен у медиасервера.
   *  Вызывается с сервера (имеет apiKey), возвращает токен браузеру. */
  requestUploadToken(videoId: string, webhookUrl: string): Promise<RequestUploadTokenResult>
  getTranscodeStatus(jobId: string): Promise<TranscodeStatusResult>
}

/** Клиент общего медиасервера (`infra/media-server`, TUS resumable upload) для одного appId. */
export function createMediaClient(options: MediaClientOptions): MediaClient {
  const baseUrl = options.baseUrl ?? process.env.MEDIA_SERVER_URL ?? ''
  const apiKey = options.apiKey ?? process.env.MEDIA_API_KEY ?? ''
  const appId = options.appId

  function isConfigured(): boolean {
    return !!(baseUrl && apiKey)
  }

  async function requestUploadToken(videoId: string, webhookUrl: string): Promise<RequestUploadTokenResult> {
    const res = await fetch(`${baseUrl}/api/v1/${appId}/video/request-upload`, {
      method: 'POST',
      headers: { 'X-Media-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, webhookUrl }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => String(res.status))
      throw new Error(`media server token error: ${res.status} ${text}`)
    }
    return res.json() as Promise<RequestUploadTokenResult>
  }

  async function getTranscodeStatus(jobId: string): Promise<TranscodeStatusResult> {
    const res = await fetch(`${baseUrl}/api/v1/${appId}/video/status/${jobId}`, {
      headers: { 'X-Media-Key': apiKey },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      throw new Error(`media.letar.best status error: ${res.status}`)
    }
    return res.json() as Promise<TranscodeStatusResult>
  }

  return { isConfigured, requestUploadToken, getTranscodeStatus }
}
