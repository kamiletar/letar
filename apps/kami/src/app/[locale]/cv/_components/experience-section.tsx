import { Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { Briefcase } from 'lucide-react'
import { ExperienceCard } from './experience-card'

interface ExperienceSectionProps {
  t: (key: string) => string
}

/**
 * Секция опыта работы в CV
 */
export function ExperienceSection({ t }: ExperienceSectionProps) {
  return (
    <VStack gap={6} align="stretch">
      <Heading as="h2" fontSize="2xl" textAlign="center">
        <HStack justify="center" gap={2}>
          <Briefcase size={24} />
          <Text as="span">{t('experience.title')}</Text>
        </HStack>
      </Heading>

      <VStack gap={6} align="stretch">
        <ExperienceCard
          period="2018 — now"
          company={t('experience.sportvokrug.company')}
          position={t('experience.sportvokrug.position')}
          description={t('experience.sportvokrug.description')}
          achievements={[
            t('experience.sportvokrug.achievements.0'),
            t('experience.sportvokrug.achievements.1'),
            t('experience.sportvokrug.achievements.2'),
            t('experience.sportvokrug.achievements.3'),
          ]}
        />

        <ExperienceCard
          period="2018"
          company={t('experience.aic.company')}
          position={t('experience.aic.position')}
          description={t('experience.aic.description')}
          achievements={[
            t('experience.aic.achievements.0'),
            t('experience.aic.achievements.1'),
            t('experience.aic.achievements.2'),
          ]}
        />

        <ExperienceCard
          period="2018"
          company={t('experience.smp.company')}
          position={t('experience.smp.position')}
          description={t('experience.smp.description')}
          achievements={[
            t('experience.smp.achievements.0'),
            t('experience.smp.achievements.1'),
            t('experience.smp.achievements.2'),
          ]}
        />

        <ExperienceCard
          period="2017"
          company={t('experience.ratingruneta.company')}
          position={t('experience.ratingruneta.position')}
          description={t('experience.ratingruneta.description')}
          achievements={[
            t('experience.ratingruneta.achievements.0'),
            t('experience.ratingruneta.achievements.1'),
            t('experience.ratingruneta.achievements.2'),
          ]}
        />

        <ExperienceCard
          period="2001 — 2016"
          company={t('experience.early.company')}
          position={t('experience.early.position')}
          description={t('experience.early.description')}
          achievements={[
            t('experience.early.achievements.0'),
            t('experience.early.achievements.1'),
            t('experience.early.achievements.2'),
            t('experience.early.achievements.3'),
          ]}
        />
      </VStack>
    </VStack>
  )
}
