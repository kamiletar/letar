'use client'

import { Box, Container, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import type { IconType } from 'react-icons'
import { LuClapperboard } from 'react-icons/lu'
import { SiChakraui, SiElectron, SiPrisma, SiReact, SiTypescript } from 'react-icons/si'

interface TechItem {
  icon: IconType
  name: string
  description: string
  color: string
}

const TECH_STACK: TechItem[] = [
  {
    icon: SiElectron,
    name: 'Electron',
    description: 'Кроссплатформенный фреймворк',
    color: '#47848F',
  },
  {
    icon: SiReact,
    name: 'React',
    description: 'Пользовательский интерфейс',
    color: '#61DAFB',
  },
  {
    icon: SiTypescript,
    name: 'TypeScript',
    description: 'Типизированный код',
    color: '#3178C6',
  },
  {
    icon: LuClapperboard,
    name: 'FFmpeg',
    description: 'Транскодирование видео',
    color: '#007808',
  },
  {
    icon: SiPrisma,
    name: 'Prisma',
    description: 'База данных SQLite',
    color: '#2D3748',
  },
  {
    icon: SiChakraui,
    name: 'Chakra UI',
    description: 'Компоненты интерфейса',
    color: '#319795',
  },
]

// Motion компоненты
const MotionBox = motion.create(Box)
const MotionVStack = motion.create(VStack)
const MotionSimpleGrid = motion.create(SimpleGrid)

// Варианты анимации
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
}

interface TechCardProps {
  tech: TechItem
}

function TechCard({ tech }: TechCardProps) {
  const TechIcon = tech.icon
  return (
    <MotionBox variants={itemVariants} whileHover={{ scale: 1.05, y: -4 }} transition={{ duration: 0.2 }}>
      <VStack
        className="glass"
        p={5}
        borderRadius="xl"
        gap={3}
        borderWidth="1px"
        borderColor="gray.800"
        transitionProperty="border-color, box-shadow"
        transitionDuration="0.3s"
        transitionTimingFunction="ease"
        _hover={{
          borderColor: 'gray.700',
          boxShadow: `0 0 30px ${tech.color}20`,
        }}
      >
        <TechIcon size={40} color={tech.color} />
        <VStack gap={0}>
          <Text fontWeight="semibold" color="white">
            {tech.name}
          </Text>
          <Text fontSize="xs" color="gray.500" textAlign="center">
            {tech.description}
          </Text>
        </VStack>
      </VStack>
    </MotionBox>
  )
}

export function TechStackSection() {
  return (
    <Box asChild id="tech" py={{ base: 12, md: 16 }} bg="gray.900/30">
      <section>
        <Container maxW="container.xl">
          <VStack gap={10}>
            {/* Заголовок */}
            <MotionVStack
              gap={2}
              textAlign="center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Heading asChild size={{ base: 'xl', md: '2xl' }}>
                <h2>Технологии</h2>
              </Heading>
              <Text color="gray.500" fontSize="md">
                Современный стек для надёжной работы
              </Text>
            </MotionVStack>

            {/* Иконки технологий */}
            <MotionSimpleGrid
              columns={{ base: 2, sm: 3, md: 6 }}
              gap={4}
              w="full"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              {TECH_STACK.map((tech) => <TechCard key={tech.name} tech={tech} />)}
            </MotionSimpleGrid>

            {/* Дополнительные технологии */}
            <HStack gap={4} flexWrap="wrap" justify="center" color="gray.600" fontSize="sm">
              <Text>+ Next.js</Text>
              <Text>•</Text>
              <Text>+ Zustand</Text>
              <Text>•</Text>
              <Text>+ Shaka Player</Text>
              <Text>•</Text>
              <Text>+ SubtitlesOctopus</Text>
            </HStack>
          </VStack>
        </Container>
      </section>
    </Box>
  )
}
