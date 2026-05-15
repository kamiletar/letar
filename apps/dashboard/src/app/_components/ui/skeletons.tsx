import { Box, Card, Grid, HStack, Stack, VStack } from '@chakra-ui/react'
import { Skeleton, SkeletonCircle, SkeletonText } from './skeleton'

/**
 * Skeleton for metric cards (CPU, Memory, Disk, etc.)
 */
export const MetricCardSkeleton = () => (
  <Card.Root>
    <Card.Body>
      <Stack gap="3">
        <HStack justify="space-between">
          <Skeleton height="20px" width="120px" />
          <SkeletonCircle size="8" />
        </HStack>
        <Skeleton height="40px" width="80px" />
        <SkeletonText noOfLines={2} />
      </Stack>
    </Card.Body>
  </Card.Root>
)

/**
 * Skeleton for app/container cards
 */
export const AppCardSkeleton = () => (
  <Card.Root>
    <Card.Body>
      <Stack gap="4">
        <HStack justify="space-between">
          <VStack align="start" gap="2">
            <Skeleton height="24px" width="200px" />
            <Skeleton height="16px" width="120px" />
          </VStack>
          <SkeletonCircle size="10" />
        </HStack>
        <Grid templateColumns="repeat(2, 1fr)" gap="4">
          <Box>
            <Skeleton height="14px" width="60px" mb="2" />
            <Skeleton height="20px" width="100px" />
          </Box>
          <Box>
            <Skeleton height="14px" width="60px" mb="2" />
            <Skeleton height="20px" width="100px" />
          </Box>
        </Grid>
        <HStack gap="2">
          <Skeleton height="32px" width="80px" />
          <Skeleton height="32px" width="80px" />
          <Skeleton height="32px" width="80px" />
        </HStack>
      </Stack>
    </Card.Body>
  </Card.Root>
)

/**
 * Skeleton for database card
 */
export const DatabaseCardSkeleton = () => (
  <Card.Root>
    <Card.Body>
      <Stack gap="4">
        <HStack justify="space-between">
          <Skeleton height="24px" width="180px" />
          <Skeleton height="20px" width="80px" />
        </HStack>
        <Grid templateColumns="repeat(3, 1fr)" gap="4">
          <Box>
            <Skeleton height="14px" width="50px" mb="2" />
            <Skeleton height="20px" width="80px" />
          </Box>
          <Box>
            <Skeleton height="14px" width="70px" mb="2" />
            <Skeleton height="20px" width="60px" />
          </Box>
          <Box>
            <Skeleton height="14px" width="60px" mb="2" />
            <Skeleton height="20px" width="70px" />
          </Box>
        </Grid>
        <Skeleton height="32px" width="120px" />
      </Stack>
    </Card.Body>
  </Card.Root>
)

/**
 * Skeleton for table rows
 */
export const TableRowSkeleton = ({ columns = 4 }: { columns?: number }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      /* oxlint-disable-next-line eslint-plugin-react/no-array-index-key -- Static placeholder array */
      <td key={i} style={{ padding: '12px' }}>
        <Skeleton height="20px" />
      </td>
    ))}
  </tr>
)

/**
 * Skeleton for deploy/git info
 */
export const DeployInfoSkeleton = () => (
  <Card.Root>
    <Card.Body>
      <Stack gap="3">
        <Skeleton height="24px" width="200px" />
        <Grid templateColumns="repeat(2, 1fr)" gap="4">
          <Box>
            <Skeleton height="14px" width="80px" mb="2" />
            <Skeleton height="20px" width="150px" />
          </Box>
          <Box>
            <Skeleton height="14px" width="60px" mb="2" />
            <Skeleton height="20px" width="120px" />
          </Box>
        </Grid>
        <SkeletonText noOfLines={3} />
        <HStack gap="2">
          <Skeleton height="36px" width="140px" />
          <Skeleton height="36px" width="100px" />
        </HStack>
      </Stack>
    </Card.Body>
  </Card.Root>
)

/**
 * Skeleton for stat items
 */
export const StatSkeleton = () => (
  <Box>
    <Skeleton height="14px" width="80px" mb="2" />
    <Skeleton height="32px" width="120px" mb="1" />
    <Skeleton height="16px" width="100px" />
  </Box>
)

/**
 * Skeleton for alert cards
 */
export const AlertCardSkeleton = () => (
  <Card.Root>
    <Card.Body>
      <HStack justify="space-between" mb="3">
        <HStack gap="3">
          <SkeletonCircle size="10" />
          <VStack align="start" gap="1">
            <Skeleton height="20px" width="200px" />
            <Skeleton height="16px" width="150px" />
          </VStack>
        </HStack>
        <Skeleton height="24px" width="80px" />
      </HStack>
      <SkeletonText noOfLines={2} />
      <HStack gap="2" mt="3">
        <Skeleton height="28px" width="100px" />
        <Skeleton height="28px" width="120px" />
      </HStack>
    </Card.Body>
  </Card.Root>
)

/**
 * Grid of skeleton cards
 */
export const SkeletonGrid = ({
  count = 4,
  columns = { base: 1, md: 2, lg: 4 },
  SkeletonComponent = MetricCardSkeleton,
}: {
  count?: number
  columns?: { base: number; md: number; lg: number }
  SkeletonComponent?: React.ComponentType
}) => (
  <Grid
    templateColumns={{
      base: `repeat(${columns.base}, 1fr)`,
      md: `repeat(${columns.md}, 1fr)`,
      lg: `repeat(${columns.lg}, 1fr)`,
    }}
    gap="6"
  >
    {Array.from({ length: count }).map((_, i) => (
      /* oxlint-disable-next-line eslint-plugin-react/no-array-index-key -- Static placeholder array */
      <SkeletonComponent key={i} />
    ))}
  </Grid>
)
