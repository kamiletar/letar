'use client'

import { VStack } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import { Fragment } from 'react'
import { resolveFieldType, SchemaFieldWithRelations } from './field-type-mapper'
import { useDeclarativeForm } from './form-context'
import { FormGroupDeclarative } from './form-group/form-group-declarative'
import { ListButtonAdd, ListButtonRemove } from './form-group/form-group-list-buttons'
import { FormGroupListDeclarative } from './form-group/form-group-list-declarative'
import { filterFields, type SchemaFieldInfo, traverseSchema } from './schema-traversal'

/**
 * Props for Form.AutoFields
 */
export interface AutoFieldsProps {
  /**
   * Include only specified fields (by name)
   * @example include={['firstName', 'lastName']}
   */
  include?: string[]
  /**
   * Exclude specified fields (by name)
   * @example exclude={['id', 'createdAt']}
   */
  exclude?: string[]
  /**
   * Recursively generate nested objects
   * @default true
   */
  recursive?: boolean
  /**
   * Custom wrapper for each field
   * @example fieldWrapper={({ name, children }) => <Box key={name} mb={4}>{children}</Box>}
   */
  fieldWrapper?: (props: { name: string; children: ReactNode }) => ReactElement
}

/**
 * Render a field or group based on SchemaFieldInfo
 */
function renderField(
  field: SchemaFieldInfo,
  recursive: boolean,
  fieldWrapper?: (props: { name: string; children: ReactNode }) => ReactElement
): ReactElement {
  const { name, zodType, ui } = field

  // Handle nested objects
  if (zodType === 'object' && field.children && recursive) {
    const content = (
      <FormGroupDeclarative key={name} name={name}>
        {field.children.map((child) => renderField(child, recursive, fieldWrapper))}
      </FormGroupDeclarative>
    )
    return fieldWrapper ? fieldWrapper({ name, children: content }) : content
  }

  // Handle object arrays
  if (zodType === 'array' && field.element?.zodType === 'object' && field.element.children) {
    const elementChildren = field.element.children
    const content = (
      <FormGroupListDeclarative
        key={name}
        name={name}
        emptyContent={<EmptyArrayContent label={ui?.title ?? name} />}
        wrapper={({ children }) => (
          <VStack align="stretch" gap={2}>
            {children}
            <ListButtonAdd defaultValue={createDefaultValue(elementChildren)}>Add</ListButtonAdd>
          </VStack>
        )}
      >
        <VStack align="stretch" gap={2} p={2} borderWidth={1} borderRadius="md">
          {elementChildren.map((child) => renderField(child, recursive, fieldWrapper))}
          <ListButtonRemove>Remove</ListButtonRemove>
        </VStack>
      </FormGroupListDeclarative>
    )
    return fieldWrapper ? fieldWrapper({ name, children: content }) : content
  }

  // Handle primitive arrays -> Tags
  if (zodType === 'array' && field.element?.zodType === 'string') {
    const fieldType = resolveFieldType(field)
    if (fieldType === 'tags') {
      const content = <SchemaFieldWithRelations key={name} field={field} />
      return fieldWrapper ? fieldWrapper({ name, children: content }) : content
    }
  }

  // Regular field (with relation options support from RelationFieldProvider)
  const content = <SchemaFieldWithRelations key={name} field={field} />
  return fieldWrapper ? fieldWrapper({ name, children: content }) : content
}

/**
 * Component for empty array
 */
function EmptyArrayContent({ label }: { label: string }): ReactElement {
  return (
    <VStack py={4} color="fg.muted">
      No items in &quot;{label}&quot;
    </VStack>
  )
}

/**
 * Create default value for an object array element
 */
function createDefaultValue(children: SchemaFieldInfo[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const child of children) {
    switch (child.zodType) {
      case 'string':
        result[child.name] = ''
        break
      case 'number':
      case 'int':
      case 'float':
      case 'bigint':
        result[child.name] = 0
        break
      case 'boolean':
        result[child.name] = false
        break
      case 'array':
        result[child.name] = []
        break
      case 'object':
        if (child.children) {
          result[child.name] = createDefaultValue(child.children)
        } else {
          result[child.name] = {}
        }
        break
      default:
        result[child.name] = undefined
    }
  }

  return result
}

/**
 * Form.AutoFields — automatic field generation from Zod schema
 *
 * The component reads the Zod schema from Form context and automatically generates
 * fields based on schema types and metadata.
 *
 * @example All fields
 * ```tsx
 * <Form schema={Schema} initialValue={data} onSubmit={save}>
 *   <Form.AutoFields />
 *   <Form.Button.Submit>Save</Form.Button.Submit>
 * </Form>
 * ```
 *
 * @example With filtering
 * ```tsx
 * <Form schema={Schema} initialValue={data} onSubmit={save}>
 *   <HStack>
 *     <Form.AutoFields include={['firstName', 'lastName']} />
 *   </HStack>
 *   <Form.AutoFields exclude={['firstName', 'lastName']} />
 *   <Form.Button.Submit />
 * </Form>
 * ```
 *
 * @example With custom wrapper
 * ```tsx
 * <Form.AutoFields fieldWrapper={({ name, children }) => (
 *   <Box key={name} mb={4}>{children}</Box>
 * )} />
 * ```
 */
export function FormAutoFields({ include, exclude, recursive = true, fieldWrapper }: AutoFieldsProps): ReactElement {
  const { schema } = useDeclarativeForm()

  if (!schema) {
    throw new Error('Form.AutoFields requires schema prop on Form component')
  }

  // Traverse schema and get field information
  const allFields = traverseSchema(schema)

  // Filter fields
  const fields = filterFields(allFields, { include, exclude })

  return <Fragment>{fields.map((field) => renderField(field, recursive, fieldWrapper))}</Fragment>
}

FormAutoFields.displayName = 'FormAutoFields'
