'use client'

import { createLazyComponent } from '@letar/forms-react'
import type { ComponentType } from 'react'
import type { RichTextFieldProps } from './types'

const fallback = <div className="border-input bg-muted/30 h-[150px] animate-pulse rounded-md border" />

/**
 * Form.Field.RichText — shadcn-скин. WYSIWYG-редактор на Tiptap с тулбаром.
 *
 * `@tiptap/*` — тяжёлый peer-dep, нужный только этому полю. Реализация вынесена
 * в field-rich-text-impl.tsx и подгружается через `createLazyComponent` (`@letar/forms-react`) —
 * mounted-гейт + Suspense, фикс зависшего серверного Suspense-boundary. Разбор:
 * .claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md
 *
 * @example
 * ```tsx
 * <Form.Field.RichText name="content" label="Содержимое" />
 * ```
 */
export const FieldRichText = createLazyComponent<ComponentType<RichTextFieldProps>>(
  () => import('./field-rich-text-impl').then((m) => ({ default: m.FieldRichText })),
  fallback,
)
