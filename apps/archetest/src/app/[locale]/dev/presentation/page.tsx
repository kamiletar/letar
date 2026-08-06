'use client'

import { Badge, Box, Container, Heading, HStack, SimpleGrid, Table, Text, VStack } from '@chakra-ui/react'
import { HexagramChart } from '../../_components/hexagram-chart'
import { CORE_SCALE_COUNT, TOTAL_QUESTIONS } from '../../_data/bank-stats'
import type { PersonalityTypeCode } from '../../_data/personality-types'
import { SCALE_PROTOTYPES } from '../../_data/scale-prototypes'

/**
 * Презентация продукта для Инпсихофеста (этап 5.7) — RU-first, print-friendly.
 * Нарратив собран из материала PLAN/PLAN_COMPLETED: научный фундамент (5.6.2),
 * гексаграмма (5.2), developmental-фрейм (5.6.1), психометрическая честность
 * (5.1/5.9/5.6.5), этика и право (5.6.3/5.6.4), демо (5.3/5.7).
 *
 * Только для разработки (как /dev/qr): показывается с ноутбука/печатается
 * перед мероприятием, в production роут не открывается.
 */
export default function PresentationDevPage() {
  // Примерный профиль для живой гексаграммы: заметный свет + умеренная тень
  const sampleScores: Partial<Record<PersonalityTypeCode, number>> = {
    HUM: 78,
    KAN: 64,
    FAI: 58,
    NAR: 42,
    MAC: 55,
    ANT: 22,
    SAD: 18,
    MAS: 30,
  }

  return (
    <Container maxW="4xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* ── Слайд 1: Титул ─────────────────────────────────────────────── */}
        <Slide number="01 · Что это">
          <Heading size="3xl" lineHeight="shorter">
            Архетест — карта личности из {CORE_SCALE_COUNT} шкал
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            Инструмент самопознания и развития: структурированная отправная точка для работы психолога с клиентом. Не
            диагностика, не медицинское изделие — и мы говорим это прямо на каждом экране.
          </Text>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} w="100%" pt={2}>
            <Stat value={String(TOTAL_QUESTIONS)} label="ситуационных вопросов — жизненные сцены, не само-ярлыки" />
            <Stat
              value={String(CORE_SCALE_COUNT)}
              label="шкалы: DSM-5 кластеры A/B/C, триады, деструктивные паттерны, спектр развития"
            />
            <Stat value="3–5 мин" label="экспресс-скан из 24 вопросов — работает офлайн прямо на стенде" />
          </SimpleGrid>
        </Slide>

        {/* ── Слайд 2: Научный фундамент ─────────────────────────────────── */}
        <Slide number="02 · Научный фундамент" title="Шкалы не изобретены с нуля">
          <Text>
            {CORE_SCALE_COUNT - 1} из {CORE_SCALE_COUNT} шкал опираются на валидированные инструменты —{' '}
            <b>на уровне конструктов, не пунктов</b>: каждая формулировка archetest авторская и ситуационная. Это
            лицензионная чистота плюс связь с накопленной научной базой.
          </Text>
          <Table.Root size="sm" w="100%">
            <Table.Body>
              {SCALE_PROTOTYPES.map(({ group, shortLabel }) => (
                <Table.Row key={group}>
                  <Table.Cell fontWeight="bold">{group}</Table.Cell>
                  <Table.Cell color="fg.muted">{shortLabel}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          <Text fontSize="sm" color="fg.muted">
            Честное разделение: единственный авторский конструкт без прототипа — MAS («Мазохизм»), он везде помечен
            «бета». Профиль читается и категориально (кластеры A/B/C), и дименсионально (AMPD/PID-5, HiTOP, пять доменов
            МКБ-11).
          </Text>
        </Slide>

        {/* ── Слайд 3: Гексаграмма ───────────────────────────────────────── */}
        <Slide number="03 · Визуализация" title="Гексаграмма: Свет и Тень — не противоположности">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} w="100%" alignItems="center">
            <Box>
              <HexagramChart scores={sampleScores} showNarrative={false} />
            </Box>
            <VStack align="start" gap={3}>
              <Bullet>
                Два треугольника Шатконы: <b>Светлая триада</b> (Гуманизм, Кантианство, Вера в человечество) и{' '}
                <b>Тёмная</b> (Нарциссизм, Макиавеллизм, Психопатия).
              </Bullet>
              <Bullet>
                Триады — <b>независимые измерения</b>{' '}
                (Kaufman et al., 2019: r ≈ −.48). Высокие баллы по обеим — норма данных, не парадокс.
              </Bullet>
              <Bullet>
                S-вектор (центр тяжести профиля): сочетание расчёта и морали даёт метку «Конструктивный Архитектор».
              </Bullet>
              <Bullet>
                Зона пересечения — визуальная метафора интеграции, <b>не психометрическая метрика</b>{' '}
                — оговорка прямо в интерфейсе.
              </Bullet>
              <Bullet>Садизм и Мазохизм — внешняя «аура»; MAS с бета-меткой.</Bullet>
            </VStack>
          </SimpleGrid>
        </Slide>

        {/* ── Слайд 4: Developmental-фрейм ───────────────────────────────── */}
        <Slide number="04 · Философия результатов" title="От диагностики — к карте ресурсов">
          <Bullet>
            Каждая ведущая черта раскрывается тремя блоками: <b>Суперсила</b> (как черта работает в плюс) →{' '}
            <b>Ловушка</b> (когда вредит, без стигмы) → <b>Практики</b>{' '}
            (конкретные действия с тегом модальности: КПТ, DBT, схема-терапия).
          </Bullet>
          <Bullet>
            Клинические названия пользователь <b>не видит вообще</b>{' '}
            — только архетипы («Гроссмейстер», «Маяк», «Целитель»). Клиника — в кабинете психолога.
          </Bullet>
          <Bullet>
            <b>«Состояния» отделены от «Черт»</b>: BAR и DPR — эпизодические состояния, не черты личности; свой блок и
            дестигматизирующий нарратив «черты стабильны, состояния приходят и уходят».
          </Bullet>
          <Bullet>
            Ведущие черты —{' '}
            <b>ипсативные ранги с 95%-интервалами точности</b>: шкалы сравниваются внутри профиля; статистически
            неразличимые соседи так и подписываются — никакой ложной точности «61,2% &gt; 60,8%».
          </Bullet>
        </Slide>

        {/* ── Слайд 5: Психометрическая честность ────────────────────────── */}
        <Slide number="05 · Честность данных" title="Психометрика без маркетинговых обещаний">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5} w="100%">
            <MiniCard title="Валидность протокола">
              Attention-check вопросы в каждой сессии + детектор монотонных паттернов. Невалидные протоколы исключаются
              из усреднения, наград и будущих норм.
            </MiniCard>
            <MiniCard title="Анти-спам геймификация">
              XP за дни активности, не за объём кликов; ачивки за ритм и возвращение, не за скорость. Лидерборда нет —
              соревновательность загрязняла бы нормы.
            </MiniCard>
            <MiniCard title="State отдельно от trait">
              Mood check-in перед сессией (циркумплекс Рассела): усреднение прохождений в разных состояниях выделяет
              устойчивое trait-ядро из state-шума.
            </MiniCard>
            <MiniCard title="Дорожная карта норм">
              Сейчас — ипсативные ранги с интервалами (сравнение внутри профиля). При N ≈ 200–300 валидных протоколов —
              нормативные перцентили; выборки ru/en раздельно, RU — первой; один человек = одна запись.
            </MiniCard>
          </SimpleGrid>
        </Slide>

        {/* ── Слайд 6: Этика и право ─────────────────────────────────────── */}
        <Slide number="06 · Этика и право" title="152-ФЗ, согласие и безопасность — по-настоящему">
          <Bullet>
            Оператор персональных данных в реестре РКН (запись 77-26-555440, отдельная цель «сервис психологического
            самотестирования»).
          </Bullet>
          <Bullet>
            Информированное согласие <b>до</b>{' '}
            первого вопроса, чекбокс не предотмечен; полная политика конфиденциальности на /privacy.
          </Bullet>
          <Bullet>
            Гостевой режим: результаты экспресса живут в браузере посетителя — на сервер не уходит ничего до явной
            привязки к аккаунту (и тогда сервер пересчитывает сам, из ответов).
          </Bullet>
          <Bullet>Самостоятельное удаление всех своих данных — кнопка в настройках, каскадно.</Bullet>
          <Bullet>
            Safety-net: при выраженных DPR/BAR/BOR — блок с телефонами доверия; мягкие формулировки «тёмных» шкал; тест
            не выдаёт диагнозов — только вероятностные, развивающие формулировки.
          </Bullet>
        </Slide>

        {/* ── Слайд 7: Демо ──────────────────────────────────────────────── */}
        <Slide number="07 · Демо на стенде" title="Попробуйте прямо сейчас">
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} w="100%">
            <Stat
              value="24 вопроса"
              label={`экспресс покрывает 8 шкал гексаграммы честно: по 3 вопроса на шкалу, не «${CORE_SCALE_COUNT} шкалы за 2 минуты»`}
            />
            <Stat value="Офлайн" label="PWA: выставочный Wi-Fi не мешает — страница и подсчёт работают без сети" />
            <Stat
              value="QR"
              label={`с экрана результатов: полный тест (${CORE_SCALE_COUNT} шкалы) и страница для психологов`}
            />
          </SimpleGrid>
          <Bullet>
            Kiosk-режим на планшете: кнопка «Новый посетитель» с двойным подтверждением — сброс результата и согласия
            (согласие персонально), свежая выборка вопросов.
          </Bullet>
          <Bullet>
            Кабинет психолога: клиент привязывает специалиста по email — кумулятивный профиль с клиническими названиями,
            динамика по сессиям, приватные заметки. Доступ отзывается клиентом в любой момент.
          </Bullet>
        </Slide>

        {/* ── Слайд 8: CTA ───────────────────────────────────────────────── */}
        <Slide number="08 · Приглашение" title="Ищем психологов-партнёров">
          <Bullet>Ревью формулировок вопросов клиническим взглядом — соавторство в психометрике инструмента.</Bullet>
          <Bullet>Кабинет для работы с клиентами — доступен уже сейчас.</Bullet>
          <Bullet>
            Ранний доступ к нормативной аналитике по мере роста выборки (ретест-надёжность, α-метрики, перцентили).
          </Bullet>
          <HStack gap={3} pt={2} flexWrap="wrap">
            <Badge size="lg" colorPalette="blue" variant="solid" px={4} py={2} borderRadius="md">
              /for-professionals — лид-форма
            </Badge>
            <Badge size="lg" colorPalette="gray" variant="outline" px={4} py={2} borderRadius="md">
              QR-раздатка — /dev/qr
            </Badge>
          </HStack>
        </Slide>
      </VStack>
    </Container>
  )
}

