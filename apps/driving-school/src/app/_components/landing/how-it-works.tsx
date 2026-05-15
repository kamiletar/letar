'use client'

import { Badge, Box, Container, Grid, Heading, Icon, Stack, Text } from '@chakra-ui/react'
import { CalendarCheck, CarFront, Search } from 'lucide-react'

const steps = [
  {
    icon: Search,
    title: 'Найдите инструктора',
    description: 'Изучите профили инструкторов, читайте отзывы и выбирайте того, кто подходит именно вам.',
  },
  {
    icon: CalendarCheck,
    title: 'Запишитесь онлайн',
    description: 'Выберите удобное время в календаре инструктора и забронируйте занятие в пару кликов.',
  },
  {
    icon: CarFront,
    title: 'Начните вождение',
    description: 'Приходите на занятие и получайте навыки вождения. Отслеживайте прогресс в личном кабинете.',
  },
]

export function HowItWorks() {
  return (
    <Box py={{ base: 16, md: 24 }} bg="bg.subtle" id="how-it-works">
      <Container maxW="container.xl">
        <Stack gap={16} align="center">
          <Heading size="2xl" textAlign="center">
            Как это работает
          </Heading>

          <Grid
            templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
            gap={{ base: 12, md: 8 }}
            width="full"
            position="relative"
          >
            {/* Соединительная линия (только на десктопе) */}
            <Box
              display={{ base: 'none', md: 'block' }}
              position="absolute"
              top="60px"
              left="calc(16.66% + 40px)"
              right="calc(16.66% + 40px)"
              height="2px"
              bg="border.muted"
              zIndex={0}
            />

            {steps.map((step) => (
              <Step
                key={step.title}
                icon={step.icon}
                title={step.title}
                description={step.description}
                number={steps.indexOf(step) + 1}
              />
            ))}
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}

interface StepProps {
  icon: React.ElementType
  title: string
  description: string
  number: number
}

function Step({ icon, title, description, number }: StepProps) {
  return (
    <Stack gap={4} align="center" textAlign="center" position="relative" zIndex={1}>
      {/* Иконка с номером */}
      <Box position="relative">
        <Box
          p={5}
          bg="bg.panel"
          borderRadius="full"
          color="fg.500"
          shadow="sm"
          borderWidth={2}
          borderColor="fg.500"
          transition="all 0.2s"
          _hover={{ shadow: 'md', transform: 'scale(1.05)' }}
        >
          <Icon as={icon} boxSize={10} />
        </Box>
        {/* Номер шага */}
        <Badge
          position="absolute"
          top={-1}
          right={-1}
          bg="fg.solid"
          color="fg.contrast"
          borderRadius="full"
          w={6}
          h={6}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="sm"
          fontWeight="bold"
        >
          {number}
        </Badge>
      </Box>

      <Heading size="lg">{title}</Heading>
      <Text color="fg.muted" fontSize="lg" maxW="xs">
        {description}
      </Text>
    </Stack>
  )
}
