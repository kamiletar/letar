'use client'

import { Box, Code, Heading, Link as ChakraLink, Text, VStack } from '@chakra-ui/react'
import { createForm, FormI18nProvider } from '@letar/forms'
import NextLink from 'next/link'
import { z } from 'zod/v4'
import { DemoPageLayout } from '../_components'

const DemoSchema = z
  .object({
    title: z.string().meta({ ui: { title: 'Название' } }),
  })
  .strip()

/** Инстанс приложения: защита от потери данных включена для всех форм, тексты — на русском */
const GuardedForm = createForm({
  dirtyGuard: { dialogTitle: 'Уйти со страницы?', confirmText: 'Уйти', cancelText: 'Остаться' },
})

/** Инстанс без своих текстов: заголовок и кнопки берутся из словаря по языку `FormI18nProvider` */
const PlainGuardedForm = createForm({ dirtyGuard: true })

/**
 * Демо `dirtyGuard` — автоматическая защита от потери данных в `createForm()` и на форме:
 * включена опцией инстанса, выключается пропом формы, ручной `Form.DirtyGuard` не дублируется.
 */
export default function DirtyGuardDemoPage() {
  return (
    <DemoPageLayout
      title="DirtyGuard Demo"
      description="createForm({ dirtyGuard }) — защита от потери данных для всех форм инстанса, выключение пропом формы"
    >
      <VStack gap={6} align="stretch">
        <Box borderWidth={1} borderRadius="md" p={4}>
          <Heading size="md" mb={2}>
            1. Защита включена опцией инстанса
          </Heading>
          <Text color="fg.muted" mb={4}>
            Измените поле и нажмите ссылку ниже — появится окно с текстами из{' '}
            <Code>createForm</Code>. Закрытие и обновление вкладки ловит <Code>beforeunload</Code>.
          </Text>
          <GuardedForm schema={DemoSchema} initialValue={{ title: '' }} onSubmit={() => undefined}>
            <VStack gap={3} align="stretch">
              <GuardedForm.Field.String name="title" />
              <ChakraLink asChild data-testid="guard-link">
                <NextLink href="/">На главную демо</NextLink>
              </ChakraLink>
            </VStack>
          </GuardedForm>
        </Box>

        <Box borderWidth={1} borderRadius="md" p={4}>
          <Heading size="md" mb={2}>
            2. Выключено на форме: <Code>dirtyGuard=&#123;false&#125;</Code>
          </Heading>
          <Text color="fg.muted" mb={4}>
            Форма входа или фильтр: уходить можно без вопросов, хотя опция инстанса включена.
          </Text>
          <GuardedForm schema={DemoSchema} initialValue={{ title: '' }} onSubmit={() => undefined} dirtyGuard={false}>
            <VStack gap={3} align="stretch">
              <GuardedForm.Field.String name="title" />
              <ChakraLink asChild data-testid="no-guard-link">
                <NextLink href="/">На главную демо</NextLink>
              </ChakraLink>
            </VStack>
          </GuardedForm>
        </Box>

        <Box borderWidth={1} borderRadius="md" p={4}>
          <Heading size="md" mb={2}>
            3. Язык из FormI18nProvider — встроенный словарь
          </Heading>
          <Text color="fg.muted" mb={4}>
            Форма с <Code>dirtyGuard</Code> без своих текстов: заголовок и кнопки берутся из словаря по языку.
          </Text>
          <FormI18nProvider locale="ru">
            <PlainGuardedForm schema={DemoSchema} initialValue={{ title: '' }} onSubmit={() => undefined}>
              <VStack gap={3} align="stretch">
                <PlainGuardedForm.Field.String name="title" />
                <ChakraLink asChild>
                  <NextLink href="/">На главную демо</NextLink>
                </ChakraLink>
              </VStack>
            </PlainGuardedForm>
          </FormI18nProvider>
        </Box>
      </VStack>
    </DemoPageLayout>
  )
}
