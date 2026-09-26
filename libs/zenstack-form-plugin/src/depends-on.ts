import { parseFieldRegistryType } from './registry-keys.js'
import type { ModelInfo } from './types.js'

/**
 * Директива `@meta("form.dependsOn", "countryId")` (этап З, `libs/forms/PLAN.md` §18.8): поле выбора зависит от
 * значения другого поля формы. Плагин **ничего не выводит сам** (автовывода по FK нет — путей бывает несколько,
 * связь в схеме не значит «фильтровать список»), а только проверяет явную директиву на generate.
 *
 * Здесь — чистые проверки по данным, которые собирает `extractModelSchemaInfo` (`model-generator.ts`) из AST схемы.
 */

/** Что проверкам нужно знать о модели схемы, кроме `ModelInfo` (то, что видно только в AST) */
export interface ModelSchemaInfo {
  /** Имя модели */
  name: string
  /** Имена всех полей модели, с учётом миксинов — в том числе исключённых из формы и полей-связей */
  fieldNames: ReadonlySet<string>
  /** Скалярный FK → имя целевой модели (`countryId` → `Country`) */
  foreignKeyTargets: ReadonlyMap<string, string>
  /** Модели, на которые модель ссылается своим FK (`region Region @relation(fields: [regionId])`); обратные списки не входят */
  modelReferences: ReadonlySet<string>
}

export interface DependsOnDiagnostics {
  /** Ошибки generate: схема неверна, generate падает */
  errors: string[]
  /** Предупреждения: похоже на ошибку, но generate проходит */
  warnings: string[]
}

const PREFIX = '[zenstack-form-plugin]'

/** `form.dependsOn` в виде списка имён; пустые и нестроковые элементы отбрасываются на разборе директивы */
export function dependsOnList(dependsOn: string | readonly string[] | undefined): string[] {
  if (dependsOn === undefined) {
    return []
  }
  return typeof dependsOn === 'string' ? [dependsOn] : [...dependsOn]
}

/** Одна зависимость поля: имя как написано в схеме и имя поля модели (без ведущего «/») */
interface Dependency {
  raw: string
  /** Имя поля без ведущего «/» */
  name: string
  fromRoot: boolean
}

function toDependencies(dependsOn: string | readonly string[] | undefined): Dependency[] {
  return dependsOnList(dependsOn).map((raw) => {
    const fromRoot = raw.startsWith('/')
    return { raw, name: fromRoot ? raw.slice(1) : raw, fromRoot }
  })
}

/**
 * Связаны ли две модели: прямая ссылка в любую сторону либо цепочка из одной промежуточной модели
 * (`City` → `Region` → `Country`). Дальше не ищем: миксин аудита (`createdBy: User`) связывает через `User`
 * вообще всё, и проверка перестала бы что-либо ловить.
 */
function areModelsLinked(
  a: string,
  b: string,
  schema: ReadonlyMap<string, ModelSchemaInfo>,
): boolean {
  const refs = (model: string): ReadonlySet<string> => schema.get(model)?.modelReferences ?? new Set()
  const direct = (from: string, to: string): boolean => refs(from).has(to)
  if (direct(a, b) || direct(b, a)) {
    return true
  }
  for (const middle of refs(a)) {
    if (direct(middle, b)) {
      return true
    }
  }
  for (const middle of refs(b)) {
    if (direct(middle, a)) {
      return true
    }
  }
  return false
}

/** Первый цикл в графе «поле → его родители» (без петель на себя: они — отдельная ошибка). `null` — цикла нет */
function findCycle(graph: ReadonlyMap<string, readonly string[]>): string[] | null {
  const state = new Map<string, 'visiting' | 'done'>()
  const stack: string[] = []

  const visit = (node: string): string[] | null => {
    state.set(node, 'visiting')
    stack.push(node)
    for (const parent of graph.get(node) ?? []) {
      if (parent === node) {
        continue
      }
      if (state.get(parent) === 'visiting') {
        return [...stack.slice(stack.indexOf(parent)), parent]
      }
      if (state.get(parent) === undefined) {
        const cycle = visit(parent)
        if (cycle) {
          return cycle
        }
      }
    }
    stack.pop()
    state.set(node, 'done')
    return null
  }

  for (const node of graph.keys()) {
    if (state.get(node) === undefined) {
      const cycle = visit(node)
      if (cycle) {
        return cycle
      }
    }
  }
  return null
}

