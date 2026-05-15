import { Link } from '@/i18n/navigation'
import { Box, Link as ChakraLink, Container, Heading, Table, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { PERSONALITY_TYPES } from '../_data/personality-types'

/**
 * Страница «Если вы психолог» — руководство для клинических специалистов.
 * Двуязычная версия (RU/EN), переключение по locale.
 */
export default function ForProfessionalsPage({ params }: { params: Promise<{ locale: string }> }) {
  return <ForProfessionalsContent params={params} />
}

async function ForProfessionalsContent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ForProfessionalsView locale={locale} />
}

function ForProfessionalsView({ locale }: { locale: string }) {
  const t = useTranslations('quiz')
  const isRu = locale === 'ru'

  return (
    <Container maxW="4xl" py={12}>
      <VStack gap={8} align="start">
        <Heading size="2xl">{isRu ? 'Если вы психолог' : 'For Clinicians'}</Heading>
        <Text color="fg.muted">
          {isRu
            ? 'Руководство для специалистов: клинических психологов, психотерапевтов и психиатров.'
            : 'A guide for clinical psychologists, psychotherapists, and psychiatrists.'}
        </Text>

        {/* О тесте */}
        <Section title={isRu ? 'О тесте' : 'About the Test'}>
          <Text>
            {isRu
              ? 'Многошкальный скрининговый опросник личностных черт и аффективных паттернов. 1955 вопросов, 13 шкал, ситуативный формат (каждый вопрос — жизненная ситуация с четырьмя вариантами реагирования). Результат — нормализованный профиль выраженности черт от 0 до 100% по каждой шкале.'
              : 'A multi-scale screening questionnaire for personality traits and affective patterns. 1955 items, 13 scales, situational format (each item presents a life situation with four response options). The result is a normalized trait prominence profile from 0 to 100% on each scale.'}
          </Text>
          <Text>
            {isRu
              ? 'Тест не является диагностическим инструментом и не заменяет клиническое интервью. Его задача — дать вам и вашему клиенту структурированную отправную точку для обсуждения.'
              : 'The test is not a diagnostic instrument and does not replace a clinical interview. Its purpose is to provide you and your client with a structured starting point for discussion.'}
          </Text>
        </Section>

        {/* Порционное прохождение и стратификация */}
        <Section title={isRu ? 'Порционное прохождение и стратификация' : 'Portioned Completion and Stratification'}>
          <Text>
            {isRu
              ? 'Тест проходится порциями по 50 вопросов. Каждая порция формируется методом стратифицированной выборки: вопросы распределяются пропорционально по всем 13 шкалам с гарантией минимум одного вопроса на каждую шкалу. Это обеспечивает равномерный рост достоверности профиля по всем осям после каждой порции.'
              : 'The test is completed in batches of 50 questions. Each batch is formed using stratified sampling: questions are distributed proportionally across all 13 scales with a guarantee of at least one question per scale. This ensures uniform growth in profile reliability across all axes after each batch.'}
          </Text>
          <Text>
            {isRu
              ? 'Стратификация особенно важна для дополнительных шкал (BAR, PAG, DPR), которые имеют меньший пул вопросов. Без стратификации первые порции могли не содержать ни одного вопроса на BAR, что откладывало дифференциальную диагностику BOR/BAR до поздних этапов прохождения.'
              : 'Stratification is particularly important for supplementary scales (BAR, PAG, DPR), which have a smaller question pool. Without stratification, early batches could contain no BAR items, delaying BOR/BAR differential diagnosis until later stages of completion.'}
          </Text>
          <Text>
            {isRu
              ? 'Досрочное завершение порции невозможно — клиент отвечает на все 50 вопросов (или пропускает их), после чего получает обновлённый профиль. Это гарантирует, что каждая порция вносит сбалансированный вклад в достоверность всех шкал.'
              : 'Early completion of a batch is not possible — the client answers all 50 questions (or skips them), then receives an updated profile. This guarantees that each batch contributes a balanced improvement to the reliability of all scales.'}
          </Text>
        </Section>

        {/* Шкалы */}
        <Section title={isRu ? 'Шкалы' : 'Scales'}>
          <Text fontWeight="bold">{isRu ? '10 базовых шкал (DSM-5):' : '10 core scales (DSM-5):'}</Text>
          <Text>
            {isRu
              ? 'Кластер A (эксцентричные): параноидное (PAR), шизоидное (SZD), шизотипическое (SZT).'
              : 'Cluster A (eccentric): Paranoid (PAR), Schizoid (SZD), Schizotypal (SZT).'}
          </Text>
          <Text>
            {isRu
              ? 'Кластер B (драматичные): антисоциальное (ANT), пограничное (BOR), гистрионное (HIS), нарциссическое (NAR).'
              : 'Cluster B (dramatic): Antisocial (ANT), Borderline (BOR), Histrionic (HIS), Narcissistic (NAR).'}
          </Text>
          <Text>
            {isRu
              ? 'Кластер C (тревожные): избегающее (AVD), зависимое (DEP), обсессивно-компульсивное (OBC).'
              : 'Cluster C (anxious): Avoidant (AVD), Dependent (DEP), Obsessive-Compulsive (OBC).'}
          </Text>
          <Text fontWeight="bold" mt={4}>
            {isRu ? '3 дополнительные шкалы:' : '3 supplementary scales:'}
          </Text>
          <Text>
            {isRu
              ? 'BAR — биполярное аффективное расстройство (скрининг расстройства настроения как дифференциально-диагностический фильтр).'
              : 'BAR — Bipolar Affective Disorder (mood disorder screening as a differential-diagnostic filter).'}
          </Text>
          <Text>
            {isRu
              ? 'PAG — пассивно-агрессивный (негативистический) паттерн (исключён из DSM-5, сохранён по клинической востребованности).'
              : 'PAG — Passive-Aggressive (negativistic) pattern (removed from DSM-5, retained due to clinical relevance).'}
          </Text>
          <Text>
            {isRu
              ? 'DPR — депрессивный тип личности (из приложения DSM-IV, хронический депрессивный темперамент как черта).'
              : 'DPR — Depressive Personality (from DSM-IV appendix, chronic depressive temperament as a trait).'}
          </Text>
        </Section>

        {/* На этапе первичной консультации */}
        <Section title={isRu ? 'На этапе первичной консультации' : 'During Initial Consultation'}>
          <Text>
            {isRu
              ? 'Клиент проходит тест до первой встречи или между первой и второй сессиями. Профиль сразу показывает зоны, требующие внимания, и вы можете начать с прицельных вопросов. Расхождение между вашим клиническим впечатлением и профилем — ценный материал для обсуждения.'
              : 'The client completes the test before the first session or between the first and second sessions. The profile immediately highlights areas requiring attention, allowing you to start with targeted questions. Any discrepancy between your clinical impression and the profile is valuable material for discussion.'}
          </Text>
        </Section>

        {/* Дифференциальная диагностика */}
        <Section title={isRu ? 'Дифференциальная диагностика' : 'Differential Diagnosis'}>
          <Text>
            {isRu
              ? 'Шкала BAR — ключевой инструмент дифференциации. На практике клиенты с нераспознанным биполярным расстройством часто получают ошибочный диагноз пограничного (BOR), нарциссического (NAR) или гистрионного (HIS) расстройства личности.'
              : 'The BAR scale is a key differentiation tool. In practice, clients with unrecognized bipolar disorder are frequently misdiagnosed with Borderline (BOR), Narcissistic (NAR), or Histrionic (HIS) personality disorder.'}
          </Text>
          <Text>
            {isRu
              ? 'Если профиль показывает одновременно высокие BOR и BAR — это сигнал: перепроверьте, не объясняется ли «пограничная» картина циклическим расстройством настроения. Тест содержит 10 специальных дифференциальных вопросов (1946–1955), которые разводят реактивную нестабильность BOR и эндогенную цикличность BAR.'
              : 'If the profile shows simultaneously elevated BOR and BAR, this is a signal: verify whether the "borderline" presentation may be better explained by a cyclical mood disorder. The test includes 10 dedicated differential items (1946–1955) that distinguish reactive instability of BOR from endogenous cyclicity of BAR.'}
          </Text>
        </Section>

        {/* Совместимость */}
        <Section title={isRu ? 'Совместимость с другими инструментами' : 'Compatibility with Other Instruments'}>
          <Text>
            {isRu
              ? 'MCMI-IV — для углублённой диагностики расстройств личности.'
              : 'MCMI-IV — for in-depth personality disorder assessment.'}
          </Text>
          <Text>
            {isRu
              ? 'BDI-II — при высоком DPR или BAR для оценки текущей глубины депрессии.'
              : 'BDI-II — when DPR or BAR is elevated, to assess current depression severity.'}
          </Text>
          <Text>
            {isRu
              ? 'MDQ — при высоком BAR для уточнения биполярного спектра.'
              : 'MDQ — when BAR is elevated, to clarify bipolar spectrum features.'}
          </Text>
          <Text>
            {isRu ? 'SCL-90-R — для общей оценки симптоматики.' : 'SCL-90-R — for general symptom assessment.'}
          </Text>
          <Text>
            {isRu
              ? 'YSQ — для идентификации ранних дезадаптивных схем.'
              : 'YSQ — to identify early maladaptive schemas.'}
          </Text>
        </Section>

        {/* Этика */}
        <Section title={isRu ? 'Этические принципы' : 'Ethical Principles'}>
          <Text>
            {isRu
              ? 'Результаты теста конфиденциальны и предоставляются только клиенту и его терапевту с информированного согласия клиента. Тест не должен использоваться для кадрового отбора, судебной экспертизы, принудительного скрининга.'
              : "Test results are confidential and are shared only with the client and their therapist with the client's informed consent. The test must not be used for employment screening, forensic evaluation, or compulsory screening."}
          </Text>
          <Text>
            {isRu
              ? 'Обсуждение результатов с клиентом должно проходить в атмосфере безоценочности и уважения. Ни один профиль не является «плохим» — каждый отражает уникальную конфигурацию черт со своими ресурсами и зонами роста.'
              : 'Discussing results with the client should take place in a non-judgmental and respectful atmosphere. No profile is "bad" — each reflects a unique trait configuration with its own strengths and areas for growth.'}
          </Text>
        </Section>

        {/* Кабинет психолога */}
        <Section title={isRu ? 'Кабинет психолога на платформе' : 'Psychologist Cabinet on the Platform'}>
          <Text>
            {isRu ? (
              <>
                На платформе доступен кабинет психолога — инструмент для отслеживания результатов ваших клиентов. Для
                активации кабинета нажмите «Я специалист» на{' '}
                <ChakraLink asChild color="blue.500">
                  <Link href="/cabinet">странице кабинета</Link>
                </ChakraLink>
                .
              </>
            ) : (
              <>
                The platform features a psychologist cabinet — a tool for tracking your clients' results. To activate
                the cabinet, click "I'm a Professional" on the{' '}
                <ChakraLink asChild color="blue.500">
                  <Link href="/cabinet">cabinet page</Link>
                </ChakraLink>
                .
              </>
            )}
          </Text>
          <Text>
            {isRu
              ? 'Ваш клиент привязывает вас по email в настройках своего профиля — решение всегда за клиентом. После привязки вы получаете доступ к:'
              : 'Your client links you by email in their profile settings — the decision is always theirs. After linking, you get access to:'}
          </Text>
          <VStack align="start" gap={1} pl={2}>
            {(isRu
              ? [
                  'Кумулятивному профилю клиента с клиническими названиями шкал',
                  'Динамике результатов по сессиям (график изменений)',
                  'Радарной диаграмме профиля',
                  'Топ-3 выраженных типов с описаниями взаимодействий',
                  'Личным заметкам о клиенте (видны только вам)',
                ]
              : [
                  "Client's cumulative profile with clinical scale names",
                  'Results dynamics across sessions (change chart)',
                  'Profile radar diagram',
                  'Top 3 prominent types with interaction descriptions',
                  'Personal client notes (visible only to you)',
                ]
            ).map((item) => (
              <Text key={item}>• {item}</Text>
            ))}
          </VStack>
          <Text>
            {isRu
              ? 'Клиент может отозвать доступ в любой момент. Вы не видите ответы клиента на отдельные вопросы — только нормализованные баллы по шкалам.'
              : "The client can revoke access at any time. You cannot see the client's individual answers — only normalized scale scores."}
          </Text>
        </Section>

        {/* Таблица соответствия шкал */}
        <Section title={isRu ? 'Таблица соответствия шкал' : 'Scale Reference Table'}>
          <Table.Root size="sm" w="100%">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>{isRu ? 'Код' : 'Code'}</Table.ColumnHeader>
                <Table.ColumnHeader>{isRu ? 'Название' : 'Name'}</Table.ColumnHeader>
                <Table.ColumnHeader>{isRu ? 'Архетип' : 'Archetype'}</Table.ColumnHeader>
                <Table.ColumnHeader>{isRu ? 'Клиническое' : 'Clinical'}</Table.ColumnHeader>
                <Table.ColumnHeader>{isRu ? 'Кластер' : 'Cluster'}</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {PERSONALITY_TYPES.map((type) => (
                <Table.Row key={type.code}>
                  <Table.Cell fontFamily="mono" fontWeight="bold">
                    {type.code}
                  </Table.Cell>
                  <Table.Cell>{isRu ? type.label : type.labelEn}</Table.Cell>
                  <Table.Cell>{isRu ? type.archetype : type.archetypeEn}</Table.Cell>
                  <Table.Cell color="fg.muted">{isRu ? type.clinical : type.clinicalEn}</Table.Cell>
                  <Table.Cell>
                    {type.cluster === 'A'
                      ? 'A'
                      : type.cluster === 'B'
                        ? 'B'
                        : type.cluster === 'C'
                          ? 'C'
                          : isRu
                            ? 'Доп.'
                            : 'Suppl.'}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Section>

        {/* Ссылка на главную */}
        <Box w="100%" textAlign="center" pt={4}>
          <ChakraLink href={`/${locale}`} color="blue.500" fontWeight="bold">
            ← {t('title')}
          </ChakraLink>
        </Box>
      </VStack>
    </Container>
  )
}

/** Секция с заголовком */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box w="100%">
      <Heading size="lg" mb={3}>
        {title}
      </Heading>
      <VStack align="start" gap={2}>
        {children}
      </VStack>
    </Box>
  )
}
