import { loadDocument } from '@zenstackhq/language'
import type { DataModel } from '@zenstackhq/language/ast'
import { isDataModel, isEnum } from '@zenstackhq/language/ast'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findDependsOnDiagnostics, type ModelSchemaInfo } from './depends-on.js'
import { extractModelInfo, extractModelSchemaInfo, generateModelCode } from './model-generator.js'
import { collectRegistryKeys } from './registry-keys.js'
import type { I18nConfig } from './types.js'

/**
 * Этап З (`libs/forms/PLAN.md` §18.8): директива `form.dependsOn` — PD1 (в `fieldProps`), PD2 (ошибки и предупреждение
 * про `form.exclude`), PD3 (связи между моделями и ключ реестра). Схемы разбирает настоящий `loadDocument`, как в
 * `registry-name.spec.ts`: массив в `@meta` должен пережить парсер Langium.
 */

const SCHEMA_HEAD = `datasource db {
  provider = 'sqlite'
  url = 'file:./dev.db'
}
`

/** Страна → регион → город; компания → сотрудник; отдельная модель без связей — для предупреждения PD3 */
type Backs = Partial<Record<'Country' | 'City' | 'Company', string>>

/** Обратные стороны связей модели `Address` (Prisma требует обе стороны) вставляются в нужные модели */
const geoSchema = (backs: Backs = {}) =>
  `${SCHEMA_HEAD}
model Country {
  id      String @id
  regions Region[]
  cities  City[]
  ${backs.Country ?? ''}
}

model Region {
  id        String @id
  countryId String
  country   Country @relation(fields: [countryId], references: [id])
  cities    City[]
}

model City {
  id       String @id
  regionId String?
  region   Region? @relation(fields: [regionId], references: [id])
  countryId String?
  country   Country? @relation(fields: [countryId], references: [id])
  ${backs.City ?? ''}
}

model Company {
  id        String @id
  employees Employee[]
  ${backs.Company ?? ''}
}

model Employee {
  id        String @id
  companyId String
  company   Company @relation(fields: [companyId], references: [id])
}

model Lonely {
  id String @id
}
`

const CITY_BACK: Backs = { City: 'places Address[]' }

interface Loaded {
  models: DataModel[]
  enumNames: Set<string>
}

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'zfp-depends-on-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function load(schema: string): Promise<Loaded> {
  const schemaPath = join(dir, 'schema.zmodel')
  await writeFile(schemaPath, schema, 'utf-8')
  const result = await loadDocument(schemaPath)
  if (!result.success) {
    throw new Error(`схема не разобралась: ${result.errors.join('; ')}`)
  }
  return {
    models: result.model.declarations.filter(isDataModel),
    enumNames: new Set(result.model.declarations.filter(isEnum).map((e) => e.name)),
  }
}

/** Схема с моделью `Address` поверх гео-моделей: `fields` — тело модели */
function withAddress(fields: string, backs: Backs = {}): string {
  return `${geoSchema(backs)}\nmodel Address {\n  id String @id\n${fields}\n}\n`
}

function diagnose({ models, enumNames }: Loaded) {
  const infos = models.map((m) => extractModelInfo(m, enumNames))
  const schema = new Map<string, ModelSchemaInfo>(models.map((m) => [m.name, extractModelSchemaInfo(m, enumNames)]))
  return findDependsOnDiagnostics(infos, schema)
}

function fieldPropsOf(loaded: Loaded, modelName: string, i18n: I18nConfig | null = null): string {
  const model = loaded.models.find((m) => m.name === modelName) as DataModel
  return generateModelCode(extractModelInfo(model, loaded.enumNames), loaded.enumNames, i18n)
}

