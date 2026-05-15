'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

export default function MatrixChoiceDemoPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout
      title="Form.Field.MatrixChoice"
      description="Матричный выбор для опросников — таблица вопрос × вариант ответа"
    >
      <VStack gap={8} align="stretch">
        {/* Пример 1: NPS-опросник (radio) */}
        <Box>
          <Heading size="md" mb={3}>NPS-опросник (radio)</Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Один ответ на строку. Как в Google Forms.
          </Text>
          <Form
            debug
            initialValue={{ satisfaction: {} }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.MatrixChoice
              name="satisfaction"
              label="Оцените наш сервис"
              rows={[
                { value: 'speed', label: 'Скорость доставки' },
                { value: 'quality', label: 'Качество товара' },
                { value: 'support', label: 'Поддержка клиентов' },
                { value: 'price', label: 'Соотношение цена/качество' },
              ]}
              columns={[
                { value: '1', label: 'Ужасно' },
                { value: '2', label: 'Плохо' },
                { value: '3', label: 'Нормально' },
                { value: '4', label: 'Хорошо' },
                { value: '5', label: 'Отлично' },
              ]}
              variant="radio"
            />
            <Form.Button.Submit>Отправить</Form.Button.Submit>
          </Form>
        </Box>

        {/* Пример 2: Checkbox (множественный) */}
        <Box>
          <Heading size="md" mb={3}>Навыки (checkbox)</Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Несколько ответов на строку.
          </Text>
          <Form
            debug
            initialValue={{ skills: {} }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.MatrixChoice
              name="skills"
              label="Какими навыками вы владеете?"
              rows={[
                { value: 'frontend', label: 'Frontend' },
                { value: 'backend', label: 'Backend' },
                { value: 'devops', label: 'DevOps' },
              ]}
              columns={[
                { value: 'beginner', label: 'Начинающий' },
                { value: 'intermediate', label: 'Средний' },
                { value: 'advanced', label: 'Продвинутый' },
                { value: 'expert', label: 'Эксперт' },
              ]}
              variant="checkbox"
            />
            <Form.Button.Submit>Отправить</Form.Button.Submit>
          </Form>
        </Box>

        {/* Пример 3: Rating (звёзды) */}
        <Box>
          <Heading size="md" mb={3}>Рейтинг (звёзды)</Heading>
          <Form
            debug
            initialValue={{ rating: {} }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.MatrixChoice
              name="rating"
              label="Оцените блюда"
              rows={[
                { value: 'taste', label: 'Вкус' },
                { value: 'presentation', label: 'Подача' },
                { value: 'portion', label: 'Размер порции' },
              ]}
              columns={[
                { value: '1', label: '★' },
                { value: '2', label: '★★' },
                { value: '3', label: '★★★' },
                { value: '4', label: '★★★★' },
                { value: '5', label: '★★★★★' },
              ]}
              variant="rating"
            />
            <Form.Button.Submit>Отправить</Form.Button.Submit>
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
