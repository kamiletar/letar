// Полифилы для jsdom
import { vi } from 'vitest'

// structuredClone полифил
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = <T,>(obj: T): T => {
    if (obj === undefined) {
      return undefined as T
    }
    return JSON.parse(JSON.stringify(obj))
  }
}

import '@testing-library/jest-dom/vitest'

// Мок next/script — рендерит обычный <script>-элемент с переданными пропсами,
// чтобы можно было проверить src/data-website-id через container.querySelector
vi.mock('next/script', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ strategy: _strategy, ...props }: any) => <script {...props} />,
}))
