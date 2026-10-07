'use client'

import { COVER_BLOB_PREFIX, coverUrl, getBlob } from '@/lib/offline/blob-store'
import { useEffect, useState } from 'react'

/**
 * Адрес картинки обложки для `<img>`: фото с телефона (`blobKey`), копия обложки с сайта из
 * IndexedDB (работает без сети) или, если копии нет, прямая ссылка на сайт.
 * Пока копия читается или обложки нет — null.
 */
export function useCoverUrl(blobKey: string | null, path: string | null): string | null {
  const source = blobKey ?? (path ? `${COVER_BLOB_PREFIX}${path}` : null)
  const [loaded, setLoaded] = useState<{ source: string; url: string } | null>(null)

  useEffect(() => {
    if (!source) {
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    void getBlob(source).then((blob) => {
      if (cancelled) {
        return
      }
      if (blob) {
        objectUrl = URL.createObjectURL(blob)
        setLoaded({ source, url: objectUrl })
      } else if (!blobKey && path) {
        setLoaded({ source, url: coverUrl(path) })
      }
    })

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [source, blobKey, path])

  return loaded !== null && loaded.source === source ? loaded.url : null
}
