import { generateFiles, joinPathFragments, logger, type Tree } from '@nx/devkit'
import { toKebabCase, toLowerFirst } from '../../utils/naming'
import { templatesDirFor } from '../../utils/tree'
import type { ReferenceSelectGeneratorSchema } from './schema'

const MODEL_RE = /^[A-Z][A-Za-z0-9]*$/
const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * Достаёт тело `model <Name> { … }` из текста ZModel. Мульти-файловая схема (`import`) сюда не заглядывает:
 * нет модели в главном файле — только предупреждение, не ошибка.
 */
function findModelBody(zmodel: string, model: string): string | null {
  const match = zmodel.match(new RegExp(`^model\\s+${model}\\s*\\{([\\s\\S]*?)^\\}`, 'm'))
  return match ? match[1] : null
}

/**
 * Обязательные поля модели, которых компонент не заполнит: скаляры без `?`, без `@default`/`@id`/`@updatedAt`, кроме
 * подписи. Поле-объект связи (`@relation`) и списки пропускаются — обязательным остаётся внешний ключ рядом.
 */
function findRequiredFields(body: string, labelField: string): string[] {
  const required: string[] = []
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*(\w+)\s+(\w+)(\?|\[\])?\s*(.*)$/)
    if (!match || match[3] || match[1] === labelField || /@(default|id|updatedAt|relation)\b/.test(match[4])) {
      continue
    }
    required.push(match[1])
  }
  return required
}

/**
 * Папка формы приложения: единственная `src/*-form` (у `form-develop-app` это `develop-app-form`, не `<app>-form`),
 * иначе `<app>-form` по конвенции.
 */
function findFormDirName(tree: Tree, appDir: string, app: string): string {
  const candidates = tree.children(joinPathFragments(appDir, 'src')).filter((name) => name.endsWith('-form'))
  return candidates.length === 1 ? candidates[0] : `${app}-form`
}

/**
 * Заготовка компонента справочника для `createForm` (`lazySelects`/`lazyComboboxes`): файл пишется один раз и дальше
 * принадлежит человеку. Поэтому это генератор, а не плагин `zenstack-form-plugin`, который перезаписывает свои файлы
 * целиком (`libs/forms/PLAN.md` §17.6, вопрос 42). Существующий файл не перезаписывается — ошибка.
 */
export default function referenceSelectGenerator(tree: Tree, options: ReferenceSelectGeneratorSchema): void {
  const { app, model } = options
  const kind = options.kind ?? 'select'
  const labelField = options.labelField ?? 'name'
  const schemaImport = options.schemaImport ?? '@/generated/schema'

  if (!MODEL_RE.test(model)) {
    throw new Error(`Модель «${model}» — ожидается PascalCase, как в schema.zmodel (например WorkCategory)`)
  }
  if (!FIELD_RE.test(labelField)) {
    throw new Error(`labelField «${labelField}» — ожидается имя поля модели (например name)`)
  }
  if (kind !== 'select' && kind !== 'combobox') {
    throw new Error(`kind «${String(kind)}» — допустимо select или combobox`)
  }

  const appDir = joinPathFragments('apps', app)
  if (!tree.exists(joinPathFragments(appDir, 'package.json'))) {
    throw new Error(`Приложение ${appDir} не найдено — генератору нужно существующее приложение с формой createForm`)
  }

  const subDir = kind === 'select' ? 'selects' : 'comboboxes'
  const formDirName = findFormDirName(tree, appDir, app)
  const targetDir = options.dir ?? joinPathFragments(appDir, 'src', formDirName, subDir)
  const fileName = `${toKebabCase(model)}-${kind}`
  const targetFile = joinPathFragments(targetDir, `${fileName}.tsx`)

  if (tree.exists(targetFile)) {
    throw new Error(`${targetFile} уже существует — генератор не перезаписывает файлы, которые правит человек`)
  }

  const zmodelPath = joinPathFragments(appDir, 'schema.zmodel')
  const zmodel = tree.read(zmodelPath, 'utf-8')
  if (zmodel !== null) {
    const body = findModelBody(zmodel, model)
    if (body === null) {
      logger.warn(
        `⚠️ В ${zmodelPath} нет модели «${model}» (если она приходит через import — это нормально). `
          + `Без неё useClientQueries(schema).${toLowerFirst(model)} не пройдёт typecheck.`,
      )
    } else if (!new RegExp(`^\\s*${labelField}\\s`, 'm').test(body)) {
      logger.warn(`⚠️ У модели «${model}» в ${zmodelPath} нет поля «${labelField}» — поправь --labelField.`)
    } else {
      const required = findRequiredFields(body, labelField)
      if (required.length > 0) {
        logger.warn(
          `⚠️ У модели «${model}» есть обязательные поля кроме «${labelField}»: ${required.join(', ')}. `
            + `Компонент создаёт запись только с подписью — typecheck подсветит create, допиши поля в data.`,
        )
      }
    }
  }

  const registryNamespace = kind === 'select' ? 'Select' : 'Combobox'
  const componentName = `${model}${registryNamespace}`
  generateFiles(tree, templatesDirFor(import.meta.url, `files-${kind}`), targetDir, {
    fileName,
    model,
    modelKey: toLowerFirst(model),
    componentName,
    labelField,
    schemaImport,
  })

  const registryProp = kind === 'select' ? 'lazySelects' : 'lazyComboboxes'
  logger.info(`✅ ${targetFile} создан (${componentName}).`)
  logger.info(
    `Подключи в createForm приложения (apps/${app}/src/${formDirName}/*):\n\n`
      + `  ${registryProp}: {\n`
      + `    ${model}: () => import('./${subDir}/${fileName}').then((m) => m.${componentName}),\n`
      + `  },\n`,
  )
  logger.info(
    `Ключ реестра — ${registryNamespace}.${model}. Поле-ссылка типа ${model} подхватит его само (автоподбор по имени `
      + `модели); для другого типа поля — @meta("form.fieldType", "${registryNamespace}.${model}") в schema.zmodel.`,
  )
  logger.info(
    `Окно создания и правки — TODO в файле: сейчас window.prompt, замени диалогом приложения. `
      + `Проверка: nx typecheck:tsgo ${app}.`,
  )
}
