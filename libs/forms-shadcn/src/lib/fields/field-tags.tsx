'use client'

import { X } from 'lucide-react'
import type { KeyboardEvent, ReactElement } from 'react'
import { useState } from 'react'
import { createField } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import { cn } from '@letar/tailwind-utils'
import type { TagsFieldProps } from './types'

interface TagsFieldState {
  draft: string
  setDraft: (value: string) => void
}

/**
 * Form.Field.Tags — shadcn-скин. Нативный инпут + чипы, Enter добавляет тег. Не входит в
 * UIKit-контракт (нет `Tags` в `UIKitExtendedPrimitives`) — как `Rating`/`Switch`/`Slider`.
 */
export const FieldTags = createField<TagsFieldProps, string[], TagsFieldState>({
  displayName: 'FieldTags',
  useFieldState: (): TagsFieldState => {
    const [draft, setDraft] = useState('')
    return { draft, setDraft }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const tags = (field.state.value as string[]) ?? []
    const minTagLength = componentProps.minTagLength ?? 1

    const addTag = (raw: string) => {
      const trimmed = raw.trim()
      if (trimmed.length < minTagLength) { return }
      if (componentProps.maxTags && tags.length >= componentProps.maxTags) { return }
      if (tags.includes(trimmed)) { return }
      field.handleChange([...tags, trimmed])
      fieldState.setDraft('')
    }

    const removeTag = (index: number) => {
      field.handleChange(tags.filter((_, i) => i !== index))
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        addTag(fieldState.draft)
      }
      if (e.key === 'Backspace' && !fieldState.draft && tags.length > 0) {
        removeTag(tags.length - 1)
      }
    }

    return (
      <shadcnUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <shadcnUIKit.FieldLabel label={resolved.label} required={resolved.required} tooltip={resolved.tooltip} />
        <div
          data-field-name={fullPath}
          className={cn(
            'border-input flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1',
            'has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 has-[input:focus-visible]:ring-[3px]',
          )}
        >
          {tags.map((tag, index) => (
            <span
              key={tag}
              className="bg-secondary text-secondary-foreground flex items-center gap-1 rounded px-2 py-0.5 text-xs"
            >
              {tag}
              <button
                type="button"
                aria-label={`Удалить ${tag}`}
                disabled={resolved.disabled}
                onClick={() => removeTag(index)}
                className="hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            value={fieldState.draft}
            onChange={(e) => fieldState.setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={field.handleBlur}
            placeholder={tags.length === 0 ? resolved.placeholder : undefined}
            disabled={resolved.disabled}
            className="min-w-24 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <shadcnUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </shadcnUIKit.FieldRoot>
    )
  },
})
