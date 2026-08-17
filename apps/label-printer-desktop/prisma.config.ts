import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './src/generated/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: 'file:./prisma/data/app.db',
  },
})
