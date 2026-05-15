'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Хук для получения URL обложки через локальный Kubo gateway.
 * Конвертирует ipfs:// CID в HTTP URL через gateway.
 */
export function useCoverUrl() {
  const [gatewayUrl, setGatewayUrl] = useState<string | null>(null)

  useEffect(() => {
    const api = window.electronAPI?.ipfs
    if (!api?.kuboGetGatewayUrl) {
      return
    }
    api
      .kuboGetGatewayUrl()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kubo preload возвращает обёрнутый результат
      .then((result: any) => {
        const url = result?.data ?? result
        if (typeof url === 'string') {
          setGatewayUrl(url)
        }
      })
      .catch(() => {
        /* Ошибка получения gateway URL — используем дефолтный */
      })
  }, [])

  return useCallback(
    (coverUrl: string | null) => {
      if (!coverUrl) {
        return undefined
      }
      if (coverUrl.startsWith('http')) {
        return coverUrl
      }
      // Убираем ipfs:// префикс (трекер хранит coverUrl как ipfs://CID)
      const cid = coverUrl.replace(/^ipfs:\/\//, '')
      const base = gatewayUrl || 'http://127.0.0.1:8081'
      return `${base}/ipfs/${cid}`
    },
    [gatewayUrl]
  )
}
