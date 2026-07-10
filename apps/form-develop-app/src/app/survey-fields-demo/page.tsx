'use client'

import { Box, Heading, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

export default function SurveyFieldsDemoPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout title="Survey Fields" description="ImageChoice, Likert, YesNo — поля для опросников и анкет">
      <VStack gap={8} align="stretch">
        {/* ImageChoice */}
        <Box>
          <Heading size="md" mb={3}>
            ImageChoice — выбор из картинок
          </Heading>
          <Form
            debug
            initialValue={{ style: '' }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.ImageChoice
              name="style"
              label="Выберите стиль интерьера"
              options={[
                {
                  value: 'modern',
                  label: 'Современный',
                  image: 'https://picsum.photos/seed/modern/300/200',
                  description: 'Минимализм и чистые линии',
                },
                {
                  value: 'classic',
                  label: 'Классический',
                  image: 'https://picsum.photos/seed/classic/300/200',
                  description: 'Элегантность и традиции',
                },
                {
                  value: 'loft',
                  label: 'Лофт',
                  image: 'https://picsum.photos/seed/loft/300/200',
                  description: 'Индустриальный шик',
                },
              ]}
              columns={3}
            />
            <Form.Button.Submit>Выбрать</Form.Button.Submit>
          </Form>
        </Box>

        {/* Likert */}
        <Box>
          <Heading size="md" mb={3}>
            Likert — шкала согласия
          </Heading>
          <Form
            debug
            initialValue={{ experience: undefined }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.Likert
              name="experience"
              label="Как вы оцениваете опыт работы с нашим продуктом?"
              anchors={['Совсем не доволен', 'Не доволен', 'Нейтрально', 'Доволен', 'Очень доволен']}
              showNumbers
            />
            <Form.Button.Submit>Отправить</Form.Button.Submit>
          </Form>
        </Box>

        {/* YesNo — buttons */}
        <Box>
          <Heading size="md" mb={3}>
            YesNo — бинарный выбор
          </Heading>
          <Form
            debug
            initialValue={{ agree: undefined, recommend: undefined, subscribe: undefined }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.YesNo
              name="agree"
              label="Вы согласны с условиями использования?"
              yesLabel="Да, согласен"
              noLabel="Нет, отказываюсь"
              variant="buttons"
            />
            <Form.Field.YesNo name="recommend" label="Порекомендуете нас друзьям?" variant="thumbs" />
            <Form.Field.YesNo name="subscribe" label="Подписаться на рассылку?" variant="emoji" />
            <Form.Button.Submit>Отправить</Form.Button.Submit>
          </Form>
        </Box>

        {submittedData && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>
              Отправленные данные:
            </Heading>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>{JSON.stringify(submittedData, null, 2)}</pre>
          </Box>
        )}
      </VStack>
    </DemoPageLayout>
  )
}
