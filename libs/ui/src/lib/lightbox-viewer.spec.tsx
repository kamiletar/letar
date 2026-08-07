import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LightboxViewer } from './lightbox-viewer'

const slides = [
  { src: '/image1.jpg', alt: 'Изображение 1' },
  { src: '/image2.jpg', alt: 'Изображение 2' },
]

describe('LightboxViewer', () => {
  it('не рендерит контент, когда open=false', () => {
    render(<LightboxViewer open={false} index={0} close={vi.fn()} slides={slides} />)

    // yet-another-react-lightbox рендерит в портал (document.body), не внутрь container
    expect(document.querySelector('.yarl__root')).not.toBeInTheDocument()
  })

  it('рендерит диалог, когда open=true', () => {
    render(<LightboxViewer open={true} index={0} close={vi.fn()} slides={slides} />)

    expect(document.querySelector('.yarl__root')).toBeInTheDocument()
  })

  it('рендерит текущее изображение по index', () => {
    render(<LightboxViewer open={true} index={1} close={vi.fn()} slides={slides} />)

    const img = document.querySelector('img[src="/image2.jpg"]')
    expect(img).toBeInTheDocument()
  })

  it('не падает при пустом массиве slides', () => {
    expect(() => render(<LightboxViewer open={true} index={0} close={vi.fn()} slides={[]} />)).not.toThrow()
  })
})
