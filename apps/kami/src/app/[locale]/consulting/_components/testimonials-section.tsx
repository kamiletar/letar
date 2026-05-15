'use client'

import { SectionHeader } from '@/app/_components/section-header'
import { SimpleGrid, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { TestimonialCard } from './testimonial-card'

interface Testimonial {
  id: string
  authorName: string
  authorRole?: string | null
  authorCompany?: string | null
  authorAvatar?: string | null
  content: string
  contentEn?: string | null
  rating: number
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[]
}

/**
 * Секция отзывов клиентов
 */
export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const t = useTranslations('consulting')
  const locale = useLocale()

  if (testimonials.length === 0) {
    return null
  }

  return (
    <VStack gap={8} align="stretch">
      <SectionHeader title={t('testimonials.title')} subtitle={t('testimonials.subtitle')} />

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        {testimonials.map((testimonial) => (
          <TestimonialCard
            key={testimonial.id}
            authorName={testimonial.authorName}
            authorRole={testimonial.authorRole}
            authorCompany={testimonial.authorCompany}
            authorAvatar={testimonial.authorAvatar}
            content={locale === 'en' && testimonial.contentEn ? testimonial.contentEn : testimonial.content}
            rating={testimonial.rating}
          />
        ))}
      </SimpleGrid>
    </VStack>
  )
}
