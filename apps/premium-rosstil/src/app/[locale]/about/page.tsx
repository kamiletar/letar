import { Box, Center, Container, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { GiSandsOfTime } from 'react-icons/gi'
import { CareIcon } from './_components/_icons/care-icon'
import { EnergyIcon } from './_components/_icons/energy-icon'
import { HeartIcon } from './_components/_icons/heart-icon'
import { WomanIcon } from './_components/_icons/woman-icon'

const MoveIcon = ({ children }: PropsWithChildren) => (
  <Box transform={'translateX(4px)'}>
    <Icon size={'2xl'}>{children}</Icon>
  </Box>
)

const H = ({ children }: PropsWithChildren) => {
  return <Heading p={2}>{children}</Heading>
}
const T = ({ children }: PropsWithChildren) => {
  return (
    <Text
      rounded={'md'}
      border={'2px solid'}
      p={2}
      width={{ md: '42vw', lg: '18em' }}
      height={{ md: '17vw', lg: '12em' }}
    >
      {children}
    </Text>
  )
}

export default function AboutPage() {
  return (
    <Box>
      <Container maxW={'2xl'}>
        <VStack gap={8}>
          <Heading size={'2xl'} textAlign={'center'} textTransform={'none'}>
            О Бренде
          </Heading>

          <Text p={2}>
            Одежа РОССТИЛЬ помогает женщине раскрыться и проживать разные состояния от элегантной, романтичной, легкой
            до деловой и амбициозной
          </Text>
        </VStack>
      </Container>
      <Box pr={2}>
        <Center>
          <Box>
            <Heading p={2} pl={12}>
              ЭМОЦИИ
            </Heading>
            <HStack alignItems={'center'} gap={3} wrap={'wrap'}>
              <HStack alignItems={'center'}>
                <MoveIcon>
                  <EnergyIcon />
                </MoveIcon>
                <T>Одежда наполнена энергией, помогающая быстро входить в нужное эмоциональное состояние</T>
              </HStack>

              <HStack alignItems={'center'}>
                <MoveIcon>
                  <HeartIcon />
                </MoveIcon>
                <T>
                  В каждую модель вложена любовь, а также глубокое внимание к деталям: специальный крой, подчеркивающий
                  женственность, материалы, сочетания цвета фактур
                </T>
              </HStack>
              <HStack alignItems={'center'}>
                <MoveIcon>
                  <CareIcon />
                </MoveIcon>
                <T>
                  Размерный ряд 42-48
                  <br />
                  На заказ 50-54
                </T>
              </HStack>
            </HStack>
          </Box>
        </Center>

        <Center pt={6}>
          <HStack alignItems={'stretch'} gap={4} wrap={'wrap'}>
            <Box>
              <Box pl={8}>
                <H>КРЕАТИВНОСТЬ</H>
              </Box>
              <HStack>
                <MoveIcon>
                  <WomanIcon />
                </MoveIcon>
                <T>
                  Стань дизайнером своего образа (возможность создания собственной модели — ткани и фурнитура по вашему
                  вкусу из представленных моделей)
                </T>
              </HStack>
            </Box>

            <Box>
              <Box pl={8}>
                <H>ПРАКТИЧНАЯ ЭСТЕТИКА</H>
              </Box>
              <HStack>
                <MoveIcon>
                  <GiSandsOfTime />
                </MoveIcon>
                <T>
                  Отстегивающиеся подплечники, корректирующие посадку изделия и создающие женственный силуэт «песочные
                  часы»
                </T>
              </HStack>
            </Box>
          </HStack>
        </Center>
      </Box>
      <Container maxW={'2xl'} mt={12}>
        <Heading size={'xl'} textAlign={'center'} pb={6}>
          ПРЕМИУМ РОССТИЛЬ ИСПОЛЬЗУЕТ КОМФОРТНЫЕ, НАТУРАЛЬНЫЕ, ИННОВАЦИОННЫЕ, СТИЛЬНЫЕ, ПРЕМИАЛЬНЫЕ ТКАНИ И ФУРНИТУРУ
        </Heading>
      </Container>
    </Box>
  )
}
