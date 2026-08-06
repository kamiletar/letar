/**
 * Декларации типов для sql.js
 *
 * sql.js — WASM версия SQLite для браузера и Node.js
 */

declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[]
    values: SqlValue[][]
  }

  export type SqlValue = string | number | Uint8Array | null

  export interface DatabaseConstructor {
    new(data?: ArrayLike<number> | Buffer | null): Database
  }

  export interface Database {
    run(sql: string, params?: SqlValue[]): void
    exec(sql: string): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
    getRowsModified(): number
  }

  export interface Statement {
    bind(params?: SqlValue[]): boolean
    step(): boolean
    getAsObject(): Record<string, SqlValue>
    get(): SqlValue[]
    free(): void
    reset(): void
  }

  export interface SqlJsStatic {
    Database: DatabaseConstructor
  }

  function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>

  export default initSqlJs
  export { SqlJsStatic }
}
