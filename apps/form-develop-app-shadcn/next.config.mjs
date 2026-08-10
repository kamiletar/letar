import createMDX from '@next/mdx'
import { composePlugins, withNx } from '@nx/next'

const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  nx: {},
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

const plugins = [withNx, withMDX]

export default composePlugins(...plugins)(nextConfig)
