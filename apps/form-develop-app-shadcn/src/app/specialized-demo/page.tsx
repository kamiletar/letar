'use client'

import { FieldColorPicker, FieldEditable, FieldFileUpload, FieldSignature } from '@letar/forms-shadcn'
import { useState } from 'react'

import { DemoForm, DemoPageLayout, SubmittedDataPreview } from '../_components'

interface SpecializedValues {
  bio2: string
  brandColor: string
  attachments: File[]
  signature: string
}

const defaultValues: SpecializedValues = {
  bio2: 'Кликните для редактирования',
  brandColor: '#4299E1',
  attachments: [],
  signature: '',
}

export default function SpecializedDemoPage() {
  const [submitted, setSubmitted] = useState<SpecializedValues | null>(null)

  return (
    <DemoPageLayout
      title="Специализированные поля"
      description="Editable, ColorPicker, FileUpload (dropzone), Signature"
    >
      <DemoForm<SpecializedValues> defaultValues={defaultValues} onSubmit={setSubmitted}>
        <FieldEditable name="bio2" label="Кликабельный текст" />
        <FieldColorPicker name="brandColor" label="Цвет бренда" />
        <FieldFileUpload
          name="attachments"
          label="Вложения"
          variant="dropzone"
          maxFiles={3}
          showSize
          dropzoneDescription="До 3 файлов"
        />
        <FieldSignature name="signature" label="Подпись" width={320} height={120} />

        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>

      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
