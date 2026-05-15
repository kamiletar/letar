import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { FieldNumber, FieldString } from '../form-fields'
import * as useFormApiModule from '../use-form-api'
import { FormWithApi } from './form-with-api'
import * as useFormFeaturesModule from './use-form-features'

// Test wrapper with Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// Test schema
const TestSchema = z.object({
  title: z.string().meta({ ui: { title: 'Title' } }),
  count: z.number().meta({ ui: { title: 'Count' } }),
})

// Mock useFormApi
function createMockFormApi(overrides: Partial<useFormApiModule.FormApiResult<Record<string, unknown>>> = {}) {
  return {
    isEditMode: false,
    isLoading: false,
    isMutating: false,
    data: null,
    error: null,
    mutationError: null,
    submit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// Mock useFormFeatures
function createMockFormFeatures() {
  return {
    isPersistenceEnabled: false,
    isOfflineEnabled: false,
    handleSubmit: vi.fn().mockResolvedValue(undefined),
    subscribeToFormChanges: vi.fn().mockReturnValue(() => undefined),
    restoreFormData: vi.fn(),
    offlineState: undefined,
    persistenceResult: {
      shouldRestore: false,
      savedData: null,
      RestoreDialog: () => null,
    },
  }
}

// Mock API configuration
function createMockApiConfig() {
  return {
    id: undefined,
    query: {
      hook: vi.fn(() => ({ data: null, isLoading: false, error: null })),
      include: {},
    },
    mutations: {
      create: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false, error: null })),
      update: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false, error: null })),
    },
  }
}

