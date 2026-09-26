'use client'

import { DevelopAppForm } from '@/develop-app-form/develop-app-form'
import { RegistryKeyDemoCreateFormSchema } from '@/generated/form-schemas/RegistryKeyDemo.form'
import { Code, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Ключ реестра createForm в схеме (`libs/forms/PLAN.md` §17): поле `categoryId` в `schema.zmodel` помечено
 * `@meta("form.fieldType", "Select.Category")`, `Form.AutoFields` рисует компонент `DevelopAppForm.Select.Category`
 * (справочник на хуках ZenStack с окном создания, правкой и оптимистичным create).
 */
export default function RegistryKeyDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <DemoPageLayout
      title="Registry Key Demo"
      description="Поле-справочник в автоформе: тип задан ключом реестра createForm прямо в schema.zmodel"
    >
      <Text color="fg.muted" mb={4}>
        Схема: <Code>@meta(&quot;form.fieldType&quot;, &quot;Select.Category&quot;)</Code>; компонент — в{' '}
        <Code>lazySelects</Code> инстанса. Список ключей проверяет <Code>FormRegistryCheck</Code> в typecheck.
      </Text>
      <DevelopAppForm
        schema={RegistryKeyDemoCreateFormSchema}
        initialValue={{ title: '', categoryId: '' }}
        onSubmit={setSubmitted}
      >
        <DevelopAppForm.AutoFields />
        <DevelopAppForm.Button.Submit>Отправить</DevelopAppForm.Button.Submit>
      </DevelopAppForm>
      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
