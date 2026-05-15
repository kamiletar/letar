import { Box, Button, Container, Grid, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { Car, Star, Users } from 'lucide-react'
import Link from 'next/link'

export interface HeroProps {
  metrics: {
    instructors: number
    students: number
    lessons: number
  }
  testimonial?: {
    rating: number
    text: string
    author: string
    role: string
  }
}

export function Hero({ metrics, testimonial }: HeroProps) {
  return (
    <Box position="relative" overflow="hidden" py={{ base: 16, md: 24, lg: 28 }}>
      <Container maxW="container.xl" position="relative" zIndex={1}>
        <Grid templateColumns={{ base: '1fr', lg: '3fr 2fr' }} gap={{ base: 12, lg: 16 }} alignItems="center">
          {/* Левая часть — текст и CTA */}
          <Stack gap={6} align={{ base: 'center', lg: 'flex-start' }} textAlign={{ base: 'center', lg: 'left' }}>
            <Heading size={{ base: '3xl', md: '4xl', lg: '5xl' }} fontWeight="bold" lineHeight="tight">
              Управляйте обучением вождению{' '}
              <Text as="span" color="fg.500" whiteSpace="nowrap">
                легко и удобно
              </Text>
            </Heading>

            <Text fontSize={{ base: 'lg', md: 'xl' }} color="fg.muted" maxW="2xl">
              Современная платформа, соединяющая учеников, инструкторов и автошколы. Записывайтесь на занятия онлайн,
              следите за прогрессом и автоматизируйте рутину.
            </Text>

            {/* Метрики */}
            <HStack gap={{ base: 6, md: 8 }} flexWrap="wrap" justify={{ base: 'center', lg: 'flex-start' }} py={4}>
              <MetricItem icon={<Users size={20} />} value={metrics.instructors} label="Инструкторов" />
              <MetricItem icon={<Users size={20} />} value={metrics.students} label="Учеников" />
              <MetricItem icon={<Car size={20} />} value={metrics.lessons} label="Занятий" />
            </HStack>

            {/* CTA */}
            <Stack direction={{ base: 'column', sm: 'row' }} gap={4} align="center">
              <Button asChild size="lg" colorPalette="fg">
                <Link href="/sign-up">Начать бесплатно</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" colorPalette="fg">
                <Link href="/schools">Для автошкол &rarr;</Link>
              </Button>
            </Stack>

            {/* Микро-testimonial */}
            {testimonial && (
              <HStack
                gap={3}
                mt={4}
                p={4}
                bg="bg.subtle"
                borderRadius="xl"
                borderWidth={1}
                borderColor="border.muted"
                maxW="md"
              >
                <HStack color="orange.400" flexShrink={0}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={`star-${i}`} size={14} fill={i < testimonial.rating ? 'currentColor' : 'none'} />
                  ))}
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  "{testimonial.text}" —{' '}
                  <Text as="span" fontWeight="semibold">
                    {testimonial.author}
                  </Text>
                  , {testimonial.role}
                </Text>
              </HStack>
            )}
          </Stack>

          {/* Правая часть — иллюстрация */}
          <Box display={{ base: 'none', lg: 'flex' }} justifyContent="center" alignItems="center">
            <Box
              w="full"
              maxW="400px"
              h="400px"
              bg="bg.subtle"
              borderRadius="3xl"
              position="relative"
              overflow="hidden"
            >
              {/* Placeholder для иллюстрации */}
              <Box
                position="absolute"
                inset={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="fg.muted"
              >
                <Stack align="center" gap={4}>
                  <Car size={80} strokeWidth={1} />
                  <Text fontSize="sm" color="fg.muted">
                    Иллюстрация
                  </Text>
                </Stack>
              </Box>
              {/* Декоративные круги */}
              <Box
                position="absolute"
                top="-20%"
                right="-20%"
                w="60%"
                h="60%"
                bg="fg.500"
                opacity={0.1}
                borderRadius="full"
              />
              <Box
                position="absolute"
                bottom="-10%"
                left="-10%"
                w="40%"
                h="40%"
                bg="accent.500"
                opacity={0.1}
                borderRadius="full"
              />
            </Box>
          </Box>
        </Grid>
      </Container>

      {/* Декоративный градиент фона */}
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        width="100%"
        height="100%"
        bgGradient="radial(circle at center, rgba(202, 158, 103, 0.15) 0%, transparent 70%)"
        zIndex={0}
        pointerEvents="none"
      />
    </Box>
  )
}

function MetricItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  // Форматирование чисел: 1234 -> "1,200+"
  const formatNumber = (n: number): string => {
    if (n >= 1000) {
      return `${Math.floor(n / 100) * 100}+`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
    return `${n}+`
  }

  return (
    <HStack gap={2}>
      <Box color="fg.500">{icon}</Box>
      <Stack gap={0}>
        <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" lineHeight="1">
          {formatNumber(value)}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {label}
        </Text>
      </Stack>
    </HStack>
  )
}