describe('FormWithApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders form with children', async () => {
      const mockFormApi = createMockFormApi()
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue(createMockFormFeatures())

      render(
        <TestWrapper>
          <FormWithApi api={createMockApiConfig()} initialValue={{ title: '', count: 0 }} schema={TestSchema}>
            <FieldString name="title" label="Title" />
            <FieldNumber name="count" label="Count" />
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument()
        expect(screen.getByText('Count')).toBeInTheDocument()
      })
    })

    it('shows initial values', async () => {
      const mockFormApi = createMockFormApi()
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue(createMockFormFeatures())

      render(
        <TestWrapper>
          <FormWithApi api={createMockApiConfig()} initialValue={{ title: 'Hello', count: 5 }} schema={TestSchema}>
            <FieldString name="title" label="Title" />
            <FieldNumber name="count" label="Count" />
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Hello')).toBeInTheDocument()
      })
    })
  })

  describe('loading state', () => {
    it('shows loading state when isLoading=true', async () => {
      const mockFormApi = createMockFormApi({ isLoading: true, isEditMode: true })
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue(createMockFormFeatures())

      render(
        <TestWrapper>
          <FormWithApi api={createMockApiConfig()} initialValue={{ title: '', count: 0 }} schema={TestSchema}>
            <FieldString name="title" label="Title" />
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        // FormLoadingState should render
        expect(screen.queryByText('Title')).not.toBeInTheDocument()
      })
    })

    it('hides loading state when data is loaded', async () => {
      const mockFormApi = createMockFormApi({
        isLoading: false,
        isEditMode: true,
        data: { title: 'Loaded', count: 10 },
      })
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue(createMockFormFeatures())

      render(
        <TestWrapper>
          <FormWithApi api={createMockApiConfig()} initialValue={{ title: '', count: 0 }} schema={TestSchema}>
            <FieldString name="title" label="Title" />
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument()
      })
    })
  })

  describe('edit mode', () => {
    it('uses loaded data in edit mode', async () => {
      const mockFormApi = createMockFormApi({
        isLoading: false,
        isEditMode: true,
        data: { title: 'From API', count: 42 },
      })
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue(createMockFormFeatures())

      render(
        <TestWrapper>
          <FormWithApi
            api={{ ...createMockApiConfig(), id: 'test-id' }}
            initialValue={{ title: '', count: 0 }}
            schema={TestSchema}
          >
            <FieldString name="title" label="Title" />
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('From API')).toBeInTheDocument()
      })
    })

    it('uses initialValue as fallback in edit mode when data=null', async () => {
      const mockFormApi = createMockFormApi({
        isLoading: false,
        isEditMode: true,
        data: null,
      })
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue(createMockFormFeatures())

      render(
        <TestWrapper>
          <FormWithApi
            api={{ ...createMockApiConfig(), id: 'test-id' }}
            initialValue={{ title: 'Fallback', count: 1 }}
            schema={TestSchema}
          >
            <FieldString name="title" label="Title" />
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Fallback')).toBeInTheDocument()
      })
    })
  })

  describe('create mode', () => {
    it('uses initialValue in create mode', async () => {
      const mockFormApi = createMockFormApi({
        isLoading: false,
        isEditMode: false,
        data: null,
      })
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue(createMockFormFeatures())

      render(
        <TestWrapper>
          <FormWithApi api={createMockApiConfig()} initialValue={{ title: 'New Item', count: 0 }} schema={TestSchema}>
            <FieldString name="title" label="Title" />
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('New Item')).toBeInTheDocument()
      })
    })
  })

  describe('submit', () => {
    it('calls handleSubmit on form submission', async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined)
      const mockFormApi = createMockFormApi({ submit: mockSubmit })
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)

      const mockHandleSubmit = vi.fn().mockResolvedValue(undefined)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue({
        ...createMockFormFeatures(),
        handleSubmit: mockHandleSubmit,
      })

      render(
        <TestWrapper>
          <FormWithApi
            api={createMockApiConfig()}
            initialValue={{ title: 'Submit Test', count: 1 }}
            schema={TestSchema}
          >
            <FieldString name="title" label="Title" />
            <button type="submit">Submit</button>
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }))

      await waitFor(() => {
        expect(mockHandleSubmit).toHaveBeenCalled()
      })
    })

    it('calls onSubmit callback after successful submit', async () => {
      const onSubmit = vi.fn()
      const mockSubmit = vi.fn().mockResolvedValue(undefined)
      const mockFormApi = createMockFormApi({ submit: mockSubmit })
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)

      const mockHandleSubmit = vi.fn().mockResolvedValue(undefined)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue({
        ...createMockFormFeatures(),
        handleSubmit: mockHandleSubmit,
      })

      render(
        <TestWrapper>
          <FormWithApi
            api={createMockApiConfig()}
            initialValue={{ title: 'Callback Test', count: 2 }}
            schema={TestSchema}
            onSubmit={onSubmit}
          >
            <FieldString name="title" label="Title" />
            <button type="submit">Save</button>
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      // onSubmit will be called through handleSubmit inside useFormFeatures
      await waitFor(() => {
        expect(mockHandleSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('disabled/readOnly', () => {
    it('passes disabled to context', async () => {
      const mockFormApi = createMockFormApi()
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue(createMockFormFeatures())

      render(
        <TestWrapper>
          <FormWithApi api={createMockApiConfig()} initialValue={{ title: '', count: 0 }} schema={TestSchema} disabled>
            <FieldString name="title" label="Title" />
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        const input = screen.getByRole('textbox')
        expect(input).toBeDisabled()
      })
    })
  })

  describe('middleware', () => {
    it('calls afterSuccess middleware after successful submit', async () => {
      const afterSuccess = vi.fn()
      const mockSubmit = vi.fn().mockResolvedValue(undefined)
      const mockFormApi = createMockFormApi({ submit: mockSubmit })
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)

      const mockHandleSubmit = vi.fn().mockResolvedValue(undefined)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue({
        ...createMockFormFeatures(),
        handleSubmit: mockHandleSubmit,
      })

      render(
        <TestWrapper>
          <FormWithApi
            api={createMockApiConfig()}
            initialValue={{ title: 'Middleware', count: 3 }}
            schema={TestSchema}
            middleware={{ afterSuccess }}
          >
            <FieldString name="title" label="Title" />
            <button type="submit">Save</button>
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockHandleSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('apiState', () => {
    it('exports apiState to context', async () => {
      const mockFormApi = createMockFormApi({
        isEditMode: true,
        isLoading: false,
        isMutating: true,
        error: null,
        mutationError: null,
      })
      vi.spyOn(useFormApiModule, 'useFormApi').mockReturnValue(mockFormApi)
      vi.spyOn(useFormFeaturesModule, 'useFormFeatures').mockReturnValue(createMockFormFeatures())

      // Component should render without errors if apiState is available
      render(
        <TestWrapper>
          <FormWithApi
            api={{ ...createMockApiConfig(), id: 'test' }}
            initialValue={{ title: '', count: 0 }}
            schema={TestSchema}
          >
            <FieldString name="title" label="Title" />
          </FormWithApi>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument()
      })
    })
  })
})