describe('PD1: form.dependsOn → fieldProps.dependsOn', () => {
  it('строка → строка, в том же литерале fieldProps, что form.props.*', async () => {
    const loaded = await load(withAddress(`  countryId String
  cityId String @meta("form.dependsOn", "countryId") @meta("form.props.clearOnParentChange", false)`))
    const code = fieldPropsOf(loaded, 'Address')
    expect(code).toContain('fieldProps: {"clearOnParentChange":false,"dependsOn":"countryId"}')
    // Ключ `fieldProps` строго один на поле
    expect(code.match(/fieldProps:/g)).toHaveLength(1)
  })

  it('массив в @meta проходит парсер схемы и остаётся массивом', async () => {
    const loaded = await load(withAddress(`  countryId String
  typeId String
  cityId String @meta("form.dependsOn", ["countryId", "typeId"])`))
    const code = fieldPropsOf(loaded, 'Address')
    expect(code).toContain('fieldProps: {"dependsOn":["countryId","typeId"]}')
  })

  it('путь от корня с «/» сохраняется как написан', async () => {
    const loaded = await load(withAddress(`  countryId String
  cityId String @meta("form.dependsOn", "/countryId")`))
    expect(fieldPropsOf(loaded, 'Address')).toContain('"dependsOn":"/countryId"')
  })

  it('вместе с form.relation.* — один литерал fieldProps: props, dependsOn, relation', async () => {
    const loaded = await load(withAddress(
      `  countryId String
  cityId String @meta("form.dependsOn", "countryId") @meta("form.relation.labelField", "id")
  city City @relation(fields: [cityId], references: [id])`,
      CITY_BACK,
    ))
    const code = fieldPropsOf(loaded, 'Address')
    expect(code).toContain('fieldProps: {"dependsOn":"countryId","relation":{"labelField":"id"}}')
    expect(code.match(/fieldProps:/g)).toHaveLength(1)
  })

  it('form.dependsOn сильнее form.props.dependsOn', async () => {
    const loaded = await load(withAddress(`  countryId String
  cityId String @meta("form.props.dependsOn", "regionId") @meta("form.dependsOn", "countryId")`))
    expect(fieldPropsOf(loaded, 'Address')).toContain('"dependsOn":"countryId"')
  })

  it('разбор: dependsOn попадает в formMeta; пустая строка и пустой массив игнорируются', async () => {
    const loaded = await load(withAddress(`  countryId String
  a String @meta("form.dependsOn", "countryId")
  b String @meta("form.dependsOn", ["countryId", "a"])
  c String @meta("form.dependsOn", "")
  d String @meta("form.dependsOn", [])`))
    const model = loaded.models.find((m) => m.name === 'Address') as DataModel
    const metas = Object.fromEntries(
      extractModelInfo(model, loaded.enumNames).fields.map((f) => [f.name, f.formMeta.dependsOn]),
    )
    expect(metas['a']).toBe('countryId')
    expect(metas['b']).toEqual(['countryId', 'a'])
    expect(metas['c']).toBeUndefined()
    expect(metas['d']).toBeUndefined()
  })

  it('поле без директивы fieldProps не получает', async () => {
    const loaded = await load(withAddress(`  countryId String
  cityId String`))
    expect(fieldPropsOf(loaded, 'Address')).not.toContain('dependsOn')
  })
})

describe('PD2: ошибки generate и предупреждение про form.exclude', () => {
  it('корректная пара — без ошибок и предупреждений', async () => {
    const result = diagnose(
      await load(withAddress(`  countryId String
  cityId String @meta("form.dependsOn", "countryId")`)),
    )
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  it('несуществующее поле — ошибка с Модель.поле', async () => {
    const result = diagnose(await load(withAddress(`  cityId String @meta("form.dependsOn", "countryid")`)))
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/Address\.cityId.*«countryid»/)
  })

  it('несуществующее поле в массиве — ошибка только про него', async () => {
    const result = diagnose(
      await load(withAddress(`  countryId String
  cityId String @meta("form.dependsOn", ["countryId", "nope"])`)),
    )
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/Address\.cityId.*«nope»/)
  })

  it('ссылка поля на само себя — ошибка', async () => {
    const result = diagnose(await load(withAddress(`  cityId String @meta("form.dependsOn", "cityId")`)))
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/Address\.cityId.*самого себя/)
  })

  it('цикл a ↔ b — ошибка с обоими полями', async () => {
    const result = diagnose(
      await load(withAddress(`  a String @meta("form.dependsOn", "b")
  b String @meta("form.dependsOn", "a")`)),
    )
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/Address\.a.*циклическая.*Address\.a → Address\.b → Address\.a/)
  })

  it('цикл из трёх полей — ошибка', async () => {
    const result = diagnose(
      await load(withAddress(`  a String @meta("form.dependsOn", "c")
  b String @meta("form.dependsOn", "a")
  c String @meta("form.dependsOn", "b")`)),
    )
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/циклическая/)
  })

  it('цепочка без цикла (страна → регион → город) — без ошибок', async () => {
    const result = diagnose(
      await load(withAddress(`  countryId String
  regionId String @meta("form.dependsOn", "countryId")
  cityId String @meta("form.dependsOn", "regionId")`)),
    )
    expect(result.errors).toEqual([])
  })

  it('родитель с form.exclude — предупреждение (ребёнок навсегда заблокирован), не ошибка', async () => {
    const result = diagnose(
      await load(withAddress(`  countryId String @meta("form.exclude", true)
  cityId String @meta("form.dependsOn", "countryId")`)),
    )
    expect(result.errors).toEqual([])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/Address\.cityId.*Address\.countryId.*исключён из формы.*заблокирован/)
  })

  it('«/имя» из корня: есть в модели — проверяется как обычное, нет — предупреждение-пропуск, не ошибка', async () => {
    const loaded = await load(withAddress(`  countryId String
  cityId String @meta("form.dependsOn", "/countryId")
  areaId String @meta("form.dependsOn", "/groupCountry")`))
    const result = diagnose(loaded)
    expect(result.errors).toEqual([])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/Address\.areaId.*«groupCountry».*пропущена/)
  })

  it('«/имя» самого поля — тоже ошибка самоссылки', async () => {
    const result = diagnose(await load(withAddress(`  cityId String @meta("form.dependsOn", "/cityId")`)))
    expect(result.errors).toHaveLength(1)
  })

  it('поле миксина считается полем модели', async () => {
    const schema = `${SCHEMA_HEAD}
type Audit {
  ownerId String
}

model Doc with Audit {
  id String @id
  kind String @meta("form.dependsOn", "ownerId")
}
`
    expect(diagnose(await load(schema))).toEqual({ errors: [], warnings: [] })
  })
})

