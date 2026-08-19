import type { Project } from '@/lib/projects-data'
import { Badge, Box, Flex, HStack, Text } from '@chakra-ui/react'

interface ProjectCardProps {
  project: Project
}

/** Карточка проекта с эмодзи, описанием и ссылкой */
export function ProjectCard({ project }: ProjectCardProps) {
  const content = (
    <Box
      borderWidth="1px"
      borderColor="border"
      borderRadius="xl"
      p={5}
      bg="bg.card"
      backdropFilter="blur(10px)"
      transitionProperty="border-color, transform, box-shadow"
      transitionDuration="0.2s"
      _hover={project.url
        ? {
          borderColor: 'brand.500',
          transform: 'translateY(-2px)',
          shadow: '0 4px 20px rgba(49, 151, 149, 0.15)',
        }
        : undefined}
      height="full"
    >
      <Flex direction="column" gap={3} height="full">
        <HStack gap={3}>
          <Text fontSize="2xl" role="img">
            {project.emoji}
          </Text>
          <Text fontWeight="bold" fontSize="lg" color="fg">
            {project.name}
          </Text>
        </HStack>

        <Text color="fg.muted" fontSize="sm" flex="1">
          {project.description}
        </Text>

        {project.tech && (
          <HStack gap={1.5} flexWrap="wrap">
            {project.tech.map((t) => (
              <Badge key={t} size="sm" variant="subtle" colorPalette="teal" fontSize="xs">
                {t}
              </Badge>
            ))}
          </HStack>
        )}
      </Flex>
    </Box>
  )

  if (project.url) {
    return (
      <a href={project.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
        {content}
      </a>
    )
  }

  return content
}