/** «Слайд» презентации: рамка на экране, разрыв страницы при печати */
function Slide({ number, title, children }: { number: string; title?: string; children: React.ReactNode }) {
  return (
    <Box
      w="100%"
      p={{ base: 6, md: 10 }}
      borderWidth="1px"
      borderColor="border"
      borderRadius="xl"
      css={{ '@media print': { breakInside: 'avoid', pageBreakAfter: 'always', border: 'none', padding: '1rem 0' } }}
    >
      <Text fontSize="sm" color="fg.subtle" textTransform="uppercase" letterSpacing="wider" mb={2}>
        {number}
      </Text>
      <VStack align="start" gap={4}>
        {title && <Heading size="xl">{title}</Heading>}
        {children}
      </VStack>
    </Box>
  )
}

/** Крупная цифра с подписью */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Box p={4} bg="bg.subtle" borderRadius="lg" h="100%">
      <Text fontSize="3xl" fontWeight="bold" lineHeight="1">
        {value}
      </Text>
      <Text fontSize="sm" color="fg.muted" mt={2}>
        {label}
      </Text>
    </Box>
  )
}

/** Пункт слайда с маркером */
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <HStack align="start" gap={3}>
      <Text color="blue.500" fontWeight="bold" lineHeight="tall">
        •
      </Text>
      <Text lineHeight="tall">{children}</Text>
    </HStack>
  )
}

/** Компактная карточка тезиса */
function MiniCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box p={4} borderWidth="1px" borderColor="border" borderRadius="lg">
      <Text fontWeight="bold" mb={1}>
        {title}
      </Text>
      <Text fontSize="sm" color="fg.muted" lineHeight="tall">
        {children}
      </Text>
    </Box>
  )
}
