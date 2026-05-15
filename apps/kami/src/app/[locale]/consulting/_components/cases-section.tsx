'use client'

import { SectionHeader } from '@/app/_components/section-header'
import { SimpleGrid, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { CaseCard } from './case-card'

interface ConsultingCase {
  id: string
  title: string
  titleEn?: string | null
  slug: string
  excerpt: string
  excerptEn?: string | null
  coverImage?: string | null
  industry?: string | null
  techStack: string[]
  year?: number | null
}

interface CasesSectionProps {
  cases: ConsultingCase[]
}

/**
 * Секция кейсов консалтинга
 */
export function CasesSection({ cases }: CasesSectionProps) {
  const t = useTranslations('consulting')
  const locale = useLocale()

  if (cases.length === 0) {
    return null
  }

  return (
    <VStack gap={8} align="stretch">
      <SectionHeader title={t('cases.title')} subtitle={t('cases.subtitle')} />

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        {cases.map((caseItem) => (
          <CaseCard
            key={caseItem.id}
            title={locale === 'en' && caseItem.titleEn ? caseItem.titleEn : caseItem.title}
            excerpt={locale === 'en' && caseItem.excerptEn ? caseItem.excerptEn : caseItem.excerpt}
            coverImage={caseItem.coverImage}
            industry={caseItem.industry}
            techStack={caseItem.techStack}
            year={caseItem.year}
          />
        ))}
      </SimpleGrid>
    </VStack>
  )
}
