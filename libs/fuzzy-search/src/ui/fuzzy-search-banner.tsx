import { Button, HStack, Text } from '@chakra-ui/react'

export interface FuzzySearchBannerLabels {
  /** Текст вида "Показаны результаты по: {query}". */
  shownFor: (query: string) => string
  /** Текст ссылки-кнопки возврата к буквальному запросу, например "Искать: {query}". */
  searchInstead: (query: string) => string
}

const DEFAULT_LABELS: FuzzySearchBannerLabels = {
  shownFor: (query) => `Показаны результаты по: ${query}`,
  searchInstead: (query) => `Искать вместо этого: ${query}`,
}

export interface FuzzySearchBannerProps {
  /** Что человек буквально набрал. */
  literalQuery: string
  /** Запрос, по которому реально показаны результаты (после коррекции раскладки). */
  correctedQuery: string
  /** Вызывается по клику "искать вместо этого" — обычно повторный поиск с literalQuery как forceLiteral. */
  onUseLiteral: () => void
  /**
   * Заповедь №11: текст обязан быть на языке пользователя — компонент не хардкодит русский,
   * дефолт — только запасной вариант для приложений без i18n-обёртки над этим блоком.
   */
  labels?: Partial<FuzzySearchBannerLabels>
}

/**
 * Баннер прозрачной подмены поискового запроса (заповедь №17 студии) — никогда не молчим о
 * замене буквального запроса на исправленный по раскладке.
 */
export function FuzzySearchBanner(props: FuzzySearchBannerProps) {
  const { literalQuery, correctedQuery, onUseLiteral, labels } = props
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels }

  return (
    <HStack gap="2" color="fg.muted" fontSize="sm" wrap="wrap">
      <Text>{resolvedLabels.shownFor(correctedQuery)}</Text>
      <Button variant="plain" size="sm" onClick={onUseLiteral}>
        {resolvedLabels.searchInstead(literalQuery)}
      </Button>
    </HStack>
  )
}
