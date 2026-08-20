'use client'

import { lazy, Suspense, useEffect, useState } from 'react'
import type { RichTextFieldProps } from './types'

// `@tiptap/*` — тяжёлый peer-dep, нужный только этому полю. Реализация вынесена
// в field-rich-text-impl.tsx и подгружается через `lazy()` + dynamic `import()`
// (тот же паттерн, что у Chakra-скина и у Form.Captcha) — пакет пока чистый
// workspace-пакет без tsup/entry-сплиттинга, поэтому здесь это особенно важно:
// без lazy-обёртки резолв tiptap требовался бы для ЛЮБОГО импорта из пакета.
const LazyFieldRichText = lazy(() => import('./field-rich-text-impl').then((m) => ({ default: m.FieldRichText })))

const fallback = <div className="border-input bg-muted/30 h-[150px] animate-pulse rounded-md border" />

/**
 * Form.Field.RichText — shadcn-скин. WYSIWYG-редактор на Tiptap с тулбаром.
 *
 * @example
 * ```tsx
 * <Form.Field.RichText name="content" label="Содержимое" />
 * ```
 */
export function FieldRichText(props: RichTextFieldProps) {
  // ⚠️ Suspense монтируется только после клиентского маунта — иначе SSR-стриминг вешает
  // раскрытие boundary на requestAnimationFrame, который не тикает в фоновой/скрытой вкладке.
  // Разбор: .claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) { return fallback }

  return (
    <Suspense fallback={fallback}>
      <LazyFieldRichText {...props} />
    </Suspense>
  )
}
