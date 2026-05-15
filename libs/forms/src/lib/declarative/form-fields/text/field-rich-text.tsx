'use client'

import { Box, Field, HStack, IconButton } from '@chakra-ui/react'
import type { AnyFieldApi } from '@tanstack/react-form'
import TiptapImage from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { type Content, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { type ReactElement, useEffect, useMemo } from 'react'
import type { BaseFieldProps, FieldTooltipMeta } from '../../types'
import { FieldError, FieldLabel, getFieldErrors, useResolvedFieldProps } from '../base'
import { ImagePopover, type ImageUploadConfig } from './image-popover'
import { LinkPopover } from './link-popover'
import { DEFAULT_TOOLBAR_BUTTONS, TOOLBAR_CONFIG, type ToolbarButton } from './toolbar-config'

/**
 * Safe JSON parsing with fallback to empty document
 * Prevents crash on invalid JSON
 */
function safeParseJSON(value: string): Content {
  try {
    return JSON.parse(value) as Content
  } catch {
    console.warn('RichText: Invalid JSON content, using empty document')
    return ''
  }
}

/**
 * Props for RichText field
 */
export interface RichTextFieldProps extends BaseFieldProps {
  /** Tooltip for field label */
  tooltip?: FieldTooltipMeta
  /** Minimum editor height (by default: 150px) */
  minHeight?: string | number
  /** Maximum editor height (includes scroll) */
  maxHeight?: string | number
  /** Show toolbar (by default: true) */
  showToolbar?: boolean
  /** Toolbar buttons (by default: all) */
  toolbarButtons?: ToolbarButton[]
  /** Output format: 'html' or 'json' (by default: 'html') */
  outputFormat?: 'html' | 'json'
  /** Image upload configuration (optional) */
  imageUpload?: ImageUploadConfig
}

// Re-export type for convenience
export type { ImageUploadConfig }

/**
 * Form.Field.RichText - WYSIWYG rich text editor
 *
 * Renders Tiptap-based editor with toolbar
 * and automatic form integration.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.RichText name="content" label="Content" />
 * ```
 *
 * @example With custom height
 * ```tsx
 * <Form.Field.RichText
 *   name="description"
 *   label="Description"
 *   minHeight="200px"
 *   maxHeight="400px"
 * />
 * ```
 *
 * @example With limited toolbar
 * ```tsx
 * <Form.Field.RichText
 *   name="comment"
 *   label="Comment"
 *   toolbarButtons={['bold', 'italic', 'link']}
 * />
 * ```
 *
 * @example JSON output (for database storage)
 * ```tsx
 * <Form.Field.RichText
 *   name="article"
 *   label="Article"
 *   outputFormat="json"
 * />
 * ```
 */
export function FieldRichText({
  name,
  label,
  placeholder,
  helperText,
  required,
  disabled,
  readOnly,
  tooltip,
  minHeight = '150px',
  maxHeight,
  showToolbar = true,
  toolbarButtons = DEFAULT_TOOLBAR_BUTTONS,
  outputFormat = 'html',
  imageUpload,
}: RichTextFieldProps): ReactElement {
  const {
    form,
    fullPath,
    label: resolvedLabel,
    placeholder: resolvedPlaceholder,
    helperText: resolvedHelperText,
    tooltip: resolvedTooltip,
    required: resolvedRequired,
    disabled: resolvedDisabled,
    readOnly: resolvedReadOnly,
  } = useResolvedFieldProps(name, { label, placeholder, helperText, required, disabled, readOnly, tooltip })

  return (
    <form.Field name={fullPath}>
      {(field: AnyFieldApi) => {
        const { hasError, errorMessage } = getFieldErrors(field)

        return (
          <Field.Root
            invalid={hasError}
            required={resolvedRequired}
            disabled={resolvedDisabled}
            readOnly={resolvedReadOnly}
          >
            <FieldLabel label={resolvedLabel} tooltip={resolvedTooltip} required={resolvedRequired} />
            <RichTextEditor
              value={field.state.value as string}
              onChange={(value) => field.handleChange(value)}
              onBlur={field.handleBlur}
              placeholder={resolvedPlaceholder}
              minHeight={minHeight}
              maxHeight={maxHeight}
              showToolbar={showToolbar}
              toolbarButtons={toolbarButtons}
              outputFormat={outputFormat}
              disabled={disabled}
              readOnly={readOnly}
              hasError={hasError}
              fieldName={fullPath}
              imageUpload={imageUpload}
            />
            <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolvedHelperText} />
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

/**
 * Props for internal editor component
 */
interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  placeholder?: string
  minHeight: string | number
  maxHeight?: string | number
  showToolbar: boolean
  toolbarButtons: ToolbarButton[]
  outputFormat: 'html' | 'json'
  disabled?: boolean
  readOnly?: boolean
  hasError?: boolean
  fieldName: string
  imageUpload?: ImageUploadConfig
}

/**
 * Internal Tiptap editor component
 */
function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  minHeight,
  maxHeight,
  showToolbar,
  toolbarButtons,
  outputFormat,
  disabled,
  readOnly,
  hasError,
  fieldName,
  imageUpload,
}: RichTextEditorProps) {
  // Build extensions dynamically
  const extensions = useMemo(() => {
    // Base extensions
    const baseExtensions = [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Start typing...',
      }),
      // Add Image extension only if imageUpload is configured
      ...(imageUpload
        ? [
            TiptapImage.configure({
              inline: false,
              allowBase64: false,
              HTMLAttributes: {
                class: 'richtext-image',
              },
            }),
          ]
        : []),
    ]

    return baseExtensions
  }, [placeholder, imageUpload])

  const editor = useEditor({
    // Cast needed: minor @tiptap/core version drift (e.g. 3.20.0 vs 3.20.1) causes nominal type mismatch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @tiptap/core version incompatibility
    extensions: extensions as any[],
    content: outputFormat === 'json' && value ? safeParseJSON(value) : value || '',
    editable: !disabled && !readOnly,
    onUpdate: ({ editor }) => {
      if (outputFormat === 'json') {
        onChange(JSON.stringify(editor.getJSON()))
      } else {
        onChange(editor.getHTML())
      }
    },
    onBlur: () => {
      onBlur()
    },
    immediatelyRender: false,
  })

  // Synchronize external value changes
  useEffect(() => {
    if (!editor) {
      return
    }

    const currentContent = outputFormat === 'json' ? JSON.stringify(editor.getJSON()) : editor.getHTML()

    // Update only if content changed (avoid cursor jump)
    if (value !== currentContent) {
      const content = outputFormat === 'json' && value ? safeParseJSON(value) : value || ''
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, value, outputFormat])

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled && !readOnly)
    }
  }, [editor, disabled, readOnly])

  if (!editor) {
    return null
  }

  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      borderColor={hasError ? 'border.error' : 'border'}
      overflow="hidden"
      data-field-name={fieldName}
      _focusWithin={{
        borderColor: hasError ? 'border.error' : 'colorPalette.500',
        boxShadow: hasError
          ? '0 0 0 1px var(--chakra-colors-border-error)'
          : '0 0 0 1px var(--chakra-colors-colorPalette-500)',
      }}
    >
      {showToolbar && !readOnly && (
        <HStack p={1} gap={0.5} borderBottomWidth="1px" borderColor="border" bg="bg.subtle" flexWrap="wrap">
          {toolbarButtons.map((button) => {
            // Special handling for link — use Popover instead of window.prompt
            if (button === 'link') {
              return <LinkPopover key={button} editor={editor} disabled={disabled} />
            }

            // Special handling for image — use ImagePopover with upload
            if (button === 'image') {
              // Show button only if imageUpload is configured
              if (!imageUpload) {
                return null
              }
              return <ImagePopover key={button} editor={editor} config={imageUpload} disabled={disabled} />
            }

            const config = TOOLBAR_CONFIG[button]
            const isActive = config.isActive?.(editor) ?? false

            return (
              <IconButton
                key={button}
                aria-label={config.label}
                size="sm"
                variant={isActive ? 'solid' : 'ghost'}
                colorPalette={isActive ? 'brand' : undefined}
                onClick={() => config.action(editor)}
                disabled={disabled}
              >
                {config.icon}
              </IconButton>
            )
          })}
        </HStack>
      )}
      <Box
        minHeight={minHeight}
        maxHeight={maxHeight}
        overflowY={maxHeight ? 'auto' : undefined}
        p={3}
        css={{
          '& .tiptap': {
            outline: 'none',
            minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
          },
          '& .tiptap p.is-editor-empty:first-child::before': {
            color: 'var(--chakra-colors-fg-muted)',
            content: 'attr(data-placeholder)',
            float: 'left',
            height: 0,
            pointerEvents: 'none',
          },
          '& .tiptap h1': {
            fontSize: '2xl',
            fontWeight: 'bold',
            marginTop: '1em',
            marginBottom: '0.5em',
          },
          '& .tiptap h2': {
            fontSize: 'xl',
            fontWeight: 'bold',
            marginTop: '1em',
            marginBottom: '0.5em',
          },
          '& .tiptap h3': {
            fontSize: 'lg',
            fontWeight: 'semibold',
            marginTop: '1em',
            marginBottom: '0.5em',
          },
          '& .tiptap ul, & .tiptap ol': {
            paddingLeft: '1.5em',
            marginTop: '0.5em',
            marginBottom: '0.5em',
          },
          '& .tiptap blockquote': {
            borderLeft: '3px solid var(--chakra-colors-border)',
            paddingLeft: '1em',
            marginLeft: 0,
            marginTop: '0.5em',
            marginBottom: '0.5em',
            fontStyle: 'italic',
            color: 'var(--chakra-colors-fg-muted)',
          },
          '& .tiptap code': {
            backgroundColor: 'var(--chakra-colors-bg-subtle)',
            borderRadius: '3px',
            padding: '0.2em 0.4em',
            fontFamily: 'mono',
            fontSize: '0.9em',
          },
          '& .tiptap a': {
            color: 'var(--chakra-colors-colorPalette-500)',
            textDecoration: 'underline',
            cursor: 'pointer',
          },
          '& .tiptap p': {
            marginTop: '0.25em',
            marginBottom: '0.25em',
          },
          '& .tiptap img, & .tiptap .richtext-image': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '4px',
            marginTop: '0.5em',
            marginBottom: '0.5em',
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  )
}
