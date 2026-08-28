import type { Project } from '@/lib/projects-data'
import { Box, Flex, HStack, Text } from '@chakra-ui/react'
import { ArrowUpRight, Minus } from 'lucide-react'

interface ProjectCardProps {
  project: Project
}

/** Карточка проекта с эмодзи, описанием и ссылкой */
export function ProjectCard({ project }: ProjectCardProps) {
  const content = <ProjectCardContent project={project} />

  if (project.url) {
    return (
      <Box
        asChild
        className="project-card project-card-link"
        borderWidth="1px"
        borderColor="border"
        borderRadius="xl"
        bg="bg.card"
        height="full"
        transition="transform 0.18s ease, border-color 0.18s ease, background 0.18s ease"
        _hover={{ borderColor: 'brand.600', transform: 'translateY(-3px)', bg: 'bg.cardHover' }}
        _active={{ transform: 'scale(0.99)' }}
        _focusVisible={{ outline: '3px solid', outlineColor: 'brand.300', outlineOffset: '3px' }}
      >
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Открыть ${project.name} в новой вкладке`}
        >
          {content}
        </a>
      </Box>
    )
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="border"
      borderRadius="xl"
      bg="bg.card"
      height="full"
      opacity="0.82"
    >
      {content}
    </Box>
  )
}

function ProjectCardContent({ project }: ProjectCardProps) {
  return (
    <Flex direction="column" gap={4} height="full" p={{ base: 5, md: 5 }} minH={{ base: 'unset', sm: '14rem' }}>
      <HStack gap={3} align="center">
        <Flex boxSize="10" flex="none" align="center" justify="center" borderRadius="lg" bg="bg.muted">
          <Text fontSize="xl" aria-hidden="true">{project.emoji}</Text>
        </Flex>
        <Text fontWeight="650" fontSize="lg" color="fg" lineHeight="1.2">
          {project.name}
        </Text>
      </HStack>

      <Text color="fg.muted" fontSize="sm" lineHeight="1.65" flex="1">
        {project.description}
      </Text>

      {project.tech && (
        <Flex gap={2} flexWrap="wrap" aria-label="Технологии">
          {project.tech.map((technology) => (
            <Text key={technology} className="tech-label signal-font">{technology}</Text>
          ))}
        </Flex>
      )}

      <Flex
        align="center"
        justify="space-between"
        borderTopWidth="1px"
        borderColor="border"
        pt={3}
        color={project.url ? 'brand.200' : 'fg.subtle'}
      >
        <Text className="signal-font" fontSize="xs">
          {project.url ? 'ОТКРЫТЬ' : 'БЕЗ ПУБЛИЧНОЙ СТРАНИЦЫ'}
        </Text>
        {project.url ? <ArrowUpRight aria-hidden="true" size={16} /> : <Minus aria-hidden="true" size={16} />}
      </Flex>
    </Flex>
  )
}
