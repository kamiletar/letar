import { formatPhoneNumber } from '@/lib/format'
import { Box, Container, Grid, GridItem, Heading, Link, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Реквизиты — Премиум РосСтиль',
  description: 'Реквизиты компании ИП Аксянова Елена Юрьевна',
}

export default function RequisitesPage() {
  return (
    <Box>
      <Container maxW={'2xl'}>
        <VStack gap={8} py={8} alignItems={'stretch'}>
          <Heading size={'2xl'} textAlign={'center'} textTransform={'none'}>
            Реквизиты
          </Heading>

          <VStack gap={6} alignItems={'stretch'}>
            {/* Основная информация */}
            <Box borderWidth={1} borderRadius={'lg'} p={6}>
              <Heading size={'lg'} mb={4}>
                Основная информация
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={4}>
                <GridItem>
                  <Text fontWeight={'bold'}>Наименование:</Text>
                </GridItem>
                <GridItem>
                  <Text>ИП Аксянова Елена Юрьевна</Text>
                </GridItem>

                <GridItem>
                  <Text fontWeight={'bold'}>ИНН:</Text>
                </GridItem>
                <GridItem>
                  <Text>68 27 01 27 15 21</Text>
                </GridItem>

                <GridItem>
                  <Text fontWeight={'bold'}>ОГРНИП:</Text>
                </GridItem>
                <GridItem>
                  <Text>317774600434927</Text>
                </GridItem>
              </Grid>
            </Box>

            {/* Банковские реквизиты */}
            <Box borderWidth={1} borderRadius={'lg'} p={6}>
              <Heading size={'lg'} mb={4}>
                Банковские реквизиты
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={4}>
                <GridItem>
                  <Text fontWeight={'bold'}>Банк:</Text>
                </GridItem>
                <GridItem>
                  <Text>Московский банк ПАО Сбербанк № 9038/01793</Text>
                </GridItem>

                <GridItem>
                  <Text fontWeight={'bold'}>Расчётный счёт:</Text>
                </GridItem>
                <GridItem>
                  <Text>408 028 109 380 000 561 17</Text>
                </GridItem>

                <GridItem>
                  <Text fontWeight={'bold'}>Корр. счёт:</Text>
                </GridItem>
                <GridItem>
                  <Text>301 018 104 000 000 002 25</Text>
                </GridItem>

                <GridItem>
                  <Text fontWeight={'bold'}>Текущий счёт:</Text>
                </GridItem>
                <GridItem>
                  <Text>303 018 108 000 060 038 00</Text>
                </GridItem>

                <GridItem>
                  <Text fontWeight={'bold'}>БИК:</Text>
                </GridItem>
                <GridItem>
                  <Text>044525225</Text>
                </GridItem>

                <GridItem>
                  <Text fontWeight={'bold'}>КПП:</Text>
                </GridItem>
                <GridItem>
                  <Text>775003035</Text>
                </GridItem>

                <GridItem>
                  <Text fontWeight={'bold'}>ИНН банка:</Text>
                </GridItem>
                <GridItem>
                  <Text>7707083893</Text>
                </GridItem>
              </Grid>
            </Box>

            {/* Контактная информация */}
            <Box borderWidth={1} borderRadius={'lg'} p={6}>
              <Heading size={'lg'} mb={4}>
                Контактная информация
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={4}>
                <GridItem>
                  <Text fontWeight={'bold'}>Телефон:</Text>
                </GridItem>
                <GridItem>
                  <Text>
                    <Link href={'tel:+79104343523'}>{formatPhoneNumber('+79104343523')}</Link>
                  </Text>
                </GridItem>

                <GridItem>
                  <Text fontWeight={'bold'}>Электронная почта:</Text>
                </GridItem>
                <GridItem>
                  <Text>
                    <Link href={'mailto:elena@rosstil.ru'}>elena@rosstil.ru</Link>
                  </Text>
                </GridItem>
              </Grid>
            </Box>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}
