import { MeasurementCalculator } from '@/app/_components/measurement-calculator'
import { SizeConverter } from '@/app/_components/size-converter'
import { Box, Container, Heading, Separator, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Калькулятор размеров — Премиум РосСтиль',
  description:
    'Конвертер размеров одежды между различными системами измерения. Подбор размера по индивидуальным меркам.',
}

export default function SizeCalculatorPage() {
  return (
    <Box>
      <Container maxW="4xl">
        <VStack gap={8} py={8} alignItems="stretch">
          <Box textAlign="center">
            <Heading size="2xl" mb={4} textTransform="none">
              Калькулятор размеров
            </Heading>
            <Text fontSize="lg" color="fg.muted">
              Узнайте свой размер и конвертируйте между различными системами измерения
            </Text>
          </Box>

          {/* Measurement Calculator */}
          <Box>
            <MeasurementCalculator />
          </Box>

          {/* Helpful tips */}
          <Box pt={6} bg="bg.subtle" p={6} borderRadius="md">
            <Heading size="md" mb={4} textTransform="none">
              Как правильно снять мерки
            </Heading>
            <VStack alignItems="flex-start" gap={3}>
              <Text fontSize="sm">
                <strong>Обхват груди:</strong> Измерьте обхват по самым выступающим точкам груди, держа сантиметровую
                ленту горизонтально и не затягивая слишком туго.
              </Text>
              <Text fontSize="sm">
                <strong>Обхват талии:</strong> Измерьте обхват в самой узкой части талии, обычно на уровне пупка или
                чуть выше.
              </Text>
              <Text fontSize="sm">
                <strong>Обхват бедер:</strong> Измерьте обхват по самым выступающим точкам ягодиц, держа сантиметровую
                ленту горизонтально.
              </Text>
              <Text fontSize="sm" fontStyle="italic" color="fg.muted">
                Совет: Для наиболее точного результата измерения лучше проводить в нижнем белье. Не затягивайте
                сантиметровую ленту слишком туго - она должна плотно прилегать к телу, но не сдавливать его.
              </Text>
            </VStack>
          </Box>

          {/* Recommendations for non-standard figures */}
          <Box pt={6} bg="orange.subtle" p={6} borderRadius="md">
            <Heading size="md" mb={4} textTransform="none">
              Рекомендации для нестандартных фигур
            </Heading>
            <VStack alignItems="flex-start" gap={3}>
              <Text fontSize="sm">
                Калькулятор размеров использует умный алгоритм подбора, который учитывает индивидуальные особенности
                фигуры. Если ваши измерения не совпадают полностью со стандартными размерами, система подберёт ближайшие
                варианты и даст рекомендации.
              </Text>
              <Text fontSize="sm">
                <strong>Для фигур типа "груша" или "песочные часы"</strong> (когда бёдра значительно больше груди):
                калькулятор учитывает приоритет посадки на бёдрах и подскажет размер с запасом для комфортной посадки.
              </Text>
              <Text fontSize="sm">
                <strong>Для фигур типа "перевернутый треугольник"</strong> (когда грудь больше бёдер): система подберёт
                размер с учётом объёма груди, отметив это в рекомендациях.
              </Text>
              <Text fontSize="sm" fontStyle="italic" color="fg.muted">
                Если калькулятор показывает частичное совпадение или ближайший размер, обратите внимание на указанные
                рекомендации. Мы всегда готовы помочь с индивидуальным подбором - свяжитесь с нами для консультации.
              </Text>
            </VStack>
          </Box>
          <Separator my={4} />

          {/* Size Converter */}
          <Box>
            <SizeConverter />
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
