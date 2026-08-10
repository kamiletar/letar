'use client'

import { processFileWithSecurity } from '@letar/forms-core/security'
import { File as FileIcon, Upload, X } from 'lucide-react'
import type { ChangeEvent, DragEvent, ReactElement } from 'react'
import { useRef, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { cn } from '../utils/cn'
import type { FileUploadFieldProps } from './types'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) { return `${bytes} B` }
  if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB` }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileUploadFieldState {
  isDragging: boolean
  setIsDragging: (v: boolean) => void
  securityError: string | null
  setSecurityError: (v: string | null) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

/**
 * Form.Field.FileUpload — shadcn-скин.
 *
 * Beta: без Radix/Ark UI `FileUpload.Root` (в контракте UIKit такого примитива нет) — скрытый
 * нативный `<input type="file">` + drag&drop через `onDragOver`/`onDrop` для `variant="dropzone"`.
 * Превью изображений — через `URL.createObjectURL` (не `FileUpload.ItemPreviewImage`).
 * Security-проверка (`processFileWithSecurity`) портирована как есть — framework-free утилита из
 * `@letar/forms-core/security`, общая с Chakra-скином.
 */
export const FieldFileUpload = createField<FileUploadFieldProps, File[], FileUploadFieldState>({
  displayName: 'FieldFileUpload',

  useFieldState: (): FileUploadFieldState => {
    const [isDragging, setIsDragging] = useState(false)
    const [securityError, setSecurityError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    return { isDragging, setIsDragging, securityError, setSecurityError, inputRef }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const {
      accept,
      maxFileSize,
      maxFiles = 1,
      variant = 'button',
      showSize = false,
      clearable = true,
      dropzoneLabel = 'Перетащите файлы сюда',
      dropzoneDescription,
      buttonText = 'Загрузить файл',
      security,
    } = componentProps
    const { isDragging, setIsDragging, securityError, setSecurityError, inputRef } = fieldState
    const files = (field.state.value as File[]) ?? []
    const isImageAccept = accept?.includes('image/')

    const applyFiles = async (incoming: FileList | File[]) => {
      const picked = Array.from(incoming).slice(0, maxFiles)
      const selected = maxFileSize ? picked.filter((f) => f.size <= maxFileSize) : picked
      if (maxFileSize && selected.length < picked.length) {
        setSecurityError(`Файл превышает максимальный размер ${formatFileSize(maxFileSize)}`)
      }
      if (!security || selected.length === 0) {
        if (!maxFileSize || selected.length === picked.length) { setSecurityError(null) }
        field.handleChange(selected)
        return
      }

      const results = await Promise.all(selected.map((f) => processFileWithSecurity(f, security)))
      const rejected = results.filter((r) => !r.valid)
      if (rejected.length > 0) {
        setSecurityError(rejected.map((r) => r.reason).join('; '))
        const validFiles = results.filter((r) => r.valid).map((r) => r.file)
        field.handleChange(validFiles)
        return
      }

      setSecurityError(null)
      field.handleChange(results.map((r) => r.file))
    }

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void applyFiles(e.target.files)
      }
    }

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (resolved.disabled) { return }
      if (e.dataTransfer.files.length > 0) {
        void applyFiles(e.dataTransfer.files)
      }
    }

    const removeFile = (index: number) => {
      field.handleChange(files.filter((_, i) => i !== index))
    }

    const hiddenInput = (
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={handleInputChange}
        onBlur={field.handleBlur}
        disabled={resolved.disabled}
        className="hidden"
        data-field-name={fullPath}
      />
    )

    const fileList = files.length > 0 && (
      <ul className="mt-2 flex flex-wrap gap-2">
        {files.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            className="border-input relative flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
          >
            {isImageAccept
              ? (
                // oxlint-disable-next-line no-img-element -- blob URL превью, next/image не резолвит blob:
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="size-8 rounded object-cover"
                />
              )
              : <FileIcon className="text-muted-foreground size-4" />}
            <span className="max-w-40 truncate">{file.name}</span>
            {showSize && <span className="text-muted-foreground text-xs">{formatFileSize(file.size)}</span>}
            {clearable && (
              <button
                type="button"
                aria-label={`Удалить ${file.name}`}
                onClick={() => removeFile(index)}
                disabled={resolved.disabled}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
    )

    return (
      <FieldWrapper
        resolved={resolved}
        hasError={hasError || !!securityError}
        errorMessage={securityError ?? errorMessage}
        fullPath={fullPath}
      >
        {hiddenInput}

        {variant === 'button' && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={resolved.disabled}
              className="border-input inline-flex items-center gap-2 rounded-md border bg-transparent px-3 py-1.5 text-sm shadow-xs hover:bg-accent"
            >
              <Upload className="size-4" />
              {buttonText}
            </button>
            {fileList}
          </>
        )}

        {variant === 'dropzone' && (
          <>
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { inputRef.current?.click() }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (!resolved.disabled) { setIsDragging(true) }
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'border-input flex flex-col items-center gap-1 rounded-md border-2 border-dashed px-4 py-6 text-center text-sm',
                isDragging && 'border-ring bg-accent',
                resolved.disabled && 'pointer-events-none opacity-50',
              )}
            >
              <Upload className="text-muted-foreground size-5" />
              <span>{dropzoneLabel}</span>
              {dropzoneDescription && <span className="text-muted-foreground text-xs">{dropzoneDescription}</span>}
            </div>
            {fileList}
          </>
        )}

        {variant === 'input' && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={resolved.disabled}
            data-field-name={fullPath}
            className={cn(
              'border-input flex h-9 w-full items-center rounded-md border bg-transparent px-3 py-1 text-left text-sm shadow-xs',
              'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            )}
          >
            {files.length === 0 && (
              <span className="text-muted-foreground">{resolved.placeholder ?? 'Выберите файл(ы)'}</span>
            )}
            {files.length === 1 && <span>{files[0].name}</span>}
            {files.length > 1 && <span>{files.length} файлов</span>}
          </button>
        )}
      </FieldWrapper>
    )
  },
})
