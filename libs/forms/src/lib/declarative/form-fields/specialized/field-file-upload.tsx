'use client'

import {
  Box,
  Button,
  Field,
  FileUpload,
  Float,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  useFileUploadContext,
} from '@chakra-ui/react'
import { type ReactElement, type ReactNode, useState } from 'react'
import { LuFile, LuUpload, LuX } from 'react-icons/lu'
import type { FileSecurityConfig } from '../../security/file-security'
import { processFileWithSecurity } from '../../security/file-security'
import type { FieldTooltipMeta } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

/**
 * Props for FileUpload field
 */
export interface FileUploadFieldProps {
  /** Field name */
  name?: string
  /** Field label */
  label?: string
  /** Helper text below the field */
  helperText?: string
  /** Required field */
  required?: boolean
  /** Disabled field */
  disabled?: boolean
  /** Tooltip for field label */
  tooltip?: FieldTooltipMeta

  /**
   * Accepted file types
   * @example "image/*"
   * @example ["image/png", "image/jpeg"]
   * @example ".pdf,.doc,.docx"
   */
  accept?: string | string[]
  /** Maximum file size in bytes */
  maxFileSize?: number
  /** Maximum number of files (by default: 1) */
  maxFiles?: number
  /**
   * Display variant
   * - 'button': Simple trigger button
   * - 'dropzone': Drag & drop zone
   * - 'input': Input-like appearance
   */
  variant?: 'button' | 'dropzone' | 'input'
  /** Show file sizes in list */
  showSize?: boolean
  /** Allow removing files from list */
  clearable?: boolean
  /** Dropzone label text */
  dropzoneLabel?: ReactNode
  /** Dropzone description */
  dropzoneDescription?: ReactNode
  /** Button text (for 'button' variant) */
  buttonText?: ReactNode
  /**
   * Security configuration for file validation.
   * - maxSize: max file size ('10MB', '500KB')
   * - allowedTypes: MIME types checked via magic bytes
   * - stripMetadata: remove EXIF from images
   * - renameFile: replace filename with UUID
   */
  security?: FileSecurityConfig
}

/**
 * File list with image previews
 */
function FileImageList({ clearable }: { clearable?: boolean }) {
  const fileUpload = useFileUploadContext()

  if (fileUpload.acceptedFiles.length === 0) {
    return null
  }

  return (
    <HStack wrap="wrap" gap="3" mt="2">
      {fileUpload.acceptedFiles.map((file) => (
        <FileUpload.Item key={file.name} file={file} p="2" width="auto" pos="relative">
          {clearable && (
            <Float placement="top-end">
              <FileUpload.ItemDeleteTrigger asChild>
                <IconButton size="2xs" variant="solid" colorPalette="red" rounded="full">
                  <LuX />
                </IconButton>
              </FileUpload.ItemDeleteTrigger>
            </Float>
          )}
          <FileUpload.ItemPreview type="image/*" asChild>
            <FileUpload.ItemPreviewImage boxSize="16" rounded="md" objectFit="cover" />
          </FileUpload.ItemPreview>
          <FileUpload.ItemPreview type=".*" asChild>
            <Icon fontSize="4xl" color="fg.muted">
              <LuFile />
            </Icon>
          </FileUpload.ItemPreview>
        </FileUpload.Item>
      ))}
    </HStack>
  )
}

/**
 * Standard file list (non-images)
 */
function FileList({ showSize, clearable }: { showSize?: boolean; clearable?: boolean }) {
  const fileUpload = useFileUploadContext()

  if (fileUpload.acceptedFiles.length === 0) {
    return null
  }

  return (
    <FileUpload.ItemGroup mt="2">
      {fileUpload.acceptedFiles.map((file) => (
        <FileUpload.Item key={file.name} file={file}>
          <FileUpload.ItemPreview asChild>
            <Icon fontSize="lg" color="fg.muted">
              <LuFile />
            </Icon>
          </FileUpload.ItemPreview>

          {showSize
            ? (
              <FileUpload.ItemContent>
                <FileUpload.ItemName />
                <FileUpload.ItemSizeText />
              </FileUpload.ItemContent>
            )
            : <FileUpload.ItemName flex="1" />}

          {clearable && (
            <FileUpload.ItemDeleteTrigger asChild>
              <IconButton variant="ghost" color="fg.muted" size="xs">
                <LuX />
              </IconButton>
            </FileUpload.ItemDeleteTrigger>
          )}
        </FileUpload.Item>
      ))}
    </FileUpload.ItemGroup>
  )
}

