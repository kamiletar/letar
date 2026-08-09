import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { booleanMeta, dateMeta, enumMeta, numberMeta, relationMeta, textMeta } from './common-meta'
import { withUIMeta, withUIMetaDeep } from './with-ui-meta'

describe('withUIMeta', () => {
  it('adds UI metadata to simple fields', () => {
    const schema = z.object({
      firstName: z.string(),
      age: z.number(),
      isActive: z.boolean(),
    })

    const enriched = withUIMeta(schema, {
      firstName: { title: 'First Name', placeholder: 'Enter name' },
      age: { title: 'Age', fieldType: 'number' },
      isActive: { title: 'Active', fieldType: 'switch' },
    })

    // Check that metadata was added
    expect(enriched.shape.firstName.meta()).toEqual({
      ui: { title: 'First Name', placeholder: 'Enter name' },
    })
    expect(enriched.shape.age.meta()).toEqual({
      ui: { title: 'Age', fieldType: 'number' },
    })
    expect(enriched.shape.isActive.meta()).toEqual({
      ui: { title: 'Active', fieldType: 'switch' },
    })
  })

  it('does not modify fields without configuration', () => {
    const schema = z.object({
      firstName: z.string(),
      lastName: z.string(),
    })

    const enriched = withUIMeta(schema, {
      firstName: { title: 'First Name' },
      // lastName not specified
    })

    expect(enriched.shape.firstName.meta()).toEqual({ ui: { title: 'First Name' } })
    // lastName should remain without ui meta
    const lastNameMeta = enriched.shape.lastName.meta()
    expect(lastNameMeta?.ui).toBeUndefined()
  })

  it('works with enum fields', () => {
    const schema = z.object({
      role: z.enum(['ADMIN', 'USER', 'GUEST']),
    })

    const enriched = withUIMeta(schema, {
      role: {
        title: 'Role',
        fieldType: 'radioCard',
        fieldProps: {
          options: [
            { value: 'ADMIN', label: 'Administrator' },
            { value: 'USER', label: 'User' },
            { value: 'GUEST', label: 'Guest' },
          ],
        },
      },
    })

    expect(enriched.shape.role.meta()).toEqual({
      ui: {
        title: 'Role',
        fieldType: 'radioCard',
        fieldProps: {
          options: [
            { value: 'ADMIN', label: 'Administrator' },
            { value: 'USER', label: 'User' },
            { value: 'GUEST', label: 'Guest' },
          ],
        },
      },
    })
  })

  it('preserves schema validation', () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(0).max(120),
    })

    const enriched = withUIMeta(schema, {
      email: { title: 'Email' },
      age: { title: 'Age' },
    })

    // Validation should work
    expect(enriched.safeParse({ email: 'test@test.com', age: 25 }).success).toBe(true)
    expect(enriched.safeParse({ email: 'invalid', age: 25 }).success).toBe(false)
    expect(enriched.safeParse({ email: 'test@test.com', age: 150 }).success).toBe(false)
  })

  it('works with optional fields', () => {
    const schema = z.object({
      name: z.string(),
      bio: z.string().optional(),
    })

    const enriched = withUIMeta(schema, {
      name: { title: 'Name' },
      bio: { title: 'About', fieldType: 'textarea' },
    })

    expect(enriched.shape.bio.meta()).toEqual({
      ui: { title: 'About', fieldType: 'textarea' },
    })

    // Optional validation should work
    expect(enriched.safeParse({ name: 'John' }).success).toBe(true)
    expect(enriched.safeParse({ name: 'John', bio: 'Hello' }).success).toBe(true)
  })

  it('works with nullable fields', () => {
    const schema = z.object({
      phone: z.string().nullable(),
    })

    const enriched = withUIMeta(schema, {
      phone: { title: 'Phone', fieldType: 'phone' },
    })

    expect(enriched.shape.phone.meta()).toEqual({
      ui: { title: 'Phone', fieldType: 'phone' },
    })

    // Nullable validation should work
    expect(enriched.safeParse({ phone: null }).success).toBe(true)
    expect(enriched.safeParse({ phone: '+79001234567' }).success).toBe(true)
  })

  it('works with fields with default', () => {
    const schema = z.object({
      isActive: z.boolean().default(true),
    })

    const enriched = withUIMeta(schema, {
      isActive: { title: 'Active', fieldType: 'switch' },
    })

    expect(enriched.shape.isActive.meta()).toEqual({
      ui: { title: 'Active', fieldType: 'switch' },
    })

    // Default should work
    expect(enriched.parse({})).toEqual({ isActive: true })
  })

  it('works with arrays', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    })

    const enriched = withUIMeta(schema, {
      tags: { title: 'Tags', fieldType: 'tags' },
    })

    expect(enriched.shape.tags.meta()).toEqual({
      ui: { title: 'Tags', fieldType: 'tags' },
    })
  })
})

