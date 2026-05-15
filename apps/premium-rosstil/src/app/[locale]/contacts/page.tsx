import { SocialLinks } from '@/app/_components/social-links'
import { Box, Container, Heading, HStack, Icon, Link, Text, VStack } from '@chakra-ui/react'
import { FiPhoneOutgoing } from 'react-icons/fi'
import { TbMailShare } from 'react-icons/tb'

export default function ContactsPage() {
  return (
    <Box>
      <Container maxW={'2xl'}>
        <VStack gap={8} py={8}>
          <Heading size={'2xl'} textAlign={'center'} textTransform={'none'}>
            Контакты
          </Heading>

          <VStack gap={6} alignItems={'stretch'} width={'100%'}>
            <Box>
              <Heading size={'lg'} mb={3}>
                Связаться с нами
              </Heading>
              <VStack alignItems={'flex-start'} gap={4}>
                <HStack>
                  <Icon size={'lg'}>
                    <TbMailShare />
                  </Icon>
                  <Link href={'mailto:elena@rosstil.ru'} target={'_blank'}>
                    <Text fontSize={'lg'}>elena@rosstil.ru</Text>
                  </Link>
                </HStack>
                <HStack>
                  <Icon size={'lg'}>
                    <FiPhoneOutgoing />
                  </Icon>
                  <Link href={'tel:+79104343523'} target={'_blank'}>
                    <Text fontSize={'lg'}>+7 (910) 434-35-23</Text>
                  </Link>
                </HStack>
              </VStack>
            </Box>

            <Box pt={4}>
              <Heading size={'lg'} mb={3}>
                Социальные сети
              </Heading>
              <SocialLinks />
            </Box>

            <Box pt={4}>
              <Heading size={'lg'} mb={3}>
                Рабочие часы
              </Heading>
              <Text fontSize={'lg'}>Пн-Пт: 10:00 - 18:00</Text>
              <Text fontSize={'lg'}>Сб-Вс: Выходной</Text>
            </Box>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}
