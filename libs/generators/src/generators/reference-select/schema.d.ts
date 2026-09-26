export interface ReferenceSelectGeneratorSchema {
  /** Имя приложения в apps/ */
  app: string
  /** Модель ZenStack (PascalCase) */
  model: string
  /** `select` — весь справочник; `combobox` — поиск на сервере. По умолчанию `select` */
  kind?: 'select' | 'combobox'
  /** Поле модели с подписью опции. По умолчанию `name` */
  labelField?: string
  /** Папка для файла. По умолчанию `apps/<app>/src/<app>-form/selects` (`comboboxes` для combobox) */
  dir?: string
  /** Путь импорта сгенерированной схемы ZenStack. По умолчанию `@/generated/schema` */
  schemaImport?: string
}
