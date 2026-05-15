'use client'

import DOMPurify from 'dompurify'
import { useMemo } from 'react'

interface SafeHtmlProps {
  /** HTML строка для рендеринга (санитизируется через DOMPurify) */
  html: string
  /** Дополнительный className */
  className?: string
}

/**
 * Безопасный рендеринг HTML с санитизацией через DOMPurify.
 * Используй вместо прямого dangerouslySetInnerHTML.
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  // DOMPurify.sanitize() удаляет опасные теги (script, iframe, event handlers)
  const sanitized = useMemo(() => DOMPurify.sanitize(html), [html])

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
}