describe('withUIMetaDeep', () => {
  it('works like withUIMeta for flat schemas', () => {
    const schema = z.object({
      firstName: z.string(),
      age: z.number(),
    })

    const enriched = withUIMetaDeep(schema, {
      firstName: { title: 'First Name' },
      age: { title: 'Age' },
    })

    expect(enriched.shape.firstName.meta()).toEqual({ ui: { title: 'First Name' } })
    expect(enriched.shape.age.meta()).toEqual({ ui: { title: 'Age' } })
  })

  it('handles nested objects', () => {
    const schema = z.object({
      name: z.string(),
      address: z.object({
        city: z.string(),
        street: z.string(),
      }),
    })

    const enriched = withUIMetaDeep(schema, {
      name: { title: 'Name' },
      address: {
        _meta: { title: 'Address' },
        city: { title: 'City' },
        street: { title: 'Street' },
      },
    })

    expect(enriched.shape.name.meta()).toEqual({ ui: { title: 'Name' } })
    expect(enriched.shape.address.meta()).toEqual({ ui: { title: 'Address' } })

    // Check nested fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addressShape = (enriched.shape.address as any).shape
    expect(addressShape.city.meta()).toEqual({ ui: { title: 'City' } })
    expect(addressShape.street.meta()).toEqual({ ui: { title: 'Street' } })
  })

  it('handles nested objects without _meta', () => {
    const schema = z.object({
      address: z.object({
        city: z.string(),
      }),
    })

    const enriched = withUIMetaDeep(schema, {
      address: {
        city: { title: 'City' },
      },
    })

    // No _meta, so address itself should not have ui meta
    const addressMeta = enriched.shape.address.meta()
    expect(addressMeta?.ui).toBeUndefined()

    // But city should have it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addressShape = (enriched.shape.address as any).shape
    expect(addressShape.city.meta()).toEqual({ ui: { title: 'City' } })
  })

  it('handles optional nested objects', () => {
    const schema = z.object({
      address: z
        .object({
          city: z.string(),
        })
        .optional(),
    })

    const enriched = withUIMetaDeep(schema, {
      address: {
        _meta: { title: 'Address' },
        city: { title: 'City' },
      },
    })

    // Validation should work
    expect(enriched.safeParse({}).success).toBe(true)
    expect(enriched.safeParse({ address: { city: 'Moscow' } }).success).toBe(true)
  })

  it('handles deep nesting (2+ levels)', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        address: z.object({
          city: z.string(),
          country: z.string(),
        }),
      }),
    })

    const enriched = withUIMetaDeep(schema, {
      user: {
        _meta: { title: 'User' },
        name: { title: 'Name' },
        address: {
          _meta: { title: 'Address' },
          city: { title: 'City' },
          country: { title: 'Country' },
        },
      },
    })

    expect(enriched.shape.user.meta()).toEqual({ ui: { title: 'User' } })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userShape = (enriched.shape.user as any).shape
    expect(userShape.name.meta()).toEqual({ ui: { title: 'Name' } })
    expect(userShape.address.meta()).toEqual({ ui: { title: 'Address' } })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addressShape = (userShape.address as any).shape
    expect(addressShape.city.meta()).toEqual({ ui: { title: 'City' } })
    expect(addressShape.country.meta()).toEqual({ ui: { title: 'Country' } })
  })

  it('preserves validation in nested objects', () => {
    const schema = z.object({
      address: z.object({
        city: z.string().min(2),
        zip: z.string().length(6),
      }),
    })

    const enriched = withUIMetaDeep(schema, {
      address: {
        city: { title: 'City' },
        zip: { title: 'Zip Code' },
      },
    })

    expect(enriched.safeParse({ address: { city: 'Moscow', zip: '123456' } }).success).toBe(true)
    expect(enriched.safeParse({ address: { city: 'M', zip: '123456' } }).success).toBe(false)
    expect(enriched.safeParse({ address: { city: 'Moscow', zip: '123' } }).success).toBe(false)
  })
})

