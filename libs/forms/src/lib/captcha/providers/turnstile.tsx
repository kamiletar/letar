'use client'

import { lazy, Suspense } from 'react'
import type { CaptchaSize, CaptchaTheme } from '../types'

/** Пропсы для Turnstile провайдера */
interface TurnstileProviderProps {
  siteKey: string
  theme?: CaptchaTheme
  size?: CaptchaSize
  language?: string
  onSuccess: (token: string) => void
  onError?: (error: unknown) => void
  onExpire?: () => void
}

// Lazy import @marsidev/react-turnstile — загружается только при использовании
const TurnstileWidget = lazy(() =>
  import('@marsidev/react-turnstile').then((m) => ({
    default: m.Turnstile,
  }))
)

/**
 * Провайдер Cloudflare Turnstile.
 * Загружает @marsidev/react-turnstile лениво при первом рендере.
 */
export function TurnstileProvider({
  siteKey,
  theme = 'auto',
  size = 'normal',
  language,
  onSuccess,
  onError,
  onExpire,
}: TurnstileProviderProps) {
  return (
    <Suspense fallback={<div style={{ height: 65, width: 300 }} />}>
      <TurnstileWidget
        siteKey={siteKey}
        options={{
          theme,
          size,
          language,
        }}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
      />
    </Suspense>
  )
}
