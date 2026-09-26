'use client'

import { DevelopAppForm } from '@/develop-app-form/develop-app-form'
import { AutoNameDemoCreateFormSchema } from '@/generated/form-schemas/AutoNameDemo.form'
import { Code, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Автоподбор по имени модели (`libs/forms/PLAN.md` §17.9): у поля `categoryId` нет `form.fieldType`, но есть
 * `@relation` на `Category`. Плагин кладёт в мету `registryName: 'Category'`, а `Form.AutoFields` находит в реестре
 * `createForm` компонент `Select.Category` и рисует его — тот же, что в `/registry-key-demo`, только без ключа в схеме.
 */
export default function AutoNameDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <DemoPageLayout
      title="Auto Name Demo"
      description="Поле-справочник в автоформе: компонент подобран по имени модели из @relation, ключ в схеме не нужен"
    >
      <Text color="fg.muted" mb={4}>
        В схеме нет <Code>form.fieldType</Code>: поле <Code>categoryId</Code> связано с моделью{' '}
        <Code>Category</Code>, а в <Code>lazySelects</Code> инстанса есть <Code>Category</Code>.
      </Text>
      <DevelopAppForm
        schema={AutoNameDemoCreateFormSchema}
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
