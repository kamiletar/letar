import { Box, Container, Grid, GridItem, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Доставка — Премиум РосСтиль',
  description: 'Информация о доставке изделий ПРЕМИУМ РОССТИЛЬ. Доставка по Москве, России и за рубеж.',
}

export default function DeliveryPage() {
  return (
    <Box>
      <Container maxW={'2xl'}>
        <VStack gap={8} py={8} alignItems={'stretch'}>
          <Heading size={'2xl'} textAlign={'center'} textTransform={'none'}>
            Доставка
          </Heading>

          <Text fontSize={'lg'} textAlign={'center'}>
            Мы предлагаем удобные варианты доставки наших изделий, чтобы вы получили свой заказ в кратчайшие сроки.
          </Text>

          <VStack gap={6} alignItems={'stretch'}>
            {/* Доставка по Москве */}
            <Box borderWidth={1} borderRadius={'lg'} p={6}>
              <Heading size={'lg'} mb={4}>
                Доставка по Москве
              </Heading>
              <VStack alignItems={'stretch'} gap={3}>
                <Text fontSize={'lg'}>
                  <Text as="span" fontWeight={'bold'}>
                    Курьерская доставка
                  </Text>
                </Text>
                <Text pl={4}>
                  Доставка осуществляется в пределах МКАД. Стоимость доставки рассчитывается индивидуально в зависимости
                  от адреса.
                </Text>
                <Text pl={4}>
                  <Text as="span" fontWeight={'bold'}>
                    Срок доставки:
                  </Text>{' '}
                  1-2 рабочих дня после оформления заказа
                </Text>

                <Text fontSize={'lg'} pt={4}>
                  <Text as="span" fontWeight={'bold'}>
                    Самовывоз
                  </Text>
                </Text>
                <Text pl={4}>
                  Вы можете забрать заказ самостоятельно по адресу: г. Москва, ул. Б. Андроньевская, д.6
                </Text>
                <Text pl={4}>
                  <Text as="span" fontWeight={'bold'}>
                    Стоимость:
                  </Text>{' '}
                  бесплатно
                </Text>
                <Text pl={4}>Самовывоз доступен после предварительного согласования времени с менеджером.</Text>
              </VStack>
            </Box>

            {/* Доставка по России */}
            <Box borderWidth={1} borderRadius={'lg'} p={6}>
              <Heading size={'lg'} mb={4}>
                Доставка по России
              </Heading>
              <VStack alignItems={'stretch'} gap={3}>
                <Text fontSize={'lg'}>
                  Мы осуществляем доставку во все регионы России с помощью надежных транспортных компаний.
                </Text>

                <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={3} pt={2}>
                  <GridItem>
                    <Text fontWeight={'bold'}>Способы доставки:</Text>
                  </GridItem>
                  <GridItem>
                    <VStack alignItems={'flex-start'} gap={2}>
                      <Text>• СДЭК (до пункта выдачи или курьером)</Text>
                      <Text>• Почта России</Text>
                      <Text>• Boxberry</Text>
                    </VStack>
                  </GridItem>

                  <GridItem>
                    <Text fontWeight={'bold'}>Сроки доставки:</Text>
                  </GridItem>
                  <GridItem>
                    <Text>3-10 рабочих дней в зависимости от региона</Text>
                  </GridItem>

                  <GridItem>
                    <Text fontWeight={'bold'}>Стоимость:</Text>
                  </GridItem>
                  <GridItem>
                    <Text>
                      Рассчитывается индивидуально в зависимости от способа доставки, веса и габаритов посылки
                    </Text>
                  </GridItem>
                </Grid>

                <Box pt={3} bg={'gray.50'} p={4} rounded={'md'}>
                  <Text fontSize={'md'}>
                    <span role="img" aria-label="подсказка">
                      💡
                    </span>{' '}
                    При заказе на сумму от 50 000 ₽ доставка по России — бесплатно!
                  </Text>
                </Box>
              </VStack>
            </Box>

            {/* Международная доставка */}
            <Box borderWidth={1} borderRadius={'lg'} p={6}>
              <Heading size={'lg'} mb={4}>
                Международная доставка
              </Heading>
              <VStack alignItems={'stretch'} gap={3}>
                <Text fontSize={'lg'}>Мы отправляем наши изделия в страны ближнего и дальнего зарубежья.</Text>
                <Text>
                  Стоимость и сроки доставки рассчитываются индивидуально. Свяжитесь с нами для уточнения деталей.
                </Text>
                <Text>
                  <Text as="span" fontWeight={'bold'}>
                    Обратите внимание:
                  </Text>{' '}
                  при международной доставке могут применяться таможенные сборы в соответствии с законодательством
                  страны получателя.
                </Text>
              </VStack>
            </Box>

            {/* Условия доставки */}
            <Box borderWidth={1} borderRadius={'lg'} p={6}>
              <Heading size={'lg'} mb={4}>
                Условия доставки
              </Heading>
              <VStack alignItems={'flex-start'} gap={3}>
                <Text>✓ Все изделия тщательно упаковываются в фирменную упаковку</Text>
                <Text>✓ К заказу прилагаются все необходимые документы (чек, гарантийный талон)</Text>
                <Text>
                  ✓ Вы можете отследить статус доставки по трек-номеру, который будет предоставлен после отправки
                </Text>
                <Text>✓ При получении заказа обязательно проверьте целостность упаковки и соответствие товара</Text>
                <Text>✓ В случае обнаружения брака или несоответствия, свяжитесь с нами в течение 24 часов</Text>
              </VStack>
            </Box>
          </VStack>

          <Box pt={4} bg={'gray.50'} p={6} rounded={'md'}>
            <Heading size={'md'} mb={3}>
              Остались вопросы?
            </Heading>
            <Text fontSize={'lg'}>
              Свяжитесь с нами любым удобным способом, и мы с радостью поможем выбрать оптимальный вариант доставки для
              вашего заказа!
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
