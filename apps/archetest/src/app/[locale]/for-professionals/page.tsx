import { Link } from '@/i18n/navigation'
import { Box, Container, Heading, Link as ChakraLink, Table, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { Fragment, Suspense } from 'react'
import { ProfessionalLeadForm } from '../_components/professional-lead-form'
import { CORE_SCALE_COUNT, TOTAL_QUESTIONS } from '../_data/bank-stats'
import { PERSONALITY_TYPES } from '../_data/personality-types'
import { SCALE_PROTOTYPES } from '../_data/scale-prototypes'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isRu = locale === 'ru'
  const title = isRu ? 'Психологам: методология теста' : 'For Clinicians: Test Methodology'
  const description = isRu
    ? `На чём основан Archetest: маппинг ${CORE_SCALE_COUNT} шкал на валидированные инструменты (PID-5, Light Triad Scale, SD3, AQ, TAS-20), дименсиональные модели AMPD и МКБ-11, D-фактор и тёмное ядро, кабинет психолога с динамикой клиентов.`
    : `What Archetest is grounded in: ${CORE_SCALE_COUNT} scales mapped onto validated instruments (PID-5, Light Triad Scale, SD3, AQ, TAS-20), the AMPD and ICD-11 dimensional models, the Dark Factor of Personality, and a clinician dashboard with client dynamics.`

  return {
    title,
    description,
    alternates: {
      canonical: isRu ? '/for-professionals' : '/en/for-professionals',
      languages: { ru: '/for-professionals', en: '/en/for-professionals' },
    },
    openGraph: { title, description, type: 'article', locale: isRu ? 'ru_RU' : 'en_US' },
  }
}

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
              ? `Многошкальный скрининговый опросник личностных черт и аффективных паттернов. ${TOTAL_QUESTIONS} вопросов, ${CORE_SCALE_COUNT} шкалы, ситуативный формат (каждый вопрос — жизненная ситуация с четырьмя вариантами реагирования). Результат — нормализованный профиль выраженности черт от 0 до 100% по каждой шкале.`
              : `A multi-scale screening questionnaire for personality traits and affective patterns. ${TOTAL_QUESTIONS} items, ${CORE_SCALE_COUNT} scales, situational format (each item presents a life situation with four response options). The result is a normalized trait prominence profile from 0 to 100% on each scale.`}
          </Text>
          <Text>
            {isRu
              ? 'Тест не является диагностическим инструментом и не заменяет клиническое интервью. Его задача — дать вам и вашему клиенту структурированную отправную точку для обсуждения.'
              : 'The test is not a diagnostic instrument and does not replace a clinical interview. Its purpose is to provide you and your client with a structured starting point for discussion.'}
          </Text>
        </Section>

        {/* Методология */}
        <Section title={isRu ? 'Методология' : 'Methodology'} id="methodology">
          <Text>
            {isRu
              ? 'Тест не изобретает шкалы с нуля. Большинство шкал опираются на валидированные инструменты — но на уровне конструкта, а не заимствования пунктов: все формулировки вопросов archetest авторские и ситуационные. Это сохраняет лицензионную чистоту (часть прототипов, например TAS-20, коммерческие, часть — research-only) и одновременно даёт связь с накопленной научной базой и нормами.'
              : 'The test does not invent scales from scratch. Most scales are grounded in validated instruments — at the construct level, never by borrowing items: every archetest question is an original, situational formulation. This preserves licensing cleanliness (some prototypes, e.g. TAS-20, are commercial; others are research-only) while keeping the test connected to the accumulated evidence base and norms.'}
          </Text>
          <Table.Root size="sm" w="100%">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>{isRu ? 'Шкала archetest' : 'Archetest scale'}</Table.ColumnHeader>
                <Table.ColumnHeader>{isRu ? 'Валидированный прототип' : 'Validated prototype'}</Table.ColumnHeader>
                <Table.ColumnHeader>{isRu ? 'Источник' : 'Source'}</Table.ColumnHeader>
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
          <Text>
            {isRu
              ? `Валидированное ядро — ${
                CORE_SCALE_COUNT - 1
              } из ${CORE_SCALE_COUNT} текущих шкал (таблица выше). Отдельно от него — авторские/экспериментальные конструкты без прямого валидированного прототипа: в ядре это шкала MAS («Самоотверженный», авторский конструкт мазохистического паттерна). Такие шкалы в интерфейсе всегда помечены как «бета» и должны интерпретироваться с осторожностью, отдельно от ядра.`
              : `The validated core covers ${
                CORE_SCALE_COUNT - 1
              } of the ${CORE_SCALE_COUNT} current scales (table above). Separately, there are original/experimental constructs without a direct validated prototype: within the core this is the MAS scale ("Self-Sacrificing", an original masochistic-pattern construct). Such scales are always marked "beta" in the UI and should be interpreted with caution, apart from the core.`}
          </Text>
          <Text>
            {isRu
              ? `Вне ядра из ${CORE_SCALE_COUNT} шкал существуют ещё три экспериментальные шкалы, доступные только в кабинете психолога и никогда не показываемые клиенту: «Физическая броня» (RES_PHYS, авторский конструкт без валидированного прототипа), «Аффективный резонанс» (RES_AFF, прототипы — IRI Personal Distress и шкала высокой чувствительности HSP/SPS) и «Специальные интересы» (SPEC_INT). Из них строится кросс-индекс «Броня и Радар». Все три помечены «бета», в экспресс-тест и «ведущие черты» не входят и на скоринг ядра не влияют: их вопросы начисляют баллы исключительно экспериментальным шкалам.`
              : `Beyond the ${CORE_SCALE_COUNT}-scale core there are three further experimental scales, available only in the clinician’s dashboard and never shown to the client: “Physical Armor” (RES_PHYS, an original construct with no validated prototype), “Affective Resonance” (RES_AFF, prototypes — IRI Personal Distress and the Highly Sensitive Person scale, HSP/SPS) and “Special Interests” (SPEC_INT). The “Armor & Radar” cross-index is built from them. All three are marked “beta”, are excluded from the express test and from “leading traits”, and do not affect core scoring: their items award points to experimental scales only.`}
          </Text>
          <Text>
            {isRu
              ? 'Светлая и тёмная триады — не противоположные концы одной оси: по данным Kaufman et al. (2019) корреляция между ними умеренная (r ≈ −.48), а не абсолютная. Высокие баллы одновременно по обеим триадам — норма данных, а не парадокс или ошибка заполнения.'
              : 'The Light and Dark triads are not opposite ends of a single axis: per Kaufman et al. (2019), the correlation between them is moderate (r ≈ −.48), not absolute. Elevated scores on both triads simultaneously are a normal data pattern, not a paradox or a filling error.'}
          </Text>

          <Heading size="md" pt={2}>
            {isRu ? 'Тёмное ядро: общий фактор и «вкусы»' : 'The dark core: a general factor and its “flavors”'}
          </Heading>
          <Text>
            {isRu
              ? 'Современная работа с тёмными чертами сместилась от перечисления триад к общему фактору. D-фактор (Dark Factor of Personality) определяется как общая тенденция максимизировать собственную выгоду, пренебрегая, принимая или злонамеренно провоцируя ущерб для других, вместе с убеждениями, которые это оправдывают. Отдельные тёмные черты в этой рамке — не самостоятельные сущности, а «проявления со вкусом»: общее ядро плюс уникальный, по сути НЕ-аверсивный компонент. У нарциссизма это стремление к восхищению, у психопатии — расторможенность, у макиавеллизма — расчётливость. В работе 2023 года триада как набор трёх различимых черт эмпирической проверки не прошла.'
              : 'Contemporary work on dark traits has shifted from enumerating triads toward a general factor. The Dark Factor of Personality (D) is defined as the general tendency to maximize one’s individual utility — disregarding, accepting, or malevolently provoking disutility for others — accompanied by beliefs that serve as justifications. Within this frame, individual dark traits are not standalone entities but “flavored manifestations”: the common core plus a unique, essentially non-aversive component. For narcissism that is admiration seeking, for psychopathy disinhibition, for Machiavellianism planfulness. In a 2023 study, the triad as a set of three distinguishable traits failed empirical scrutiny.'}
          </Text>
          <Text>
            {isRu
              ? 'В кабинете психолога есть индекс «Тёмное ядро», собранный из четырёх шкал теста (MAC/NAR/ANT/SAD) — с явными ограничениями, которые мы предпочитаем назвать сами. Во-первых, это приближение, а не измерение D: сам D измеряется инструментами D70/D35/D16. Во-вторых, композит тетрады коррелирует с полным D на r ≈ .85 — это ниже медианы случайных комбинаций из четырёх аверсивных черт (r ≈ .90), и авторы прямо предостерегают считать тетраду главным представлением ядра; просадку даёт нарциссическое «восхищение», поэтому индекс показывает и оценку без нарциссизма. В-третьих, существует содержательная критика самого конструкта: латентные D и антагонизм (полюс Доброжелательности) коррелируют около −.90, а инкрементальной валидности D над антагонизмом показано не было — то есть возможно, что это два имени для одного и того же. Шкалы Доброжелательности в тесте нет, поэтому проверить это на наших данных невозможно в принципе. Индекс стоит читать как структурную подсказку — ровное ядро или ядро с выраженным «вкусом», — а не как балл, сопоставимый с популяцией: нормативных перцентилей у теста пока нет.'
              : 'The clinician’s dashboard includes a “Dark core” index built from four scales of the test (MAC/NAR/ANT/SAD) — with explicit limitations we prefer to state ourselves. First, it is an approximation, not a measurement of D: D itself is measured with the D70/D35/D16 inventories. Second, the tetrad composite correlates with full D at r ≈ .85 — below the median of random four-trait combinations (r ≈ .90), and the authors explicitly warn against treating the tetrad as the prime representation of the core; the shortfall comes from narcissistic admiration, which is why the index also reports an estimate without narcissism. Third, there is substantive criticism of the construct itself: latent D and antagonism (the low pole of Agreeableness) correlate at about −.90, and no incremental validity of D over antagonism has been demonstrated — so these may be two names for one thing. The test has no Agreeableness scale, so this cannot be checked on our data even in principle. The index should be read as a structural hint — an even core versus a core with a pronounced “flavor” — not as a score comparable to a population: the test has no normative percentiles yet.'}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {isRu ? 'Источники: ' : 'Sources: '}
            {[
              ['Moshagen, Hilbig & Zettler, 2018', '10.1037/rev0000111'],
              ['Moshagen, Zettler & Hilbig, 2020', '10.1037/pas0000778'],
              ['Bader et al., 2023', '10.1111/jopy.12785'],
              ['Hilbig et al., 2023', '10.1038/s41598-023-42115-z'],
              ['Vize, Miller & Lynam, 2021', '10.1111/jopy.12601'],
              [`Hilbig et al., 2021 (${isRu ? 'ответ на критику' : 'reply'})`, '10.1016/j.jrp.2021.104074'],
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
            {isRu
              ? '13 базовых и дополнительных шкал расстройств личности сопоставимы с дименсиональными моделями современной психиатрии — Alternative Model for Personality Disorders (AMPD/PID-5) и HiTOP, а также с пятью доменами расстройств личности МКБ-11 (действие приостановлено в РФ с 02.2024, но модель остаётся ориентиром для клиницистов). Профиль archetest можно читать и категориально (по кластерам A/B/C), и дименсионально — как позицию на непрерывных осях выраженности черт.'
              : 'The 13 core and supplementary personality-disorder scales map onto contemporary dimensional models in psychiatry — the Alternative Model for Personality Disorders (AMPD/PID-5) and HiTOP, as well as the five personality-disorder domains of ICD-11 (suspended in Russia since 02.2024, but still a reference model for clinicians). The archetest profile can be read both categorically (by A/B/C clusters) and dimensionally — as a position on continuous trait axes.'}
          </Text>
          <Text>
            {isRu
              ? 'Ориентировочный маппинг шкал на домены (на уровне конструктов; эмпирическая факторная проверка — после накопления выборки):'
              : 'Approximate scale-to-domain mapping (construct level; empirical factor validation pending sample accumulation):'}
          </Text>
          <VStack align="start" gap={1} pl={2}>
            {(isRu
              ? [
                'Негативная аффективность — BOR, DPR, AVD, DEP',
                'Отстранённость — SZD, AVD, PAR',
                'Антагонизм (AMPD) / Диссоциальность (МКБ-11) — NAR, ANT, PAG; из расширенного набора — MAC, SAD',
                'Расторможенность — ANT, BOR, HIS',
                'Ананкастия (МКБ-11) — OBC; Психотизм (AMPD) — SZT',
                '«Пограничный паттерн» (спецификатор МКБ-11) — BOR',
              ]
              : [
                'Negative Affectivity — BOR, DPR, AVD, DEP',
                'Detachment — SZD, AVD, PAR',
                'Antagonism (AMPD) / Dissociality (ICD-11) — NAR, ANT, PAG; from the extended set — MAC, SAD',
                'Disinhibition — ANT, BOR, HIS',
                'Anankastia (ICD-11) — OBC; Psychoticism (AMPD) — SZT',
                '"Borderline pattern" (ICD-11 specifier) — BOR',
              ]).map((item) => (
                <Text key={item} fontSize="sm">
                  • {item}
                </Text>
              ))}
          </VStack>
        </Section>

        {/* Порционное прохождение и стратификация */}
        <Section title={isRu ? 'Порционное прохождение и стратификация' : 'Portioned Completion and Stratification'}>
          <Text>
            {isRu
              ? `Тест проходится порциями по 50 вопросов. Каждая порция формируется методом стратифицированной выборки: вопросы распределяются пропорционально по всем ${CORE_SCALE_COUNT} шкалам с гарантией минимум одного вопроса на каждую шкалу. Это обеспечивает равномерный рост достоверности профиля по всем осям после каждой порции.`
              : `The test is completed in batches of 50 questions. Each batch is formed using stratified sampling: questions are distributed proportionally across all ${CORE_SCALE_COUNT} scales with a guarantee of at least one question per scale. This ensures uniform growth in profile reliability across all axes after each batch.`}
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
          <Text mt={4} color="fg.muted">
            {isRu
              ? 'Остальные 9 шкал ядра — Светлая и Тёмная триады, деструктивные паттерны (садизм, мазохизм-бета) и спектр развития (систематизация, прямота, алекситимия) — описаны с прототипами в разделе «Методология» выше.'
              : 'The remaining 9 core scales — the Light and Dark triads, destructive patterns (sadism, masochism-beta), and the developmental spectrum (systemizing, directness, alexithymia) — are described with their prototypes in the "Methodology" section above.'}
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
            {isRu
              ? (
                <>
                  На платформе доступен кабинет психолога — инструмент для отслеживания результатов ваших клиентов. Для
                  активации кабинета нажмите «Я специалист» на{' '}
                  <ChakraLink asChild color="blue.500">
                    <Link href="/cabinet">странице кабинета</Link>
                  </ChakraLink>
                  .
                </>
              )
              : (
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
              ]).map((item) => <Text key={item}>• {item}</Text>)}
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

        {/* Заявка на связь (этап 5.7) */}
        <Section title={isRu ? 'Хотите кабинет для своих клиентов?' : 'Want a cabinet for your clients?'}>
          <Text>
            {isRu
              ? 'Оставьте контакт — мы свяжемся и поможем настроить кабинет психолога.'
              : 'Leave your contact and we will reach out to help set up your psychologist cabinet.'}
          </Text>
          <Box id="lead" w="100%">
            <Suspense fallback={null}>
              <ProfessionalLeadForm isRu={isRu} />
            </Suspense>
          </Box>
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
