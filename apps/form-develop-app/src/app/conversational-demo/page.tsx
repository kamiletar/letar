'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { ConversationalMode, Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

export default function ConversationalDemoPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout
      title="Conversational Mode"
      description="Typeform-стиль: одно поле за раз с анимацией и навигацией"
    >
      <VStack gap={8} align="stretch">
        <Box maxW="lg" mx="auto" w="full">
          <Form
            debug
            initialValue={{
              name: '',
              email: '',
              experience: undefined,
              recommend: undefined,
              feedback: '',
            }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <ConversationalMode
              showProgress
              showQuestionNumber
              completedScreen={
                <VStack gap={2} textAlign="center">
                  <Text fontSize="2xl">Спасибо за ответы!</Text>
                  <Form.Button.Submit>Отправить результаты</Form.Button.Submit>
                </VStack>
              }
            >
              <Form.Field.String name="name" label="Как вас зовут?" placeholder="Введите имя" />
              <Form.Field.String name="email" label="Ваш email?" placeholder="email@example.com" />
              <Form.Field.Likert
                name="experience"
                label="Как вы оцениваете наш продукт?"
                anchors={['Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично']}
                showNumbers
              />
              <Form.Field.YesNo
                name="recommend"
                label="Порекомендуете ли вы нас друзьям?"
                yesLabel="Да, конечно!"
                noLabel="Нет"
                variant="thumbs"
              />
              <Form.Field.Textarea name="feedback" label="Что мы можем улучшить?" placeholder="Ваши идеи..." />
            </ConversationalMode>
          </Form>
        </Box>

        {submittedData && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>Отправленные данные:</Heading>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(submittedData, null, 2)}
            </pre>
          </Box>
        )}
      </VStack>
    </DemoPageLayout>
  )
}
