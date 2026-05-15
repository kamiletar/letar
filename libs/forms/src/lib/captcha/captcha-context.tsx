'use client'

import { createContext, useContext } from 'react'
import type { CaptchaConfig } from './types'

/**
 * Контекст для передачи конфигурации CAPTCHA через createForm.
 * Позволяет Form.Captcha без пропсов использовать дефолтные настройки.
 */
export const CaptchaContext = createContext<CaptchaConfig | undefined>(undefined)

/** Хук для доступа к конфигурации CAPTCHA из контекста */
export function useCaptchaConfig(): CaptchaConfig | undefined {
  return useContext(CaptchaContext)
}
