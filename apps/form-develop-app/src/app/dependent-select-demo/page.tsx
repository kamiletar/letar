'use client'

import {
  useCreateCompany,
  useCreateEmployee,
  useFindManyCompany,
  useFindManyEmployee,
  useFindUniqueEmployee,
} from '@/lib/hooks'
import { Box, Button, Code, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useZenStackOptions } from '@letar/forms-query/zenstack'
import { useRef, useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Зависимые (каскадные) селекты — этап З (`libs/forms/PLAN.md` §18): `dependsOn` — свойство обычных
 * `Form.Field.Select` и `Form.Field.Combobox`, а `deps` доходит во все загрузчики и в `onCreate`.
 */

interface GeoRecord {
  id: string
  name: string
}

/** Запрос справочника «страна → регион → город» (`/api/dependent-geo`): настоящий HTTP, чтобы e2e считал и задерживал */
async function fetchGeo(
  kind: 'countries' | 'regions' | 'cities',
  parent: string,
  search: string,
  signal: AbortSignal,
): Promise<GeoRecord[]> {
  const query = new URLSearchParams({ kind, parent, search })
  const response = await fetch(`/api/dependent-geo?${query.toString()}`, { signal })
  return (await response.json()) as GeoRecord[]
}

const getLabel = (record: GeoRecord) => record.name
const getValue = (record: GeoRecord) => record.id
const toOption = (record: GeoRecord) => ({ label: record.name, value: record.id })

/** Загрузчик опций `Select`: запись справочника → `{ label, value }` */
async function loadGeoOptions(kind: 'countries' | 'regions', parent: string, signal: AbortSignal) {
  return (await fetchGeo(kind, parent, '', signal)).map(toOption)
}

const AddressSchema = z
  .object({
    countryId: z.string().meta({ ui: { title: 'Страна' } }),
    regionId: z.string().meta({ ui: { title: 'Регион' } }),
    cityId: z.string().meta({ ui: { title: 'Город' } }),
  })
  .strip()

type AddressData = z.infer<typeof AddressSchema>

const emptyAddress: AddressData = { countryId: '', regionId: '', cityId: '' }

/** Цепочка страна → регион → город. Запросы городов считаются: при пустом регионе счётчик не растёт */
function GeoChain({ storageKey }: { storageKey?: string }) {
  const cityRequests = useRef(0)
  const [cityRequestCount, setCityRequestCount] = useState(0)
  const [submitted, setSubmitted] = useState<AddressData | null>(null)

  return (
    <>
      <Form
        schema={AddressSchema}
        initialValue={storageKey ? { countryId: 'RU', regionId: 'RU-MOW', cityId: 'msk' } : emptyAddress}
        onSubmit={setSubmitted}
        persistence={storageKey
          ? {
            key: storageKey,
            debounceMs: 100,
            dialogTitle: 'Восстановить черновик?',
            dialogDescription: 'Найден несохранённый черновик адреса.',
            restoreButtonText: 'Восстановить',
            discardButtonText: 'Начать заново',
          }
          : undefined}
      >
        <VStack gap={4} align="stretch">
          <Form.Field.Select
            name="countryId"
            loadOptions={(_search, { signal }) => loadGeoOptions('countries', '', signal)}
          />
          <Form.Field.Select
            name="regionId"
            dependsOn="countryId"
            loadOptions={(_search, { signal, deps }) => loadGeoOptions('regions', String(deps.countryId), signal)}
          />
          <Form.Field.Combobox
            name="cityId"
            dependsOn="regionId"
            minChars={0}
            loadOptions={(search, { signal, deps }) => {
              cityRequests.current += 1
              setCityRequestCount(cityRequests.current)
              return fetchGeo('cities', String(deps.regionId), search, signal)
            }}
            loadSelected={async (value, { signal, deps }) => {
              const found = await fetchGeo('cities', String(deps.regionId), '', signal)
              return found.find((city) => city.id === value) ?? null
            }}
            getLabel={getLabel}
            getValue={getValue}
          />
          <Text data-testid="city-requests" fontSize="sm" color="fg.muted">
            Запросов городов: {cityRequestCount}
          </Text>
          <Form.Button.Submit>Сохранить адрес</Form.Button.Submit>
        </VStack>
      </Form>
      <SubmittedDataPreview data={submitted} />
    </>
  )
}

const EmployeeSchema = z
  .object({
    companyId: z.string().meta({ ui: { title: 'Компания' } }),
    employeeId: z.string().meta({ ui: { title: 'Сотрудник' } }),
  })
  .strip()

interface EmployeeRecord {
  id: string
  name: string
}

interface CompanyRecord {
  id: string
  name: string
  $optimistic?: boolean
}

const mapCompany = (company: CompanyRecord) => ({ label: company.name, value: company.id })

/** `useQuery` Combobox: сотрудники выбранной компании; компания приходит третьим аргументом — `deps` */
function useCompanyEmployees(search: string, deps: { companyId?: unknown }) {
  return useFindManyEmployee(
    {
      where: { companyId: String(deps.companyId ?? ''), name: { contains: search, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: 20,
    },
    { enabled: !!deps.companyId },
  ) as { data?: EmployeeRecord[]; isLoading?: boolean }
}

function useSelectedEmployee(id: string) {
  return useFindUniqueEmployee({ where: { id } }, { enabled: !!id }) as {
    data?: EmployeeRecord | null
    isLoading?: boolean
  }
}

/** Компания → сотрудник на ZenStack: поиск с `deps`, создание сотрудника получает компанию из `ctx.deps` */
function CompanyEmployee() {
  const companies = useFindManyCompany({ orderBy: { name: 'asc' } })
  const companyOptions = useZenStackOptions(
    companies as { data?: CompanyRecord[]; isLoading?: boolean },
    mapCompany,
  )
  const createCompany = useCreateCompany()
  const createEmployee = useCreateEmployee()
  const [createdFor, setCreatedFor] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<unknown>(null)

  const seed = async () => {
    await createCompany.mutateAsync({
      data: { name: 'Ромашка', employees: { create: [{ name: 'Анна Иванова' }, { name: 'Пётр Сидоров' }] } },
    })
    await createCompany.mutateAsync({
      data: { name: 'Василёк', employees: { create: [{ name: 'Олег Петров' }, { name: 'Мария Кузнецова' }] } },
    })
  }

  return (
    <>
      <HStack mb={4}>
        <Button size="sm" variant="outline" onClick={() => void seed()} data-testid="seed-companies">
          Заполнить демо-данные
        </Button>
      </HStack>
      <Form
        schema={EmployeeSchema}
        initialValue={{ companyId: '', employeeId: '' }}
        onSubmit={setSubmitted}
      >
        <VStack gap={4} align="stretch">
          <Form.Field.Select name="companyId" {...companyOptions.fieldProps} />
          <Form.Field.Combobox
            name="employeeId"
            dependsOn="companyId"
            minChars={0}
            useQuery={useCompanyEmployees}
            useSelected={useSelectedEmployee}
            getLabel={(employee: EmployeeRecord) => employee.name}
            getValue={(employee: EmployeeRecord) => employee.id}
            onCreate={async (search, { deps }) => {
              const name = window.prompt('Имя сотрудника', search)
              if (!name?.trim()) {
                return null
              }
              const companyId = String(deps.companyId)
              setCreatedFor(companyId)
              const created = (await createEmployee.mutateAsync({ data: { name: name.trim(), companyId } })) as
                | EmployeeRecord
                | null
              return created ? { label: created.name, value: created.id, data: created } : null
            }}
          />
          <Text data-testid="created-for" fontSize="sm" color="fg.muted">
            Окно создания получило компанию: {createdFor ?? '—'}
          </Text>
          <Form.Button.Submit>Сохранить</Form.Button.Submit>
        </VStack>
      </Form>
      <SubmittedDataPreview data={submitted} />
    </>
  )
}

const RowsSchema = z
  .object({
    countryId: z.string().meta({ ui: { title: 'Страна доставки' } }),
    stops: z.array(z.object({ regionId: z.string().meta({ ui: { title: 'Регион остановки' } }) })),
  })
  .strip()

/** Строки массива: у каждой строки регион зависит от поля формы верхнего уровня — `dependsOn="/countryId"` */
function RowsWithRootParent() {
  const [submitted, setSubmitted] = useState<unknown>(null)
  return (
    <>
      <Form
        schema={RowsSchema}
        initialValue={{ countryId: 'RU', stops: [{ regionId: 'RU-MOW' }, { regionId: 'RU-SPE' }] }}
        onSubmit={setSubmitted}
      >
        <VStack gap={4} align="stretch">
          <Form.Field.Select
            name="countryId"
            loadOptions={(_search, { signal }) => loadGeoOptions('countries', '', signal)}
          />
          <Form.Group.List
            name="stops"
            sortable
            wrapper={({ children }) => (
              <VStack align="stretch" gap={2}>
                {children}
                <Form.Group.List.Button.Add defaultValue={{ regionId: '' }}>
                  Добавить остановку
                </Form.Group.List.Button.Add>
              </VStack>
            )}
          >
            <HStack gap={2} align="end">
              <Form.Group.List.Button.DragHandle />
              <Form.Field.Select
                name="regionId"
                dependsOn="/countryId"
                loadOptions={(_search, { signal, deps }) => loadGeoOptions('regions', String(deps.countryId), signal)}
              />
              <Form.Group.List.Button.Remove />
            </HStack>
          </Form.Group.List>
          <Form.Button.Submit>Сохранить маршрут</Form.Button.Submit>
        </VStack>
      </Form>
      <SubmittedDataPreview data={submitted} />
    </>
  )
}

export default function DependentSelectDemoPage() {
  return (
    <DemoPageLayout
      title="Dependent Select Demo"
      description="dependsOn у Form.Field.Select и Form.Field.Combobox: страна → регион → город, компания → сотрудник, строки массива"
    >
      <VStack gap={8} align="stretch">
        <Box borderWidth={1} borderRadius="md" p={4} data-testid="section-chain">
          <Heading size="md" mb={2}>Страна → регион → город</Heading>
          <Text color="fg.muted" mb={4}>
            Пока родитель не выбран, поле заблокировано с подсказкой. Смена страны очищает регион и город; запрос
            городов при пустом регионе не уходит.
          </Text>
          <GeoChain />
        </Box>

        <Box borderWidth={1} borderRadius="md" p={4} data-testid="section-edit">
          <Heading size="md" mb={2}>Форма редактирования с черновиком</Heading>
          <Text color="fg.muted" mb={4}>
            Значения заданы сразу, город показывается подписью. Измени город, обнови страницу и восстанови черновик —
            восстановление не стирает зависимые поля.
          </Text>
          <GeoChain storageKey="dependent-select-demo-edit" />
        </Box>

        <Box borderWidth={1} borderRadius="md" p={4} data-testid="section-company">
          <Heading size="md" mb={2}>Компания → сотрудник (ZenStack, onCreate)</Heading>
          <Text color="fg.muted" mb={4}>
            Поиск сотрудников идёт по выбранной компании (<Code>useQuery(search, deps)</Code>), окно создания получает
            компанию из <Code>ctx.deps</Code>.
          </Text>
          <CompanyEmployee />
        </Box>

        <Box borderWidth={1} borderRadius="md" p={4} data-testid="section-rows">
          <Heading size="md" mb={2}>
            Строки массива: <Code>dependsOn="/countryId"</Code>
          </Heading>
          <Text color="fg.muted" mb={4}>Регион каждой остановки зависит от страны, лежащей вне строки.</Text>
          <RowsWithRootParent />
        </Box>
      </VStack>
    </DemoPageLayout>
  )
}