/**
 * Проверки `form.dependsOn` по всей схеме (§18.8). Ошибки — сообщение с `Модель.поле`:
 * - ссылка на несуществующее поле модели; ссылка поля на само себя; цикл (`a` ↔ `b`);
 *
 * Предупреждения:
 * - родитель исключён из формы (`form.exclude`, поле-связь, системное поле): ребёнок навсегда заблокирован;
 * - у обоих полей есть связи, но у целевой модели ребёнка нет связи с целевой моделью родителя — похоже на ошибку;
 * - `dependsOn` у поля с `form.relation.*` без ключа реестра: автоформа грузит все записи модели, список не
 *   фильтруется;
 * - `/имя`, которого нет в модели: возможно, поле лежит в группе или строке массива — по схеме не узнать, пропуск.
 *
 * @param models  информация о моделях (поля, включённые в форму)
 * @param schema  имя модели → данные из AST (`extractModelSchemaInfo`)
 */
export function findDependsOnDiagnostics(
  models: readonly ModelInfo[],
  schema: ReadonlyMap<string, ModelSchemaInfo>,
): DependsOnDiagnostics {
  const errors: string[] = []
  const warnings: string[] = []

  for (const model of models) {
    const info = schema.get(model.name)
    // Модели нет в схеме (мок-вход) — проверять существование полей нечем
    const fieldNames = info?.fieldNames ?? new Set(model.fields.map((f) => f.name).concat(model.excludedFields))
    const excluded = new Set(model.excludedFields)
    // Граф «ребёнок → родители» внутри модели — для поиска цикла
    const graph = new Map<string, string[]>()

    for (const field of model.fields) {
      const dependencies = toDependencies(field.formMeta.dependsOn)
      if (dependencies.length === 0) {
        continue
      }
      const where = `${model.name}.${field.name}`
      const parentNames: string[] = []

      for (const dependency of dependencies) {
        const { raw, name, fromRoot } = dependency
        // Вложенный путь (`address.country`) — поле группы, не поле модели: проверять нечем
        if (name.includes('.')) {
          continue
        }
        if (name === field.name) {
          errors.push(`${PREFIX} ${where}: @meta("form.dependsOn", "${raw}") — поле зависит от самого себя.`)
          continue
        }
        if (!fieldNames.has(name)) {
          if (fromRoot) {
            // «/x» — от корня формы: поле может лежать в группе или строке массива, схема этого не знает
            warnings.push(
              `${PREFIX} ${where}: @meta("form.dependsOn", "${raw}") — в модели «${model.name}» нет поля «${name}»; `
                + `если оно в корне формы за пределами этой модели, проверка пропущена.`,
            )
          } else {
            errors.push(
              `${PREFIX} ${where}: @meta("form.dependsOn", "${raw}") — в модели «${model.name}» нет поля «${name}».`,
            )
          }
          continue
        }
        parentNames.push(name)

        if (excluded.has(name)) {
          warnings.push(
            `${PREFIX} ${where}: родитель «${model.name}.${name}» из form.dependsOn исключён из формы `
              + `(form.exclude, поле-связь или системное поле) — поле навсегда заблокировано.`,
          )
        }

        // Связи: у обоих полей есть целевая модель, а между моделями связи нет
        const childTarget = info?.foreignKeyTargets.get(field.name) ?? field.formMeta.relation?.model
        const parentTarget = info?.foreignKeyTargets.get(name)
        if (info && childTarget && parentTarget && childTarget !== parentTarget) {
          if (!areModelsLinked(childTarget, parentTarget, schema)) {
            warnings.push(
              `${PREFIX} ${where}: @meta("form.dependsOn", "${raw}") — у модели «${childTarget}» нет связи с «${parentTarget}» `
                + `(ни прямой, ни через одну промежуточную модель) — похоже на ошибку.`,
            )
          }
        }
      }
      graph.set(field.name, parentNames)

      // form.relation.* без ключа реестра: автоформа грузит все записи модели, фильтра по родителю нет
      const { fieldType, relation } = field.formMeta
      if (relation && !(fieldType && parseFieldRegistryType(fieldType))) {
        warnings.push(
          `${PREFIX} ${where}: @meta("form.dependsOn") без ключа реестра (@meta("form.fieldType", "Select.<Имя>")) — `
            + `поле будет блокироваться и очищаться, но список не фильтруется: автоформа грузит все записи «${
              relation.model ?? info?.foreignKeyTargets.get(field.name) ?? field.type
            }».`,
        )
      }
    }

    const cycle = findCycle(graph)
    if (cycle) {
      errors.push(
        `${PREFIX} ${model.name}.${cycle[0]}: циклическая зависимость form.dependsOn: ${
          cycle.map((name) => `${model.name}.${name}`).join(' → ')
        }.`,
      )
    }
  }

  return { errors, warnings }
}
