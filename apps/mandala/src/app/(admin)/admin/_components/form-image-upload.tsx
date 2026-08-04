'use client'

import { useDeclarativeForm, useFormGroup } from '@letar/forms'
import { createMetadataUrlResolver, ImageUploadField } from '@letar/image-upload'
import NextImage from 'next/image'

/**
 * Категории изображений mandala — предметная область приложения,
 * в общий тип библиотеки не выносится.
 */
type MandalaImageCategory = 'MANDALA' | 'THUMBNAIL' | 'WATERMARK' | 'OTHER'

/**
 * `/api/images/<id>` в mandala отдаёт JSON с описанием, а не байты картинки —
 * ссылку надо запрашивать отдельно. Резолвер вынесен в модульную константу:
 * инлайн-функция в пропсах пересоздаётся на каждый рендер.
 */
const resolveImageUrl = createMetadataUrlResolver()

interface FormImageUploadProps {
  /** Имя поля в форме */
  name: string
  /** Лейбл поля */
  label: string
  /** Категория изображения */
  category?: MandalaImageCategory
  /** Обязательное поле */
  required?: boolean
  /** Подсказка */
  helperText?: string
}

/**
 * Обёртка над ImageUploadField из @letar/image-upload для интеграции
 * с декларативной формой. Автоматически синхронизирует значение поля с формой.
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
          // Форма хранит пустую строку, библиотека отдаёт null при очистке
          onChange={(imageId) => field.handleChange(imageId ?? '')}
          label={label}
          category={category}
          required={required}
          disabled={disabled || readOnly}
          helperText={helperText}
          error={field.state.meta.errors?.[0]?.toString()}
          colorPalette="purple"
          previewSize={200}
          resolveImageUrl={resolveImageUrl}
          previewProps={{ width: '100%', maxW: '300px', height: '200px', bg: 'black' }}
          renderImage={({ src, alt }) => (
            <NextImage src={src} alt={alt} fill sizes="300px" style={{ objectFit: 'cover' }} />
          )}
        />
      )}
    </form.Field>
  )
}
