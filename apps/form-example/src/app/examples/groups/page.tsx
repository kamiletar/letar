'use client'

/**
 * Вложенные объекты, динамические массивы, sortable drag&drop и вложенные массивы.
 * Статья: https://forms.letar.best/docs/guides/groups
 */

import { Card, Heading, Separator, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

// --- 1. Базовый пример: вложенный объект + динамический массив ---

const BasicSchema = z.object({
  address: z.object({
    city: z.string().meta({ ui: { title: 'City', placeholder: 'New York' } }),
    street: z.string().meta({ ui: { title: 'Street', placeholder: '123 Main St' } }),
    zip: z.string().meta({ ui: { title: 'ZIP', placeholder: '10001' } }),
  }),
  contacts: z.array(
    z.object({
      name: z.string().meta({ ui: { title: 'Contact Name' } }),
      phone: z.string().meta({ ui: { title: 'Phone Number' } }),
    }),
  ),
})

// --- 2. Sortable массив: навыки с drag&drop ---

const SortableSchema = z.object({
  skills: z.array(
    z.object({
      title: z.string().meta({ ui: { title: 'Skill', placeholder: 'e.g. TypeScript' } }),
      level: z.enum(['junior', 'middle', 'senior']).meta({ ui: { title: 'Level' } }),
    }),
  ),
})

const levelOptions = [
  { value: 'junior', label: 'Junior' },
  { value: 'middle', label: 'Middle' },
  { value: 'senior', label: 'Senior' },
]

// --- 3. Вложенные массивы: Course → Modules → Lessons ---

const NestedSchema = z.object({
  courseName: z.string().meta({ ui: { title: 'Course Name', placeholder: 'e.g. React Fundamentals' } }),
  modules: z.array(
    z.object({
      title: z.string().meta({ ui: { title: 'Module Title' } }),
      lessons: z.array(
        z.object({
          title: z.string().meta({ ui: { title: 'Lesson Title' } }),
          duration: z.string().meta({ ui: { title: 'Duration (min)' } }),
        }),
      ),
    }),
  ),
})

export default function GroupsPage() {
  return (
    <Stack gap={8}>
      <div>
        <Heading size="lg">Groups &amp; Arrays</Heading>
        <Text color="fg.muted">
          Nested objects, dynamic arrays with Add/Remove, sortable drag&amp;drop, and nested arrays.
        </Text>
      </div>

      {/* === 1. Базовый: вложенный объект + динамический массив === */}
      <Card.Root p={5}>
        <Card.Body>
          <Heading size="md" mb={4}>
            1. Nested Object + Dynamic Array
          </Heading>

          <Form
            schema={BasicSchema}
            initialValue={{
              address: { city: '', street: '', zip: '' },
              contacts: [{ name: '', phone: '' }],
            }}
            onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
          >
            <Stack gap={6}>
              <div>
                <Heading size="sm" mb={3}>
                  Address (Nested Object)
                </Heading>
                <Form.Group name="address">
                  <Stack gap={3}>
                    <Form.Field.String name="city" />
                    <Form.Field.String name="street" />
                    <Form.Field.String name="zip" />
                  </Stack>
                </Form.Group>
              </div>

              <div>
                <Heading size="sm" mb={3}>
                  Contacts (Dynamic Array)
                </Heading>
                <Form.Group.List name="contacts">
                  <Stack gap={3}>
                    <Form.Field.String name="name" />
                    <Form.Field.Phone name="phone" />
                  </Stack>
                  <Form.Group.List.Button.Add>+ Add Contact</Form.Group.List.Button.Add>
                </Form.Group.List>
              </div>

              <Form.DebugValues showInProduction />
              <Form.Button.Submit>Submit</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>

      <Separator />

      {/* === 2. Sortable: drag&drop с DragHandle === */}
      <Card.Root p={5}>
        <Card.Body>
          <Heading size="md" mb={2}>
            2. Sortable Array (Drag &amp; Drop)
          </Heading>
          <Text color="fg.muted" mb={4}>
            Перетаскивайте элементы за ручку ≡ для изменения порядка.
          </Text>

          <Form
            schema={SortableSchema}
            initialValue={{
              skills: [
                { title: 'TypeScript', level: 'senior' },
                { title: 'React', level: 'middle' },
                { title: 'Node.js', level: 'junior' },
              ],
            }}
            onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
          >
            <Stack gap={4}>
              <Form.Group.List name="skills" sortable>
                <Stack gap={3} direction="row" align="center">
                  <Form.Group.List.Button.DragHandle />
                  <Form.Field.String name="title" />
                  <Form.Field.Select name="level" options={levelOptions} />
                  <Form.Group.List.Button.Remove />
                </Stack>
              </Form.Group.List>

              <Form.DebugValues showInProduction />
              <Form.Button.Submit>Submit</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>

      <Separator />

      {/* === 3. Вложенные массивы: Course → Modules → Lessons === */}
      <Card.Root p={5}>
        <Card.Body>
          <Heading size="md" mb={2}>
            3. Nested Arrays (Course → Modules → Lessons)
          </Heading>
          <Text color="fg.muted" mb={4}>
            Два уровня вложенности: каждый модуль содержит массив уроков.
          </Text>

          <Form
            schema={NestedSchema}
            initialValue={{
              courseName: 'React Fundamentals',
              modules: [
                {
                  title: 'Getting Started',
                  lessons: [
                    { title: 'What is React?', duration: '15' },
                    { title: 'JSX Basics', duration: '20' },
                  ],
                },
              ],
            }}
            onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
          >
            <Stack gap={4}>
              <Form.Field.String name="courseName" />

              <Form.Group.List name="modules">
                <Card.Root variant="outline" p={4}>
                  <Card.Body>
                    <Stack gap={3}>
                      <Form.Field.String name="title" />

                      <Text fontWeight="medium" fontSize="sm" color="fg.muted">
                        Lessons:
                      </Text>
                      <Form.Group.List name="lessons">
                        <Stack gap={2} direction="row" align="center">
                          <Form.Field.String name="title" />
                          <Form.Field.String name="duration" />
                          <Form.Group.List.Button.Remove />
                        </Stack>
                        <Form.Group.List.Button.Add>+ Add Lesson</Form.Group.List.Button.Add>
                      </Form.Group.List>
                    </Stack>
                  </Card.Body>
                </Card.Root>
                <Form.Group.List.Button.Add>+ Add Module</Form.Group.List.Button.Add>
              </Form.Group.List>

              <Form.DebugValues showInProduction />
              <Form.Button.Submit>Submit</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>
    </Stack>
  )
}
