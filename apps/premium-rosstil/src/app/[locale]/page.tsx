import { BrandPhilosophy } from '@/app/_components/brand-philosophy/brand-philosophy'
import { FeaturedProducts } from '@/app/_components/featured-products/featured-products'
import { ImagesRow } from '@/app/_components/images-row/images-row'
import { Box } from '@chakra-ui/react'
import { Suspense } from 'react'
import { RecentlyViewedProducts } from './_components/recently-viewed-products'
import { RecommendedProducts } from './_components/recommended-products'

export default function Index() {
  return (
    <Box>
      <ImagesRow />
      <BrandPhilosophy />
      {/* Fallback for async server component */}
      <Suspense fallback={<Box h="400px" />}>
        <FeaturedProducts />
      </Suspense>
      <Suspense>
        <RecommendedProducts />
      </Suspense>
      <RecentlyViewedProducts />
    </Box>
  )
}
