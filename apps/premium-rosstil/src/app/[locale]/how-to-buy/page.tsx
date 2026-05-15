import { SizeChart } from '@/app/_components/size-chart'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'

export default function HowToBuyPage() {
  return (
    <Box>
      <Container maxW={'2xl'}>
        <VStack gap={8} py={8} alignItems={'stretch'}>
          <Heading size={'2xl'} textAlign={'center'} textTransform={'none'}>
            Как купить
          </Heading>

          <Text fontSize={'lg'}>
            Приобрести изделия ПРЕМИУМ РОССТИЛЬ очень просто. Следуйте нашей пошаговой инструкции:
          </Text>

          <VStack gap={4} alignItems={'stretch'}>
            <Box>
              <Text fontSize={'lg'} fontWeight={'bold'}>
                1. Выберите понравившуюся модель
              </Text>
              <Text mt={2} pl={6}>
                Ознакомьтесь с нашим каталогом и выберите изделие, которое вам понравилось. Все модели доступны в
                размерном ряду 42-64.
              </Text>
            </Box>

            <Box>
              <Text fontSize={'lg'} fontWeight={'bold'}>
                2. Свяжитесь с нами
              </Text>
              <Text mt={2} pl={6}>
                Напишите нам удобным для вас способом: по электронной почте, в мессенджерах или по телефону. Укажите
                выбранную модель, размер и желаемый цвет/ткань.
              </Text>
            </Box>

            <Box>
              <Text fontSize={'lg'} fontWeight={'bold'}>
                3. Консультация
              </Text>
              <Text mt={2} pl={6}>
                Наш менеджер свяжется с вами для уточнения деталей заказа. Вы можете запросить дополнительные
                фотографии, узнать о наличии и сроках изготовления.
              </Text>
            </Box>

            <Box>
              <Text fontSize={'lg'} fontWeight={'bold'}>
                4. Индивидуальный подход
              </Text>
              <Text mt={2} pl={6}>
                Мы предлагаем возможность создания собственной модели — выберите ткань и фурнитуру по вашему вкусу из
                представленных вариантов.
              </Text>
            </Box>

            <Box>
              <Text fontSize={'lg'} fontWeight={'bold'}>
                5. Оформление заказа
              </Text>
              <Text mt={2} pl={6}>
                После согласования всех деталей мы оформим ваш заказ и согласуем способ оплаты и доставки.
              </Text>
            </Box>

            <Box>
              <Text fontSize={'lg'} fontWeight={'bold'}>
                6. Получение
              </Text>
              <Text mt={2} pl={6}>
                Получите ваш заказ удобным для вас способом. Мы организуем доставку или можете забрать заказ
                самостоятельно.
              </Text>
            </Box>
          </VStack>

          <Box pt={8}>
            <SizeChart />
          </Box>

          <Box pt={6}>
            <Heading size={'lg'} mb={4}>
              Преимущества покупки у нас
            </Heading>
            <VStack alignItems={'flex-start'} gap={3}>
              <Text fontSize={'lg'}>✓ Индивидуальный подход к каждому клиенту</Text>
              <Text fontSize={'lg'}>✓ Возможность создания уникальной модели</Text>
              <Text fontSize={'lg'}>✓ Широкий размерный ряд (42-64)</Text>
              <Text fontSize={'lg'}>✓ Премиальные натуральные ткани</Text>
              <Text fontSize={'lg'}>✓ Консультация по подбору изделия</Text>
            </VStack>
          </Box>

          <Box pt={6} bg={'gray.50'} p={6} rounded={'md'}>
            <Heading size={'md'} mb={3}>
              Остались вопросы?
            </Heading>
            <Text fontSize={'lg'}>
              Свяжитесь с нами любым удобным способом, и мы с радостью ответим на все ваши вопросы!
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