describe('PD3: связи между моделями и ключ реестра', () => {
  it('City связана со Country напрямую (и через Region) — предупреждения нет', async () => {
    const result = diagnose(
      await load(
        withAddress(
          `  countryId String
  country Country @relation(fields: [countryId], references: [id])
  cityId String @meta("form.dependsOn", "countryId")
  city City @relation(fields: [cityId], references: [id])`,
          { Country: 'places Address[]', City: 'places Address[]' },
        ),
      ),
    )
    expect(result.warnings).toEqual([])
  })

  it('цепочка через одну промежуточную модель (City → Region → Country) считается связью', async () => {
    const schema = `${SCHEMA_HEAD}
model Country {
  id      String @id
  regions Region[]
  places  Place[]
}

model Region {
  id        String @id
  countryId String
  country   Country @relation(fields: [countryId], references: [id])
  cities    City[]
}

model City {
  id       String @id
  regionId String
  region   Region @relation(fields: [regionId], references: [id])
  places   Place[]
}

model Place {
  id String @id
  countryId String
  country Country @relation(fields: [countryId], references: [id])
  cityId String @meta("form.dependsOn", "countryId")
  city City @relation(fields: [cityId], references: [id])
}
`
    expect(diagnose(await load(schema)).warnings).toEqual([])
  })

  it('у обоих полей есть связи, а модели друг с другом не связаны — предупреждение «похоже на ошибку»', async () => {
    const result = diagnose(
      await load(
        withAddress(
          `  companyId String
  company Company @relation(fields: [companyId], references: [id])
  cityId String @meta("form.dependsOn", "companyId")
  city City @relation(fields: [cityId], references: [id])`,
          { Company: 'places Address[]', City: 'places Address[]' },
        ),
      ),
    )
    expect(result.errors).toEqual([])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/Address\.cityId.*«City».*«Company».*похоже на ошибку/)
  })

  it('у родителя нет связи (обычное поле) — проверка связей не срабатывает', async () => {
    const result = diagnose(
      await load(
        withAddress(
          `  kind String
  cityId String @meta("form.dependsOn", "kind")
  city City @relation(fields: [cityId], references: [id])`,
          CITY_BACK,
        ),
      ),
    )
    expect(result.warnings).toEqual([])
  })

  it('обе связи на одну модель (self-reference) — не предупреждаем', async () => {
    const result = diagnose(
      await load(
        withAddress(
          `  homeId String
  home City @relation("Home", fields: [homeId], references: [id])
  workId String @meta("form.dependsOn", "homeId")
  work City @relation("Work", fields: [workId], references: [id])`,
          { City: 'homes Address[] @relation("Home")\n  works Address[] @relation("Work")' },
        ),
      ),
    )
    expect(result.warnings).toEqual([])
  })

  it('form.dependsOn на поле с form.relation.* без ключа реестра — «список не фильтруется»', async () => {
    const result = diagnose(
      await load(withAddress(
        `  countryId String
  cityId String @meta("form.dependsOn", "countryId") @meta("form.relation.labelField", "id")
  city City @relation(fields: [cityId], references: [id])`,
        CITY_BACK,
      )),
    )
    expect(result.errors).toEqual([])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/Address\.cityId.*без ключа реестра.*список не фильтруется/)
  })

  it('с ключом реестра предупреждения про фильтр нет', async () => {
    const result = diagnose(
      await load(withAddress(
        `  countryId String
  cityId String @meta("form.dependsOn", "countryId") @meta("form.fieldType", "Select.City")
  city City @relation(fields: [cityId], references: [id])`,
        CITY_BACK,
      )),
    )
    expect(result.warnings).toEqual([])
  })

  it('ключ реестра вместе с form.relation.* — предупреждение про фильтр не дублируется (побеждает ключ)', async () => {
    const result = diagnose(
      await load(withAddress(`  countryId String
  cityId String @meta("form.dependsOn", "countryId") @meta("form.fieldType", "Select.City") @meta("form.relation.labelField", "id")`)),
    )
    expect(result.warnings).toEqual([])
  })

  it('form.dependsOn у enum/строки без relation — без предупреждений', async () => {
    const result = diagnose(
      await load(withAddress(`  kind String
  subkind String @meta("form.dependsOn", "kind")`)),
    )
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  it('ключ реестра по-прежнему попадает в form-registry-keys (директива не мешает)', async () => {
    const loaded = await load(withAddress(`  countryId String
  cityId String @meta("form.dependsOn", "countryId") @meta("form.fieldType", "Select.City")`))
    const infos = loaded.models.map((m) => extractModelInfo(m, loaded.enumNames))
    expect(collectRegistryKeys(infos).keys.Select).toEqual(['City'])
  })
})
