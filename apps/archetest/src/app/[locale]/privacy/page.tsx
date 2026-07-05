import { Box, Container, Heading, Link as ChakraLink, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

type Props = { params: Promise<{ locale: string }> }

const PRIVACY_EMAIL = 'privacy@letar.best'
/** Реестровый номер оператора ПДн (РКН). ФИО/ИНН в публичном репо не дублируются. */
const RKN_REGISTRY_NUMBER = '77-26-555440'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isRu = locale === 'ru'
  return {
    title: isRu ? 'Политика конфиденциальности' : 'Privacy Policy',
    description: isRu
      ? 'Как Archetest обрабатывает персональные данные (152-ФЗ)'
      : 'How Archetest processes personal data',
  }
}

/** Секция политики: заголовок + абзацы (могут содержать ReactNode для ссылок). */
interface Section {
  title: string
  body: React.ReactNode[]
}

function buildSections(isRu: boolean): Section[] {
  const emailLink = (
    <ChakraLink key="email" href={`mailto:${PRIVACY_EMAIL}`} color="blue.500" textDecoration="underline">
      {PRIVACY_EMAIL}
    </ChakraLink>
  )

  if (isRu) {
    return [
      {
        title: '1. Оператор',
        body: [
          <>
            Оператором персональных данных является индивидуальный предприниматель, зарегистрированный в Реестре
            операторов, осуществляющих обработку персональных данных (регистрационный номер записи{' '}
            {RKN_REGISTRY_NUMBER}). Запросы по обработке данных — на {emailLink}.
          </>,
        ],
      },
      {
        title: '2. Какие данные обрабатываются и зачем',
        body: [
          'Для зарегистрированных пользователей: фамилия, имя, отчество и адрес электронной почты (регистрация и ведение аккаунта); результаты психологического самотестирования (профиль выраженности личностных черт); самооценка настроения на момент прохождения; заметки специалиста-психолога о клиенте (вносятся с согласия клиента). Цель — расчёт и отображение результатов, ведение их динамики и предоставление функционала кабинета психолога.',
          'Обезличенные технические сведения могут собираться метрическими программами для улучшения сервиса.',
        ],
      },
      {
        title: '3. Правовое основание',
        body: [
          'Обработка осуществляется с согласия субъекта персональных данных (ст. 6 ч. 1 п. 1 Федерального закона № 152-ФЗ «О персональных данных»). Согласие даётся перед прохождением теста и может быть отозвано.',
        ],
      },
      {
        title: '4. Гостевой режим (экспресс-тест)',
        body: [
          'Экспресс-тест можно пройти без регистрации. В этом режиме результаты сохраняются только в локальном хранилище вашего браузера (localStorage) и не передаются на сервер оператора до тех пор, пока вы явно не привяжете результат к аккаунту. До этого момента такие данные не являются обработкой персональных данных оператором.',
        ],
      },
      {
        title: '5. Срок хранения',
        body: [
          'Данные хранятся до достижения цели обработки либо до отзыва согласия / запроса на удаление. После этого данные удаляются или обезличиваются.',
        ],
      },
      {
        title: '6. Хранение и защита',
        body: [
          'Данные хранятся на серверах, расположенных на территории Российской Федерации (ст. 18 ч. 5 152-ФЗ). Трансграничная передача не осуществляется. Применяются организационные и технические меры защиты от несанкционированного доступа.',
        ],
      },
      {
        title: '7. Ваши права',
        body: [
          'В соответствии со ст. 14–17 152-ФЗ вы вправе: получить сведения об обработке своих данных, потребовать их уточнения, блокирования или удаления, а также отозвать согласие. Удалить результаты тестирования можно самостоятельно в настройках аккаунта либо направив запрос на ',
          emailLink,
          '.',
        ].filter(Boolean),
      },
    ]
  }

  return [
    {
      title: '1. Operator',
      body: [
        <>
          The personal data operator is a sole proprietor registered in the Register of personal data operators
          (registry entry number {RKN_REGISTRY_NUMBER}). Data-related requests: {emailLink}.
        </>,
      ],
    },
    {
      title: '2. What data is processed and why',
      body: [
        'For registered users: full name and email address (registration and account management); psychological self-test results (personality trait profile); mood self-assessment at the time of testing; psychologist notes about a client (added with the client’s consent). Purpose — computing and displaying results, tracking their dynamics, and providing the psychologist cabinet.',
        'Anonymized technical data may be collected by analytics tools to improve the service.',
      ],
    },
    {
      title: '3. Legal basis',
      body: [
        'Processing is carried out with the data subject’s consent (Art. 6 §1(1) of Federal Law No. 152-FZ on Personal Data). Consent is given before taking the test and may be withdrawn.',
      ],
    },
    {
      title: '4. Guest mode (express test)',
      body: [
        'The express test can be taken without registration. In this mode results are stored only in your browser’s local storage and are not sent to the operator’s server until you explicitly link the result to an account. Until then, such data is not personal data processing by the operator.',
      ],
    },
    {
      title: '5. Retention period',
      body: [
        'Data is retained until the processing purpose is achieved or until consent is withdrawn / a deletion request is made, after which it is deleted or anonymized.',
      ],
    },
    {
      title: '6. Storage and protection',
      body: [
        'Data is stored on servers located in the Russian Federation (Art. 18 §5 of 152-FZ). No cross-border transfer is performed. Organizational and technical measures protect against unauthorized access.',
      ],
    },
    {
      title: '7. Your rights',
      body: [
        'Under Art. 14–17 of 152-FZ you may: obtain information about the processing of your data, request its correction, blocking or deletion, and withdraw consent. You can delete your test results yourself in account settings or by sending a request to ',
        emailLink,
        '.',
      ].filter(Boolean),
    },
  ]
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const isRu = locale === 'ru'
  const sections = buildSections(isRu)

  return (
    <Container maxW="3xl" py={12}>
      <VStack gap={6} align="stretch">
        <Heading size="xl">{isRu ? 'Политика конфиденциальности' : 'Privacy Policy'}</Heading>

        {sections.map((section) => (
          <Box key={section.title}>
            <Heading size="md" mb={2}>
              {section.title}
            </Heading>
            <VStack gap={2} align="stretch">
              {section.body.map((paragraph, i) => (
                <Text key={i} color="fg.muted" fontSize="sm">
                  {paragraph}
                </Text>
              ))}
            </VStack>
          </Box>
        ))}

        {/* Обязательный дисклеймер для псевдомедицинской тематики */}
        <Box mt={4} p={4} borderRadius="lg" borderWidth="1px" borderColor="border" bg="bg.subtle">
          <Text fontSize="sm" fontWeight="semibold">
            {isRu
              ? 'Archetest — инструмент самопознания и развития. Не является диагностическим инструментом и медицинским изделием.'
              : 'Archetest is a self-discovery and development tool. It is not a diagnostic tool or a medical device.'}
          </Text>
        </Box>
      </VStack>
    </Container>
  )
}
