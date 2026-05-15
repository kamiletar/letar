'use client'

import { Box, Container, Grid, Heading, Icon, Stack, Text } from '@chakra-ui/react'
import { Calendar, Car, ChartBar, Clock, ShieldCheck, Users } from 'lucide-react'

export function Features() {
  return (
    <Box py={{ base: 16, md: 24 }} id="features">
      <Container maxW="container.xl">
        <Stack gap={10} align="center">
          <Heading size="2xl" textAlign="center">
            Все необходимое для качественного обучения
          </Heading>

          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={8} width="full">
            <FeatureGroup
              title="Для учеников"
              accentColor="brand"
              features={[
                { icon: Users, text: 'Выбор лучшего инструктора по отзывам' },
                { icon: Calendar, text: 'Онлайн запись на вождение 24/7' },
                { icon: Clock, text: 'Удобное управление расписанием' },
              ]}
            />
            <FeatureGroup
              title="Для инструкторов"
              accentColor="accent"
              features={[
                { icon: Calendar, text: 'Автоматизация расписания занятий' },
                { icon: Users, text: 'База учеников и история обучения' },
                { icon: ChartBar, text: 'Статистика и отчетность' },
              ]}
            />
            <FeatureGroup
              title="Для автошкол"
              accentColor="fg"
              features={[
                { icon: Car, text: 'Контроль автопарка и инструкторов' },
                { icon: ShieldCheck, text: 'Прозрачность процессов обучения' },
                { icon: ChartBar, text: 'Аналитика эффективности работы' },
              ]}
            />
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}

interface FeatureGroupProps {
  title: string
  accentColor: string
  features: { icon: React.ElementType; text: string }[]
}

function FeatureGroup({ title, accentColor, features }: FeatureGroupProps) {
  return (
    <Box
      p={8}
      bg="bg.panel"
      borderRadius="xl"
      shadow="sm"
      borderWidth={1}
      transition="all 0.2s ease-out"
      _hover={{
        transform: 'translateY(-4px)',
        shadow: 'lg',
        borderColor: `${accentColor}.200`,
      }}
    >
      {/* Иконка-заголовок */}
      <Box
        w={12}
        h={12}
        bg={`${accentColor}.subtle`}
        borderRadius="lg"
        display="flex"
        alignItems="center"
        justifyContent="center"
        mb={4}
      >
        <Icon as={features[0].icon} boxSize={6} color={`${accentColor}.solid`} />
      </Box>

      <Heading size="lg" mb={6} color={`${accentColor}.solid`}>
        {title}
      </Heading>

      <Stack gap={4}>
        {features.map((feature) => (
          <Stack key={feature.text} direction="row" align="flex-start" gap={3}>
            <Icon as={feature.icon} color="fg.muted" boxSize={5} mt={0.5} flexShrink={0} />
            <Text fontWeight="medium">{feature.text}</Text>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}
