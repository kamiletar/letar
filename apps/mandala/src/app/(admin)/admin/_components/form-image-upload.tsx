'use client'

import { useDeclarativeForm, useFormGroup } from '@letar/forms'
import { ImageUploadField } from './image-upload-field'

interface FormImageUploadProps {
  /** Имя поля в форме */
  name: string
  /** Лейбл поля */
  label: string
  /** Категория изображения */
  category?: 'MANDALA' | 'THUMBNAIL' | 'WATERMARK' | 'OTHER'
  /** Обязательное поле */
  required?: boolean
  /** Подсказка */
  helperText?: string
}

/**
 * Обёртка над ImageUploadField для интеграции с декларативной формой.
 * Автоматически синхронизирует значение поля с формой.
 */
export function FormImageUpload({ name, label, category, required, helperText }: FormImageUploadProps) {
  const { form, disabled, readOnly } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  // Полный путь к полю (с учётом вложенности)
  const fullPath = parentGroup ? `${parentGroup.name}.${name}` : name

  // Используем form.Field для связи с формой
  return (
    <form.Field name={fullPath}>
      {(field: { state: { value: string; meta: { errors?: unknown[] } }; handleChange: (value: string) => void }) => (
        <ImageUploadField
          value={field.state.value || ''}
          onChange={field.handleChange}
          label={label}
          category={category}
          required={required}
          disabled={disabled || readOnly}
          helperText={helperText}
          error={field.state.meta.errors?.[0]?.toString()}
        />
      )}
    </form.Field>
  )
}
