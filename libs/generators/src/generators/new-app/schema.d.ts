export interface NewAppGeneratorSchema {
  name: string
  port?: number
  displayName?: string
  description?: string
  private?: boolean
  withDb?: boolean
}
