import { render, screen } from '@/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ProductCard } from './product-card'

// Mock server actions
vi.mock('@/app/[locale]/profile/wishlist/_actions/add-to-wishlist', () => ({
  addToWishlist: vi.fn(),
}))

vi.mock('@/app/[locale]/profile/wishlist/_actions/remove-from-wishlist', () => ({
  removeFromWishlist: vi.fn(),
}))

// Mock toaster
vi.mock('@/app/_components/ui/toaster', () => ({
  toaster: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ProductCard Component', () => {
  const mockProduct = {
    id: 'product-1',
    name: 'Тестовое платье',
    variants: [
      {
        id: 'variant-1',
        color: 'Красный',
        items: [{ price: 1999 }, { price: 2099 }],
        images: [
          {
            url: '/uploads/product1.jpg',
            alt: 'Красное платье',
          },
        ],
      },
      {
        id: 'variant-2',
        color: 'Синий',
        items: [{ price: 1899 }],
        images: [
          {
            url: '/uploads/product2.jpg',
            alt: 'Синее платье',
          },
        ],
      },
    ],
  }

  const defaultProps = {
    product: mockProduct,
    isAuthenticated: false,
    wishlistVariantIds: [] as string[],
  }

  it('should render product name', () => {
    render(<ProductCard {...defaultProps} />)

    expect(screen.getByText('Тестовое платье')).toBeInTheDocument()
  })

  it('should render first product image', () => {
    render(<ProductCard {...defaultProps} />)

    const image = screen.getByAltText('Красное платье')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/uploads/product1.jpg')
  })

  it('should render price range when prices differ', () => {
    render(<ProductCard {...defaultProps} />)

    // Min: 1899, Max: 2099
    expect(screen.getByText(/1 899 ₽ - 2 099 ₽/)).toBeInTheDocument()
  })

  it('should render single price when all prices are the same', () => {
    const singlePriceProduct = {
      ...mockProduct,
      variants: [
        {
          id: 'variant-1',
          color: 'Красный',
          items: [{ price: 2000 }, { price: 2000 }],
          images: [
            {
              url: '/uploads/product1.jpg',
              alt: 'Красное платье',
            },
          ],
        },
      ],
    }

    render(<ProductCard {...defaultProps} product={singlePriceProduct} />)

    expect(screen.getByText('2 000 ₽')).toBeInTheDocument()
  })

  it('should render variant count', () => {
    render(<ProductCard {...defaultProps} />)

    expect(screen.getByText('2 цвета')).toBeInTheDocument()
  })

  it('should render singular form for single variant', () => {
    const singleVariantProduct = {
      ...mockProduct,
      variants: [mockProduct.variants[0]],
    }

    render(<ProductCard {...defaultProps} product={singleVariantProduct} />)

    expect(screen.getByText('1 цвет')).toBeInTheDocument()
  })

  it('should render "Нет изображения" when no image available', () => {
    const noImageProduct = {
      ...mockProduct,
      variants: [
        {
          id: 'variant-1',
          color: 'Красный',
          items: [{ price: 1999 }],
          images: [],
        },
      ],
    }

    render(<ProductCard {...defaultProps} product={noImageProduct} />)

    expect(screen.getByText('Нет изображения')).toBeInTheDocument()
  })

  it('should use product name as fallback alt text', () => {
    const noAltProduct = {
      ...mockProduct,
      variants: [
        {
          id: 'variant-1',
          color: 'Красный',
          items: [{ price: 1999 }],
          images: [
            {
              url: '/uploads/product1.jpg',
              alt: null,
            },
          ],
        },
      ],
    }

    render(<ProductCard {...defaultProps} product={noAltProduct} />)

    const image = screen.getByAltText('Тестовое платье')
    expect(image).toBeInTheDocument()
  })

  it('should link to product detail page', () => {
    render(<ProductCard {...defaultProps} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/catalog/product-1')
  })

  it('should handle product with multiple items per variant', () => {
    const multiItemProduct = {
      id: 'product-2',
      name: 'Многоразмерное платье',
      variants: [
        {
          id: 'variant-1',
          color: 'Черный',
          items: [{ price: 2000 }, { price: 2100 }, { price: 2200 }],
          images: [
            {
              url: '/uploads/black.jpg',
              alt: 'Черное платье',
            },
          ],
        },
      ],
    }

    render(<ProductCard {...defaultProps} product={multiItemProduct} />)

    expect(screen.getByText(/2 000 ₽ - 2 200 ₽/)).toBeInTheDocument()
  })

  it('should calculate correct min and max prices across all variants', () => {
    const complexProduct = {
      id: 'product-3',
      name: 'Сложный продукт',
      variants: [
        {
          id: 'variant-1',
          color: 'Красный',
          items: [{ price: 3000 }, { price: 3500 }],
          images: [
            {
              url: '/uploads/red.jpg',
              alt: 'Красный',
            },
          ],
        },
        {
          id: 'variant-2',
          color: 'Синий',
          items: [{ price: 2500 }, { price: 4000 }],
          images: [
            {
              url: '/uploads/blue.jpg',
              alt: 'Синий',
            },
          ],
        },
      ],
    }

    render(<ProductCard {...defaultProps} product={complexProduct} />)

    // Min should be 2500, max should be 4000
    expect(screen.getByText(/2 500 ₽ - 4 000 ₽/)).toBeInTheDocument()
  })

  it('should show filled heart icon when variant is in wishlist', () => {
    render(<ProductCard {...defaultProps} isAuthenticated={true} wishlistVariantIds={['variant-1']} />)

    // Кнопка избранного должна показывать "Удалить из избранного"
    const wishlistButton = screen.getByLabelText('Удалить из избранного')
    expect(wishlistButton).toBeInTheDocument()
  })

  it('should show empty heart icon when variant is not in wishlist', () => {
    render(<ProductCard {...defaultProps} isAuthenticated={true} wishlistVariantIds={[]} />)

    // Кнопка избранного должна показывать "Добавить в избранное"
    const wishlistButton = screen.getByLabelText('Добавить в избранное')
    expect(wishlistButton).toBeInTheDocument()
  })
})
