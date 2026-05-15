import { Heading, HStack, VStack } from '@chakra-ui/react'
import { TECH_STACK } from '../_constants'
import { TechBadge } from './tech-badge'

interface TechStackSectionProps {
  t: (key: string) => string
}

/**
 * Секция технологического стека в CV
 */
export function TechStackSection({ t }: TechStackSectionProps) {
  return (
    <VStack
      gap={4}
      p={{ base: 6, md: 8 }}
      borderRadius="xl"
      bg={{ base: 'gray.50', _dark: 'gray.900' }}
      border="1px solid"
      borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
      align="stretch"
    >
      <Heading as="h2" fontSize="xl" borderBottom="1px solid" borderColor="gray.300" pb={2}>
        {t('stack.title')}
      </Heading>

      <HStack gap={3} flexWrap="wrap">
        {TECH_STACK.map((tech) => (
          <TechBadge key={tech}>{tech}</TechBadge>
        ))}
      </HStack>
    </VStack>
  )
}
