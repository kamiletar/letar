import type { ShowcaseProject } from '@/lib/projects-data'
import { Box, Container, Flex, Grid, Text } from '@chakra-ui/react'
import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'

interface FeaturedProjectsSectionProps {
  projects: ShowcaseProject[]
}

/** Витрина двух визуально характерных продуктов экосистемы */
export function FeaturedProjectsSection({ projects }: FeaturedProjectsSectionProps) {
  return (
    <Box asChild pt={{ base: '12', md: '20' }} pb={{ base: '14', md: '20' }} scrollMarginTop="20">
      <section id="featured">
        <Container maxW="7xl">
          <Flex
            align={{ base: 'start', md: 'end' }}
            justify="space-between"
            direction={{ base: 'column', md: 'row' }}
            gap={5}
            mb={10}
          >
            <Box>
              <Text className="section-kicker signal-font">SELECTED / 02</Text>
              <Text
                asChild
                fontSize={{ base: '3xl', md: '5xl' }}
                fontWeight="700"
                letterSpacing="-0.04em"
                lineHeight="1.05"
                mt={3}
              >
                <h2>Проекты с характером</h2>
              </Text>
            </Box>
            <Text color="fg.muted" maxW="lg" fontSize={{ base: 'md', md: 'lg' }} lineHeight="1.7">
              Не шаблоны под разными именами, а самостоятельные продукты со своей задачей, аудиторией и визуальным
              языком.
            </Text>
          </Flex>

          <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={{ base: 6, lg: 8 }}>
            {projects.map((project) => <FeaturedProjectCard key={project.name} project={project} />)}
          </Grid>
        </Container>
      </section>
    </Box>
  )
}

function FeaturedProjectCard({ project }: { project: ShowcaseProject }) {
  return (
    <Box
      asChild
      className={`featured-card featured-card-${project.tone}`}
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="border"
      bg="bg.card"
      overflow="hidden"
      transition="transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease"
      _hover={{
        transform: 'translateY(-6px)',
        borderColor: 'border.emphasized',
        boxShadow: '0 24px 70px rgba(0, 0, 0, 0.28)',
      }}
      _focusVisible={{ outline: '3px solid', outlineColor: 'brand.300', outlineOffset: '4px' }}
    >
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Открыть ${project.name} в новой вкладке`}
      >
        <Box position="relative" aspectRatio="8 / 5" overflow="hidden" bg="bg.muted">
          <Image
            className="featured-image"
            src={project.image}
            alt={project.imageAlt}
            fill
            placeholder="blur"
            sizes="(max-width: 1024px) 100vw, 50vw"
            style={{ objectFit: 'cover' }}
          />
          <Box className="featured-image-shade" position="absolute" inset="0" aria-hidden="true" />
          <Text className="featured-index signal-font" position="absolute" top={4} right={5} fontSize="xs">
            LIVE / OPEN
          </Text>
        </Box>
        <Flex p={{ base: 5, md: 7 }} align="start" justify="space-between" gap={5}>
          <Box>
            <Text className="signal-font" color="brand.200" fontSize="xs" letterSpacing="0.08em" mb={2}>
              {project.label.toUpperCase()}
            </Text>
            <Text asChild fontSize={{ base: '2xl', md: '3xl' }} fontWeight="700" letterSpacing="-0.03em">
              <h3>{project.name}</h3>
            </Text>
            <Text color="fg.muted" lineHeight="1.65" mt={2} maxW="xl">
              {project.description}
            </Text>
          </Box>
          <Flex
            className="featured-arrow"
            flex="none"
            boxSize="11"
            borderRadius="full"
            borderWidth="1px"
            borderColor="border.emphasized"
            align="center"
            justify="center"
          >
            <ArrowUpRight aria-hidden="true" size={20} />
          </Flex>
        </Flex>
      </a>
    </Box>
  )
}
