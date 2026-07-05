'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Link, useRouter } from '@/i18n/navigation'
import { signInWithLetarAuth } from '@/lib/auth-client'
import { Badge, Box, Button, Card, Container, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { LuArrowRight, LuRotateCcw } from 'react-icons/lu'

import { submitQuizAction } from '../_actions/quiz.action'
import {
  DARK_TRIAD_CODES,
  DARK_TRIAD_DISPLAY,
  getPersonalityType,
  LIGHT_TRIAD_CODES,
  type PersonalityTypeCode,
} from '../_data/personality-types'
import { EXPRESS_RESULT_KEY, PENDING_QUIZ_KEY } from '../_lib/storage-keys'
import { HexagramChart } from './hexagram-chart'

/** Ответ для передачи на сервер (пересчёт баллов из ответов, не из клиентских баллов) */
export interface ExpressAnswer {
  questionId: string
  selectedOption: number
}

interface ExpressResultsProps {
  scores: Record<PersonalityTypeCode, number>
  seed: number
  answers: ExpressAnswer[]
  isAuthenticated: boolean
  onRetake: () => void
}

/** Внешнее кольцо гексаграммы: деструктивные паттерны */
const AURA_CODES: PersonalityTypeCode[] = ['SAD', 'MAS']

/** Подпись шкалы: тёмные — под display-ярлыком (Психопатия и др.) */
function scaleName(code: PersonalityTypeCode, isRu: boolean): string {
  const display = DARK_TRIAD_DISPLAY[code]
  if (display) {
    return isRu ? display.ru : display.en
  }
  const type = getPersonalityType(code)
  return isRu ? `${type.label} ${type.archetype}` : `${type.labelEn} ${type.archetypeEn}`
}

/** Строка одной шкалы: название, балл, короткое описание */
function ScaleRow({ code, score, isRu }: { code: PersonalityTypeCode; score: number; isRu: boolean }) {
  const type = getPersonalityType(code)
  return (
    <Box w="100%" borderBottomWidth="1px" borderColor="border" pb={2}>
      <HStack justify="space-between" mb={0.5}>
        <HStack gap={1.5}>
          <Box w={2.5} h={2.5} borderRadius="full" bg={type.color} />
          <Text fontWeight="semibold" fontSize="sm">
            {scaleName(code, isRu)}
          </Text>
          {type.beta && (
            <Badge size="xs" colorPalette="orange" variant="subtle">
              β
            </Badge>
          )}
        </HStack>
        <Text fontWeight="bold" fontSize="sm" color={type.color}>
          {Math.round(score)}%
        </Text>
      </HStack>
      <Text fontSize="xs" color="fg.muted" lineHeight="short">
        {isRu ? type.description : type.descriptionEn}
      </Text>
    </Box>
  )
}

/** Группа шкал с заголовком */
function ScaleGroup({
  title,
  codes,
  scores,
  isRu,
}: {
  title: string
  codes: PersonalityTypeCode[]
  scores: Record<PersonalityTypeCode, number>
  isRu: boolean
}) {
  return (
    <VStack gap={2} w="100%" align="stretch">
      <Text fontSize="xs" fontWeight="bold" color="fg.muted" textTransform="uppercase" letterSpacing="wide">
        {title}
      </Text>
      {codes.map((code) => (
        <ScaleRow key={code} code={code} score={scores[code] ?? 0} isRu={isRu} />
      ))}
    </VStack>
  )
}

/**
 * Экран результатов экспресс-теста (этап 5.3): гексаграмма 8 шкал + краткие
 * описания, QR-код на полный тест и кнопка привязки результата к аккаунту.
 * Гостевой результат уже сохранён в localStorage контейнером.
 */
export function ExpressResults({ scores, seed, answers, isAuthenticated, onRetake }: ExpressResultsProps) {
  const t = useTranslations('express')
  const locale = useLocale()
  const isRu = locale === 'ru'
  const router = useRouter()
  const [linking, setLinking] = useState(false)
  const [fullTestUrl, setFullTestUrl] = useState('')

  // URL полного теста для QR — только на клиенте (origin недоступен на сервере)
  useEffect(() => {
    setFullTestUrl(`${window.location.origin}/${locale}`)
  }, [locale])

  const handleLinkAccount = async () => {
    const pending = { seed, answers, skipped: [] as string[] }

    if (isAuthenticated) {
      // Уже вошёл: сервер пересчитывает баллы из ответов и создаёт полноценную сессию
      setLinking(true)
      try {
        const result = await submitQuizAction(pending)
        if (result.error) {
          toaster.error({ title: t('linkError') })
          setLinking(false)
          return
        }
        localStorage.removeItem(EXPRESS_RESULT_KEY)
        toaster.success({ title: t('linkSuccess') })
        router.push('/')
      } catch {
        toaster.error({ title: t('linkError') })
        setLinking(false)
      }
      return
    }

    // Гость: откладываем ответы для автосабмита после входа (тот же механизм, что у квиза)
    try {
      sessionStorage.setItem(PENDING_QUIZ_KEY, JSON.stringify(pending))
    } catch {
      /* sessionStorage недоступен — вход всё равно инициируем */
    }
    await signInWithLetarAuth()
  }

  return (
    <Container maxW="2xl" py={10}>
      <VStack gap={8}>
        <VStack gap={2} textAlign="center">
          <Heading size="xl">{t('resultsTitle')}</Heading>
          <Text color="fg.muted" fontSize="sm" maxW="md">
            {t('resultsSubtitle')}
          </Text>
        </VStack>

        <HexagramChart scores={scores} title={t('hexagramTitle')} showIntegrationIndex showNarrative />

        {/* Краткие описания шкал по группам */}
        <VStack gap={5} w="100%" align="stretch">
          <ScaleGroup title={t('groupLight')} codes={LIGHT_TRIAD_CODES} scores={scores} isRu={isRu} />
          <ScaleGroup title={t('groupDark')} codes={DARK_TRIAD_CODES} scores={scores} isRu={isRu} />
          <ScaleGroup title={t('groupAura')} codes={AURA_CODES} scores={scores} isRu={isRu} />
        </VStack>

        {/* CTA: полный тест + QR */}
        <Card.Root w="100%" variant="subtle">
          <Card.Body>
            <HStack gap={5} align="center" flexWrap="wrap" justify="center">
              {fullTestUrl && (
                <Box p={2.5} bg="white" borderRadius="md" flexShrink={0}>
                  <QRCodeSVG value={fullTestUrl} size={112} level="M" />
                </Box>
              )}
              <VStack gap={2} align={{ base: 'center', sm: 'start' }} flex={1} minW="200px">
                <Heading size="md">{t('fullTestTitle')}</Heading>
                <Text fontSize="sm" color="fg.muted">
                  {t('fullTestDescription')}
                </Text>
                <Button asChild colorPalette="blue" size="sm">
                  <Link href="/">
                    {t('fullTestCta')}
                    <Icon>
                      <LuArrowRight />
                    </Icon>
                  </Link>
                </Button>
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Привязка результата к аккаунту */}
        <VStack gap={3} w="100%">
          <Button colorPalette="green" size="lg" w="100%" onClick={handleLinkAccount} loading={linking}>
            {isAuthenticated ? t('linkAuthenticated') : t('linkGuest')}
          </Button>
          <Text fontSize="xs" color="fg.muted" textAlign="center" maxW="md">
            {t('linkHint')}
          </Text>
        </VStack>

        <Button variant="ghost" size="sm" onClick={onRetake}>
          <Icon>
            <LuRotateCcw />
          </Icon>
          {t('retake')}
        </Button>
      </VStack>
    </Container>
  )
}
