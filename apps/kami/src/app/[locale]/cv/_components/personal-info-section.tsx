import { Heading, SimpleGrid, VStack } from '@chakra-ui/react'
import { Calendar, Code2, Globe, MapPin, Monitor, User } from 'lucide-react'
import { InfoRow } from './info-row'

interface PersonalInfoSectionProps {
  t: (key: string) => string
  age: number
  reactYears: number
}

/**
 * Секция личной информации в CV
 */
export function PersonalInfoSection({ t, age, reactYears }: PersonalInfoSectionProps) {
  return (
    <VStack
      gap={6}
      p={{ base: 6, md: 8 }}
      borderRadius="xl"
      bg={{ base: 'gray.50', _dark: 'gray.900' }}
      border="1px solid"
      borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
      align="stretch"
    >
      <Heading as="h2" fontSize="xl" borderBottom="1px solid" borderColor="gray.300" pb={2}>
        {t('personal.title')}
      </Heading>

      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
        <InfoRow icon={<User size={18} />} label={t('personal.name')} value="Ками Летар" />
        <InfoRow
          icon={<Calendar size={18} />}
          label={t('personal.age')}
          value={`${age} ${t('personal.years')} (22.12.1987)`}
        />
        <InfoRow icon={<MapPin size={18} />} label={t('personal.location')} value={t('personal.city')} />
        <InfoRow icon={<Globe size={18} />} label={t('personal.citizenship')} value={t('personal.country')} />
        <InfoRow
          icon={<Code2 size={18} />}
          label={t('personal.reactExperience')}
          value={`${reactYears} ${t('personal.years')}`}
        />
        <InfoRow icon={<Monitor size={18} />} label={t('personal.workMode')} value={t('personal.remote')} />
      </SimpleGrid>
    </VStack>
  )
}