describe('common-meta helpers', () => {
  describe('enumMeta', () => {
    it('creates metadata with labels', () => {
      const meta = enumMeta({
        title: 'Role',
        labels: {
          ADMIN: 'Administrator',
          USER: 'User',
        },
      })

      expect(meta).toEqual({
        title: 'Role',
        description: undefined,
        fieldType: 'nativeSelect',
        fieldProps: {
          options: [
            { value: 'ADMIN', label: 'Administrator' },
            { value: 'USER', label: 'User' },
          ],
        },
      })
    })

    it('creates metadata with options', () => {
      const meta = enumMeta({
        title: 'Priority',
        fieldType: 'radioCard',
        options: [
          { value: 'LOW', label: 'Low', description: 'Do it sometime' },
          { value: 'HIGH', label: 'High', description: 'Urgent!' },
        ],
      })

      expect(meta).toEqual({
        title: 'Priority',
        description: undefined,
        fieldType: 'radioCard',
        fieldProps: {
          options: [
            { value: 'LOW', label: 'Low', description: 'Do it sometime' },
            { value: 'HIGH', label: 'High', description: 'Urgent!' },
          ],
        },
      })
    })
  })

  describe('relationMeta', () => {
    it('creates metadata for relation', () => {
      const meta = relationMeta({
        title: 'Category',
        model: 'Category',
        labelField: 'name',
      })

      expect(meta).toEqual({
        title: 'Category',
        fieldType: 'select',
        fieldProps: {
          relation: {
            model: 'Category',
            labelField: 'name',
            valueField: 'id',
          },
        },
      })
    })

    it('supports custom valueField', () => {
      const meta = relationMeta({
        title: 'Category',
        model: 'Category',
        labelField: 'name',
        valueField: 'slug',
      })

      expect(meta.fieldProps?.relation).toEqual({
        model: 'Category',
        labelField: 'name',
        valueField: 'slug',
      })
    })

    it('supports custom fieldType', () => {
      const meta = relationMeta({
        title: 'Category',
        model: 'Category',
        labelField: 'name',
        fieldType: 'combobox',
      })

      expect(meta).toEqual({
        title: 'Category',
        fieldType: 'combobox',
        fieldProps: {
          relation: {
            model: 'Category',
            labelField: 'name',
            valueField: 'id',
          },
        },
      })
    })

    it('supports all selection field types', () => {
      const fieldTypes = ['select', 'nativeSelect', 'radioGroup', 'radioCard', 'listbox'] as const

      for (const fieldType of fieldTypes) {
        const meta = relationMeta({
          title: 'Test',
          model: 'Test',
          labelField: 'name',
          fieldType,
        })

        expect(meta.fieldType).toBe(fieldType)
      }
    })

    it('combines fieldType with fieldProps', () => {
      const meta = relationMeta({
        title: 'Category',
        model: 'Category',
        labelField: 'name',
        fieldType: 'radioCard',
        fieldProps: { columns: 2 },
      })

      expect(meta).toEqual({
        title: 'Category',
        fieldType: 'radioCard',
        fieldProps: {
          relation: {
            model: 'Category',
            labelField: 'name',
            valueField: 'id',
          },
          columns: 2,
        },
      })
    })
  })

  describe('textMeta', () => {
    it('creates metadata for text field', () => {
      const meta = textMeta({
        title: 'Name',
        placeholder: 'Enter name',
      })

      expect(meta).toEqual({
        title: 'Name',
        placeholder: 'Enter name',
        description: undefined,
        fieldType: 'string',
        fieldProps: undefined,
      })
    })

    it('supports different fieldType', () => {
      const meta = textMeta({
        title: 'About',
        fieldType: 'richText',
      })

      expect(meta.fieldType).toBe('richText')
    })
  })

  describe('numberMeta', () => {
    it('creates metadata for number field', () => {
      const meta = numberMeta({
        title: 'Age',
        min: 0,
        max: 120,
      })

      expect(meta).toEqual({
        title: 'Age',
        description: undefined,
        fieldType: 'number',
        fieldProps: { min: 0, max: 120 },
      })
    })

    it('supports currency', () => {
      const meta = numberMeta({
        title: 'Price',
        fieldType: 'currency',
        currency: 'RUB',
      })

      expect(meta.fieldType).toBe('currency')
      expect(meta.fieldProps?.currency).toBe('RUB')
    })

    it('supports rating', () => {
      const meta = numberMeta({
        title: 'Rating',
        fieldType: 'rating',
        count: 5,
      })

      expect(meta.fieldType).toBe('rating')
      expect(meta.fieldProps?.count).toBe(5)
    })
  })

  describe('booleanMeta', () => {
    it('creates metadata for checkbox', () => {
      const meta = booleanMeta({
        title: 'Agreed',
      })

      expect(meta).toEqual({
        title: 'Agreed',
        description: undefined,
        fieldType: 'checkbox',
        fieldProps: undefined,
      })
    })

    it('creates metadata for switch', () => {
      const meta = booleanMeta({
        title: 'Active',
        fieldType: 'switch',
        description: 'Enable notifications',
      })

      expect(meta).toEqual({
        title: 'Active',
        description: 'Enable notifications',
        fieldType: 'switch',
        fieldProps: undefined,
      })
    })
  })

  describe('dateMeta', () => {
    it('creates metadata for date', () => {
      const meta = dateMeta({
        title: 'Date of Birth',
      })

      expect(meta).toEqual({
        title: 'Date of Birth',
        description: undefined,
        fieldType: 'date',
        fieldProps: {},
      })
    })

    it('supports dateTimePicker', () => {
      const meta = dateMeta({
        title: 'Appointment',
        fieldType: 'dateTimePicker',
      })

      expect(meta.fieldType).toBe('dateTimePicker')
    })

    it('supports min/max', () => {
      const meta = dateMeta({
        title: 'Duration',
        fieldType: 'duration',
        min: 15,
        max: 480,
      })

      expect(meta.fieldProps).toEqual({ min: 15, max: 480 })
    })
  })
})

