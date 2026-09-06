'use client'

import { lazy, Suspense, useCallback, useState } from 'react'
import { useDeclarativeFormOptional } from '../declarative/form-context'
import { useCaptchaConfig } from './captcha-context'
import type { CaptchaFieldProps, CaptchaProvider } from './types'
import { CAPTCHA_TOKEN_FIELD } from './types'

// Провайдеры загружаются лениво — только нужный
const providers: Record<CaptchaProvider, ReturnType<typeof lazy>> = {
  turnstile: lazy(() => import('./providers/turnstile').then((m) => ({ default: m.TurnstileProvider }))),
  recaptcha: lazy(() => import('./providers/recaptcha').then((m) => ({ default: m.RecaptchaProvider }))),
  hcaptcha: lazy(() => import('./providers/hcaptcha').then((m) => ({ default: m.HcaptchaProvider }))),
  smartcaptcha: lazy(() => import('./providers/smartcaptcha').then((m) => ({ default: m.SmartCaptchaProvider }))),
}

/**
 * Компонент CAPTCHA для декларативных форм.
 *
 * Рендерит виджет выбранного провайдера и сохраняет токен
 * в скрытое поле формы `__captchaToken`.
 *
 * @example С пропсами
 * ```tsx
 * <Form.Captcha
 *   provider="turnstile"
 *   siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
 *   theme="auto"
 * />
 * ```
 *
 * @example Через createForm (без пропсов)
 * ```tsx
 * const AppForm = createForm({
 *   captcha: { provider: 'turnstile', siteKey: '...' },
 * })
 * <AppForm.Captcha />
 * ```
 */
export function CaptchaField(props: CaptchaFieldProps) {
  const config = useCaptchaConfig()
  const formCtx = useDeclarativeFormOptional()

  // Мерж пропсов: component props > createForm config
  const provider = props.provider ?? config?.provider
  const siteKey = props.siteKey ?? config?.siteKey
  const theme = props.theme ?? config?.theme ?? 'auto'
  const size = props.size ?? config?.size ?? 'normal'
  const language = props.language ?? config?.language

  const [, setToken] = useState<string | null>(null)

  // Деструктурируем колбэки отдельно от `props` — react-hooks/exhaustive-deps
  // не умеет сузить зависимость до `props.onX` при опциональном вызове (`props.onX?.(...)`)
  // и в этом случае требует весь объект `props`, который меняется на каждый рендер
  const { onSuccess, onError, onExpire } = props

  // Все хуки ОБЯЗАНЫ быть до условных return (rules of hooks)
  const handleSuccess = useCallback(
    (captchaToken: string) => {
      setToken(captchaToken)

      // Сохраняем токен в поле формы если доступен контекст
      if (formCtx?.form) {
        formCtx.form.setFieldValue(CAPTCHA_TOKEN_FIELD, captchaToken)
      }

      onSuccess?.(captchaToken)
    },
    [formCtx, onSuccess],
  )

  const handleError = useCallback(
    (error: unknown) => {
      setToken(null)
      if (formCtx?.form) {
        formCtx.form.setFieldValue(CAPTCHA_TOKEN_FIELD, '')
      }
      onError?.(error)
    },
    [formCtx, onError],
  )

  const handleExpire = useCallback(() => {
    setToken(null)
    if (formCtx?.form) {
      formCtx.form.setFieldValue(CAPTCHA_TOKEN_FIELD, '')
    }
    onExpire?.()
  }, [formCtx, onExpire])

  // Условные return ПОСЛЕ всех хуков
  if (!provider || !siteKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Form.Captcha] provider и siteKey обязательны. '
          + 'Передайте через пропсы или настройте captcha в createForm().',
      )
    }
    return null
  }

  const ProviderComponent = providers[provider]
  if (!ProviderComponent) {
    console.error(`[Form.Captcha] Неизвестный провайдер: ${provider}`)
    return null
  }

  return (
    <Suspense fallback={<div style={{ height: 65, width: 300 }} />}>
      <ProviderComponent
        siteKey={siteKey}
        theme={theme}
        size={size}
        language={language}
        onSuccess={handleSuccess}
        onError={handleError}
        onExpire={handleExpire}
      />
    </Suspense>
  )
}
