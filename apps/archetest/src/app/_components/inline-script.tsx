'use client'

import { useEffect } from 'react'

interface InlineScriptProps {
  src: string
  dataWebsiteId: string
}

/**
 * Клиентский компонент для инжекции внешнего скрипта через DOM.
 * React 19 фильтрует нативные <script> теги при SSR streaming,
 * поэтому инжектируем скрипт вручную после гидрации.
 */
export function InlineScript({ src, dataWebsiteId }: InlineScriptProps) {
  useEffect(() => {
    // Проверяем, не добавлен ли уже скрипт
    if (document.querySelector(`script[data-website-id="${dataWebsiteId}"]`)) {
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.dataset.websiteId = dataWebsiteId
    document.body.appendChild(script)

    return () => {
      script.remove()
    }
  }, [src, dataWebsiteId])

  return null
}