describe('withUIMeta integration with helpers', () => {
  it('works with enumMeta', () => {
    const schema = z.object({
      role: z.enum(['ADMIN', 'USER']),
    })

    const enriched = withUIMeta(schema, {
      role: enumMeta({
        title: 'Role',
        fieldType: 'radioCard',
        labels: { ADMIN: 'Administrator', USER: 'User' },
      }),
    })

    const meta = enriched.shape.role.meta()
    expect(meta.ui.title).toBe('Role')
    expect(meta.ui.fieldType).toBe('radioCard')
    expect(meta.ui.fieldProps.options).toHaveLength(2)
  })

  it('works with relationMeta', () => {
    const schema = z.object({
      categoryId: z.string(),
    })

    const enriched = withUIMeta(schema, {
      categoryId: relationMeta({
        title: 'Category',
        model: 'Category',
        labelField: 'name',
      }),
    })

    const meta = enriched.shape.categoryId.meta()
    expect(meta.ui.title).toBe('Category')
    expect(meta.ui.fieldType).toBe('select')
    expect(meta.ui.fieldProps.relation.model).toBe('Category')
  })

  it('works with combination of helpers', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      isActive: z.boolean(),
      role: z.enum(['ADMIN', 'USER']),
      birthDate: z.date().optional(),
    })

    const enriched = withUIMeta(schema, {
      name: textMeta({ title: 'Name', placeholder: 'Enter name' }),
      age: numberMeta({ title: 'Age', min: 0, max: 120 }),
      isActive: booleanMeta({ title: 'Active', fieldType: 'switch' }),
      role: enumMeta({
        title: 'Role',
        labels: { ADMIN: 'Admin', USER: 'User' },
      }),
      birthDate: dateMeta({ title: 'Date of Birth' }),
    })

    expect(enriched.shape.name.meta().ui.title).toBe('Name')
    expect(enriched.shape.age.meta().ui.fieldProps.min).toBe(0)
    expect(enriched.shape.isActive.meta().ui.fieldType).toBe('switch')
    expect(enriched.shape.role.meta().ui.fieldProps.options).toHaveLength(2)
    expect(enriched.shape.birthDate.meta().ui.fieldType).toBe('date')
  })
})
