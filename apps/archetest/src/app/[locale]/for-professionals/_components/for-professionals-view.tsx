import { Link } from '@/i18n/navigation'
import { Box, Container, Heading, Link as ChakraLink, Table, Text, VStack } from '@chakra-ui/react'
import { TouchLink } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { Fragment, Suspense } from 'react'
import { ProfessionalLeadForm } from '../../_components/professional-lead-form'
import { CORE_SCALE_COUNT, TOTAL_QUESTIONS } from '../../_data/bank-stats'
import { PERSONALITY_TYPES } from '../../_data/personality-types'
import { SCALE_PROTOTYPES } from '../../_data/scale-prototypes'

/**
 * Содержимое страницы «Если вы психолог». Вынесено из `page.tsx`, чтобы его можно было рендерить в
 * тесте (файл страницы не может экспортировать ничего, кроме default и конфигурации роута).
 * Тексты — в `messages/{ru,en}.json` (namespace `forProfessionals`); `isRu` остался только для
 * выбора полей справочников (`label`/`labelEn`).
 */
export function ForProfessionalsView({ locale }: { locale: string }) {
  const tQuiz = useTranslations('quiz')
  const t = useTranslations('forProfessionals')
  const isRu = locale === 'ru'

  return (
    <Container maxW="4xl" py={12}>
      <VStack gap={8} align="start">
        <Heading size="2xl">{t('heading')}</Heading>
        <Text color="fg.muted">
          {t('subtitle')}
        </Text>

        {/* О тесте */}
        <Section title={t('about.title')}>
          <Text>
            {t('about.p1', { totalQuestions: TOTAL_QUESTIONS, coreScales: CORE_SCALE_COUNT })}
          </Text>
          <Text>
            {t('about.p2')}
          </Text>
        </Section>

        {/* Методология */}
        <Section title={t('methodology.title')} id="methodology">
          <Text>
            {t('methodology.intro')}
          </Text>
          {/* Скролл внутри таблицы: на телефоне она шире экрана и раздвигала всю страницу */}
          <Table.ScrollArea w="100%" borderWidth="1px" borderColor="border" borderRadius="md">
            <Table.Root size="sm" w="100%">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>{t('methodology.colScale')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('methodology.colPrototype')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('methodology.colSource')}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {SCALE_PROTOTYPES.map(({ group, groupEn, prototype, prototypeEn, source, doi }) => (
                  <Table.Row key={group}>
                    <Table.Cell fontWeight="bold">{isRu ? group : groupEn}</Table.Cell>
                    <Table.Cell>{isRu ? prototype : prototypeEn}</Table.Cell>
                    <Table.Cell color="fg.muted">
                      <ChakraLink
                        href={`https://doi.org/${doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="fg.muted"
                      >
                        {source}
                      </ChakraLink>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
          <Text>
            {t('methodology.core', { validatedScales: CORE_SCALE_COUNT - 1, coreScales: CORE_SCALE_COUNT })}
          </Text>
          <Text>
            {t('methodology.experimental', { coreScales: CORE_SCALE_COUNT })}
          </Text>
          <Text>
            {t('methodology.triads')}
          </Text>

          <Heading size="md" pt={2}>
            {t('darkCore.title')}
          </Heading>
          <Text>
            {t('darkCore.dFactor')}
          </Text>
          <Text>
            {t('darkCore.index')}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {t('darkCore.sources')}
            {[
              ['Moshagen, Hilbig & Zettler, 2018', '10.1037/rev0000111'],
              ['Moshagen, Zettler & Hilbig, 2020', '10.1037/pas0000778'],
              ['Bader et al., 2023', '10.1111/jopy.12785'],
              ['Hilbig et al., 2023', '10.1038/s41598-023-42115-z'],
              ['Vize, Miller & Lynam, 2021', '10.1111/jopy.12601'],
              [`Hilbig et al., 2021 (${t('darkCore.reply')})`, '10.1016/j.jrp.2021.104074'],
            ].map(([label, doi], i, arr) => (
              <Fragment key={doi}>
                <ChakraLink href={`https://doi.org/${doi}`} target="_blank" rel="noopener noreferrer" color="fg.muted">
                  {label}
                </ChakraLink>
                {i < arr.length - 1 ? '; ' : '.'}
              </Fragment>
            ))}
          </Text>
          <Text>
            {t('domains.intro')}
          </Text>
          <Text>
            {t('domains.mappingIntro')}
          </Text>
          <VStack align="start" gap={1} pl={2}>
            {(t.raw('domains.items') as string[]).map((item) => (
              <Text key={item} fontSize="sm">
                • {item}
              </Text>
            ))}
          </VStack>
        </Section>

        {/* Порционное прохождение и стратификация */}
        <Section title={t('portions.title')}>
          <Text>
            {t('portions.p1', { coreScales: CORE_SCALE_COUNT })}
          </Text>
          <Text>
            {t('portions.p2')}
          </Text>
          <Text>
            {t('portions.p3')}
          </Text>
        </Section>

        {/* Шкалы */}
        <Section title={t('scales.title')}>
          <Text fontWeight="bold">{t('scales.coreHeading')}</Text>
          <Text>
            {t('scales.clusterA')}
          </Text>
          <Text>
            {t('scales.clusterB')}
          </Text>
          <Text>
            {t('scales.clusterC')}
          </Text>
          <Text fontWeight="bold" mt={4}>
            {t('scales.supplHeading')}
          </Text>
          <Text>
            {t('scales.bar')}
          </Text>
          <Text>
            {t('scales.pag')}
          </Text>
          <Text>
            {t('scales.dpr')}
          </Text>
          <Text mt={4} color="fg.muted">
            {t('scales.rest')}
          </Text>
        </Section>

        {/* На этапе первичной консультации */}
        <Section title={t('consultation.title')}>
          <Text>
            {t('consultation.p1')}
          </Text>
        </Section>

        {/* Дифференциальная диагностика */}
        <Section title={t('differential.title')}>
          <Text>
            {t('differential.p1')}
          </Text>
          <Text>
            {t('differential.p2')}
          </Text>
        </Section>

        {/* Совместимость */}
        <Section title={t('compat.title')}>
          <Text>
            {t('compat.mcmi')}
          </Text>
          <Text>
            {t('compat.bdi')}
          </Text>
          <Text>
            {t('compat.mdq')}
          </Text>
          <Text>
            {t('compat.scl')}
          </Text>
          <Text>
            {t('compat.ysq')}
          </Text>
        </Section>

        {/* Этика */}
        <Section title={t('ethics.title')}>
          <Text>
            {t('ethics.p1')}
          </Text>
          <Text>
            {t('ethics.p2')}
          </Text>
        </Section>

        {/* Кабинет психолога */}
        <Section title={t('cabinet.title')}>
          <Text>
            {t.rich('cabinet.intro', {
              link: (chunks) => (
                <ChakraLink asChild color="brand.fg">
                  <Link href="/cabinet">{chunks}</Link>
                </ChakraLink>
              ),
            })}
          </Text>
          <Text>
            {t('cabinet.linking')}
          </Text>
          <VStack align="start" gap={1} pl={2}>
            {(t.raw('cabinet.features') as string[]).map((item) => <Text key={item}>• {item}</Text>)}
          </VStack>
          <Text>
            {t('cabinet.revoke')}
          </Text>
        </Section>

        {/* Таблица соответствия шкал */}
        <Section title={t('table.title')}>
          {/* Скролл внутри таблицы: на телефоне она шире экрана и раздвигала всю страницу */}
          <Table.ScrollArea w="100%" borderWidth="1px" borderColor="border" borderRadius="md">
            <Table.Root size="sm" w="100%">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>{t('table.code')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('table.name')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('table.archetype')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('table.clinical')}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t('table.cluster')}</Table.ColumnHeader>
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
                        : t('table.suppl')}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Section>

        {/* Заявка на связь (этап 5.7) */}
        <Section title={t('lead.title')}>
          <Text>
            {t('lead.text')}
          </Text>
          <Box id="lead" w="100%">
            <Suspense fallback={null}>
              <ProfessionalLeadForm isRu={isRu} />
            </Suspense>
          </Box>
        </Section>

        {/* Ссылка на главную */}
        <Box w="100%" textAlign="center" pt={4}>
          <TouchLink
            href={`/${locale}`}
            color="brand.fg"
            fontWeight="bold"
            display="inline-flex"
            justifyContent="center"
          >
            ← {tQuiz('title')}
          </TouchLink>
        </Box>
      </VStack>
    </Container>
  )
}

/** Секция с заголовком. `id` даёт якорь для ссылок из презентации и раздатки */
function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <Box w="100%" id={id} scrollMarginTop="80px">
      <Heading size="lg" mb={3}>
        {title}
      </Heading>
      <VStack align="start" gap={2}>
        {children}
      </VStack>
    </Box>
  )
}