/**
 * Form.Field.FileUpload - File upload field with multiple variants
 *
 * Supports uploading single or multiple files with drag & drop,
 * file preview and automatic form integration.
 *
 * @example Button variant (by default)
 * ```tsx
 * <Form.Field.FileUpload name="avatar" label="Avatar" accept="image/*" />
 * ```
 *
 * @example Dropzone variant
 * ```tsx
 * <Form.Field.FileUpload
 *   name="documents"
 *   label="Documents"
 *   variant="dropzone"
 *   maxFiles={5}
 *   accept=".pdf,.doc,.docx"
 *   dropzoneLabel="Drop files here"
 *   dropzoneDescription="PDF, DOC up to 10MB"
 * />
 * ```
 *
 * @example Input variant
 * ```tsx
 * <Form.Field.FileUpload
 *   name="file"
 *   label="Select file"
 *   variant="input"
 *   placeholder="Select file..."
 * />
 * ```
 *
 * @example Multiple images with preview
 * ```tsx
 * <Form.Field.FileUpload
 *   name="gallery"
 *   label="Gallery"
 *   variant="dropzone"
 *   accept="image/*"
 *   maxFiles={10}
 *   showSize
 *   clearable
 * />
 * ```
 */
interface FileUploadFieldState {
  securityError: string | null
  setSecurityError: React.Dispatch<React.SetStateAction<string | null>>
}

export const FieldFileUpload = createField<FileUploadFieldProps, File[], FileUploadFieldState>({
  displayName: 'FieldFileUpload',

  useFieldState: (componentProps) => {
    const [securityError, setSecurityError] = useState<string | null>(null)
    return { securityError, setSecurityError }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const {
      accept,
      maxFileSize,
      maxFiles = 1,
      variant = 'button',
      showSize = false,
      clearable = true,
      dropzoneLabel = 'Drag and drop files here',
      dropzoneDescription,
      buttonText = 'Upload file',
      security,
    } = componentProps
    const { securityError, setSecurityError } = fieldState

    const placeholder = resolved.placeholder ?? 'Select file(s)'

    // Normalize accept to array for Chakra
    const normalizedAccept = accept
      ? typeof accept === 'string'
        ? accept.split(',').map((s) => s.trim())
        : accept
      : undefined

    // Check if working with images for preview
    const isImageUpload = normalizedAccept?.some((type) => type.startsWith('image/') || type === 'image/*')

    return (
      <Field.Root invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />

        <FileUpload.Root
          maxFiles={maxFiles}
          maxFileSize={maxFileSize}
          accept={normalizedAccept}
          disabled={resolved.disabled}
          onFileChange={async (details) => {
            if (!security || details.acceptedFiles.length === 0) {
              setSecurityError(null)
              field.handleChange(details.acceptedFiles)
              return
            }

            // Применяем security-проверки к каждому файлу
            const results = await Promise.all(details.acceptedFiles.map((f) => processFileWithSecurity(f, security)))

            const rejected = results.filter((r) => !r.valid)
            if (rejected.length > 0) {
              setSecurityError(rejected.map((r) => r.reason).join('; '))
              // Пропускаем только валидные файлы
              const validFiles = results.filter((r) => r.valid).map((r) => r.file)
              field.handleChange(validFiles.length > 0 ? validFiles : [])
              return
            }

            setSecurityError(null)
            field.handleChange(results.map((r) => r.file))
          }}
          data-field-name={fullPath}
        >
          <FileUpload.HiddenInput onBlur={field.handleBlur} />

          {variant === 'button' && (
            <>
              <FileUpload.Trigger asChild>
                <Button variant="outline" size="sm">
                  <LuUpload />
                  {buttonText}
                </Button>
              </FileUpload.Trigger>
              {isImageUpload
                ? <FileImageList clearable={clearable} />
                : <FileList showSize={showSize} clearable={clearable} />}
            </>
          )}

          {variant === 'dropzone' && (
            <>
              <FileUpload.Dropzone>
                <Icon size="md" color="fg.muted">
                  <LuUpload />
                </Icon>
                <FileUpload.DropzoneContent>
                  <Box>{dropzoneLabel}</Box>
                  {dropzoneDescription && <Text color="fg.muted">{dropzoneDescription}</Text>}
                </FileUpload.DropzoneContent>
              </FileUpload.Dropzone>
              {isImageUpload
                ? <FileImageList clearable={clearable} />
                : <FileList showSize={showSize} clearable={clearable} />}
            </>
          )}

          {variant === 'input' && (
            <Input asChild>
              <FileUpload.Trigger>
                <FileUpload.Context>
                  {({ acceptedFiles }) => {
                    if (acceptedFiles.length === 1) {
                      return <span>{acceptedFiles[0].name}</span>
                    }
                    if (acceptedFiles.length > 1) {
                      return <span>{acceptedFiles.length} files</span>
                    }
                    return <Text color="fg.subtle">{placeholder}</Text>
                  }}
                </FileUpload.Context>
              </FileUpload.Trigger>
            </Input>
          )}
        </FileUpload.Root>

        <FieldError
          hasError={hasError || !!securityError}
          errorMessage={securityError ?? errorMessage}
          helperText={resolved.helperText}
        />
      </Field.Root>
    )
  },
})
