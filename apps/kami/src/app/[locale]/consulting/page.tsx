'use client'

import { Box, Container, Heading, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { Clock, Code, FileSearch, Lightbulb, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { FeatureCard } from '../../_components/about/feature-card'
import { PageHero } from '../../_components/page-hero'
import { CasesSection } from './_components/cases-section'
import { ConsultingForm } from './_components/consulting-form'
import { FaqSection } from './_components/faq-section'
import { TestimonialsSection } from './_components/testimonials-section'

/**
 * Страница консалтинговых услуг
 * Включает: услуги, тарифы, FAQ и CTA
 */
export default function ConsultingPage() {
  const t = useTranslations('consulting')

  const services = [
    { key: 'architecture', icon: <Lightbulb size={24} /> },
    { key: 'codeReview', icon: <Code size={24} /> },
    { key: 'audit', icon: <FileSearch size={24} /> },
    { key: 'mentoring', icon: <Users size={24} /> },
  ] as const

  const pricing = ['hourly', 'project', 'retainer'] as const

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="6xl">
        <VStack gap={{ base: 12, md: 16 }} align="stretch">
          {/* Hero секция */}
          <PageHero title={t('title')} subtitle={t('subtitle')} description={t('intro')} />

          {/* Услуги */}
          <VStack gap={8} align="stretch">
            <Heading as="h2" fontSize={{ base: '2xl', md: '3xl' }} textAlign="center">
              {t('services.title')}
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
              {services.map((service, index) => (
                <FeatureCard
                  key={service.key}
                  icon={service.icon}
                  title={t(`services.${service.key}.title`)}
                  description={t(`services.${service.key}.description`)}
                  index={index}
                />
              ))}
            </SimpleGrid>
          </VStack>

          {/* Тарифы */}
          <VStack gap={8} align="stretch">
            <Heading as="h2" fontSize={{ base: '2xl', md: '3xl' }} textAlign="center">
              {t('pricing.title')}
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
              {pricing.map((plan) => (
                <VStack
                  key={plan}
                  p={6}
                  borderRadius="xl"
                  bg={{ base: 'white', _dark: 'gray.900' }}
                  border="1px solid"
                  borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
                  gap={4}
                  align="stretch"
                  _hover={{
                    borderColor: 'fg.500',
                    transform: 'translateY(-4px)',
                    boxShadow: 'xl',
                  }}
                  transitionProperty="border-color, transform, box-shadow"
                  transitionDuration="0.3s"
                >
                  <HStack justify="space-between" align="start">
                    <VStack align="start" gap={1}>
                      <Heading as="h3" fontSize="xl">
                        {t(`pricing.${plan}.title`)}
                      </Heading>
                      <Text color="fg.500" fontWeight="bold" fontFamily="mono">
                        {t(`pricing.${plan}.price`)}
                      </Text>
                    </VStack>
                    <Icon asChild boxSize={6} color="fg.500">
                      <Clock />
                    </Icon>
                  </HStack>
                  <Text color="fg.muted" fontSize="sm">
                    {t(`pricing.${plan}.description`)}
                  </Text>
                </VStack>
              ))}
            </SimpleGrid>
          </VStack>

          {/* Кейсы — скроется если нет данных */}
          <CasesSection cases={[]} />

          {/* Отзывы — скроется если нет данных */}
          <TestimonialsSection testimonials={[]} />

          {/* FAQ с анимациями */}
          <FaqSection />

          {/* Форма заявки */}
          <ConsultingForm />
        </VStack>
      </Container>
    </Box>
  )
}
