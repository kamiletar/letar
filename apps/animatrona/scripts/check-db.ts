import { createClient } from '@libsql/client'

const DB_PATH = 'file:C:/Users/Kami/AppData/Roaming/@letar/animatrona/data/app.db'
const db = createClient({ url: DB_PATH })

// Проверяем таблицы
const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
console.log('=== Таблицы в БД ===')
for (const row of tables.rows) {
  console.log(' ', row.name)
}

const fileExists = tables.rows.some((r) => r.name === 'File')
console.log(`\nFile table exists: ${fileExists}`)

const posterExists = tables.rows.some((r) => r.name === 'Poster')
console.log(`Poster table exists: ${posterExists}`)

// Проверяем примененные миграции
try {
  const migrations = await db.execute(
    'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY migration_name',
  )
  console.log('\n=== Примененные миграции ===')
  for (const row of migrations.rows) {
    console.log(`  ${row.migration_name} — ${row.finished_at ? 'OK' : 'NOT FINISHED'}`)
  }
} catch {
  console.log('\n_prisma_migrations table not found')
}

// Проверяем структуру File таблицы
if (fileExists) {
  const fileSchema = await db.execute('PRAGMA table_info(File)')
  console.log('\n=== File table schema ===')
  for (const row of fileSchema.rows) {
    console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PK' : ''}`)
  }
}

// Пробуем тот же запрос что mobile-server
try {
  const testQuery = await db.execute(`
    SELECT a.id, a.name, f.path, f.cid
    FROM Anime a
    LEFT JOIN File f ON a.posterId = f.id
    LIMIT 3
  `)
  console.log('\n=== Test JOIN Anime → File (OK) ===')
  for (const row of testQuery.rows) {
    console.log(`  ${row.name}: path=${row.path}, cid=${row.cid}`)
  }
} catch (e) {
  console.log(`\n=== Test JOIN FAILED: ${e} ===`)
}

db.close()
