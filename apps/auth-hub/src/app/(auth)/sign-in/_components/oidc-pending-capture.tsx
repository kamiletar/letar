'use client'

import { useEffect } from 'react'

interface OidcPendingCaptureProps {
  params: Record<string, string>
}

/**
 * Сохраняет OIDC-параметры в httpOnly cookie `oidc_pending` для social OAuth flow.
 *
 * cookies().set() запрещён в Server Components (Next.js 15+). Клиентский useEffect
 * делает GET /api/oidc-capture, который устанавливает cookie через Route Handler.
 * Редирект игнорируется (нужен только side-effect установки cookie).
 *
 * Для email/password входа cookie не нужен — usePostSignInCallback читает OIDC
 * параметры прямо из URL и строит callbackUrl на /api/auth/oauth2/authorize.
 */
export function OidcPendingCapture({ params }: OidcPendingCaptureProps) {
  useEffect(() => {
    const qs = new URLSearchParams(params).toString()
    // no-redirect: нужен только side-effect cookie, сам ответ не используем
    fetch(`/api/oidc-capture?${qs}`, { redirect: 'manual' }).catch(() => {
      // Молча игнорируем — cookie нужен только для social OAuth,
      // email/password flow работает без него.
    })
  }, [params])

  return null
}
