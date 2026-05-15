import { Box, Container, HStack, Text } from '@chakra-ui/react'
import { Building2 } from 'lucide-react'

export interface TrustBarProps {
  schoolsCount: number
  schools?: Array<{
    id: string
    name: string
    logo?: string | null
  }>
}

export function TrustBar({ schoolsCount, schools }: TrustBarProps) {
  // Минимум 3 школы для отображения логотипов
  const showLogos = schools && schools.length >= 3

  return (
    <Box py={8} bg="bg.subtle" borderTopWidth={1} borderBottomWidth={1} borderColor="border.muted">
      <Container maxW="container.xl">
        <Text textAlign="center" fontSize="sm" color="fg.muted" mb={showLogos ? 4 : 0}>
          Нам доверяют{' '}
          <Text as="span" fontWeight="semibold">
            {schoolsCount}+
          </Text>{' '}
          автошкол России
        </Text>

        {showLogos && (
          <HStack
            gap={8}
            justify="center"
            flexWrap="wrap"
            opacity={0.6}
            _hover={{ opacity: 0.8 }}
            transition="opacity 0.2s"
          >
            {schools.slice(0, 6).map((school) => (
              <SchoolLogo key={school.id} name={school.name} logo={school.logo} />
            ))}
          </HStack>
        )}
      </Container>
    </Box>
  )
}

function SchoolLogo({ name, logo }: { name: string; logo?: string | null }) {
  if (logo) {
    // oxlint-disable-next-line eslint-plugin-next(no-img-element) -- внешний URL логотипа
    return <img src={logo} alt={name} style={{ height: '32px', objectFit: 'contain', filter: 'grayscale(100%)' }} />
  }

  // Fallback: текст с иконкой
  return (
    <HStack gap={2} color="fg.muted">
      <Building2 size={20} />
      <Text fontSize="sm" fontWeight="medium" maxW="120px" truncate>
        {name}
      </Text>
    </HStack>
  )
}
