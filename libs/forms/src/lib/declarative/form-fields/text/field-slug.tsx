'use client'

import { IconButton, Input, InputGroup } from '@chakra-ui/react'
import { slugify as defaultSlugify } from '@letar/format-utils'
import { useStore } from '@tanstack/react-form'
import { type ReactElement, useEffect, useState } from 'react'
import { LuRotateCcw } from 'react-icons/lu'
import type { BaseFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * Props for Form.Field.Slug
 */
export interface SlugFieldProps extends BaseFieldProps {
  /** Name of the sibling field to derive the slug from (relative to the same group), e.g. "name" */
  source: string

  /**
   * Keep auto-sync active even if the field already has a non-empty value on mount
   * (typical of an edit form, where the record already has a published slug).
   *
   * Default `false` — editing an existing record must not silently change its address when the
   * source field changes, that breaks external links. Pass `true` only when the slug is genuinely
   * safe to keep re-deriving (e.g. draft/unpublished entities).
   */
  syncOnEdit?: boolean

  /**
   * Custom slug function. Defaults to `slugify()` from `@letar/format-utils`
   * (Cyrillic transliteration, ГОСТ 7.79-2000).
   */
  slugify?: (text: string) => string

  /** Maximum length */
  maxLength?: number

  /** HTML autocomplete attribute */
  autoComplete?: string
}

/** State type for useFieldState */
interface SlugFieldState {
  /** Whether the field is currently mirroring the source field */
  synced: boolean
  /** Re-enable sync and immediately re-derive from the current source value */
  resync: () => void
  /** Stop mirroring — called on the first manual edit of the slug input itself */
  markEdited: () => void
}

/**
 * Form.Field.Slug - URL slug that mirrors a sibling field until edited by hand.
 *
 * While untouched, mirrors `slugify(values[source])` on every change of the source field. The
 * moment the user types into the slug field itself, mirroring stops permanently for that form
 * session — otherwise a manual correction would be overwritten by the very next keystroke in the
 * source field. A "restore from source" button re-enables mirroring.
 *
 * On a form that opens with an already non-empty slug (editing an existing record with a
 * published address), mirroring starts **off** by default — changing the title must not silently
 * change a URL that's already live. Pass `syncOnEdit` to opt back in.
 *
 * @example Create form
 * ```tsx
 * <Form.Field.String name="name" label="Name" />
 * <Form.Field.Slug name="slug" source="name" label="URL" />
 * ```
 *
 * @example Edit form, letting a draft record keep re-deriving its slug
 * ```tsx
 * <Form.Field.Slug name="slug" source="name" label="URL" syncOnEdit={!isPublished} />
 * ```
 */
export const FieldSlug = createField<SlugFieldProps, string, SlugFieldState>({
  displayName: 'FieldSlug',

  useFieldState: (
    componentProps: Omit<SlugFieldProps, keyof BaseFieldProps>,
    _resolved,
    { form, fullPath },
  ): SlugFieldState => {
    // Путь соседнего поля-источника — с тем же groupPrefix, что и у самого слага
    // (та же схема, что использует useDeclarativeField для построения fullPath).
    const groupPrefix = fullPath.includes('.') ? fullPath.slice(0, fullPath.lastIndexOf('.')) : undefined
    const sourcePath = groupPrefix ? `${groupPrefix}.${componentProps.source}` : componentProps.source

    const sourceValue = useStore(form.store, () => form.getFieldValue(sourcePath)) as string | undefined
    const slugifyFn = componentProps.slugify ?? defaultSlugify

    // Синхронизация по умолчанию включена, кроме сценария редактирования: значение слага на
    // монтировании уже непустое (запись с опубликованным адресом) — тогда синхронизация
    // выключена, пока не запрошена явно через `syncOnEdit` или кнопку «подставить из названия».
    // Ленивый инициализатор `useState` — читает значение поля только один раз, на монтировании.
    const [synced, setSynced] = useState(() => {
      const initialValue = form.getFieldValue(fullPath) as string | undefined
      return !(initialValue && !componentProps.syncOnEdit)
    })

    useEffect(() => {
      if (!synced || sourceValue === undefined) {
        return
      }
      form.setFieldValue(fullPath, slugifyFn(sourceValue))
    }, [synced, sourceValue, form, fullPath, slugifyFn])

    return {
      synced,
      resync: () => {
        setSynced(true)
        if (sourceValue !== undefined) {
          form.setFieldValue(fullPath, slugifyFn(sourceValue))
        }
      },
      markEdited: () => setSynced(false),
    }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <InputGroup
        endElement={!fieldState.synced && (
          <IconButton
            tabIndex={-1}
            me="-2"
            aspectRatio="square"
            size="sm"
            variant="ghost"
            height="calc(100% - {spacing.2})"
            aria-label="Подставить из названия"
            disabled={resolved.disabled}
            onPointerDown={(e) => {
              if (resolved.disabled) {
                return
              }
              if (e.button !== 0) {
                return
              }
              e.preventDefault()
              fieldState.resync()
            }}
          >
            <LuRotateCcw />
          </IconButton>
        )}
      >
        <Input
          value={(field.state.value as string) ?? ''}
          onChange={(e) => {
            fieldState.markEdited()
            field.handleChange((e.target as HTMLInputElement).value)
          }}
          onBlur={field.handleBlur}
          placeholder={resolved.placeholder}
          maxLength={componentProps.maxLength}
          autoComplete={componentProps.autoComplete ?? resolved.autocomplete}
          data-field-name={fullPath}
        />
      </InputGroup>
    </FieldWrapper>
  ),
})
