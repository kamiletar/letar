# @letar/forms — Example Application

Full-stack showcase of [@letar/forms](https://www.npmjs.com/package/@letar/forms) with PostgreSQL, Server Actions, and 16 interactive examples.

**Live demo:** [forms-example.letar.best](https://forms-example.letar.best)
**Documentation:** [forms.letar.best](https://forms.letar.best)

## Quick Start

### With Docker (recommended)

```bash
git clone https://github.com/kamiletar/letar/tree/main/apps/form-example.git
cd letar-forms-example
docker compose up
```

Open [http://localhost:3000](http://localhost:3000). PostgreSQL starts automatically with seed data.

### Without Docker

```bash
git clone https://github.com/kamiletar/letar/tree/main/apps/form-example.git
cd letar-forms-example
npm install

# Set up PostgreSQL
cp .env.example .env
# Edit .env with your DATABASE_URL

npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

## Full-Stack Pages

| Page                  | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| `/products`           | Product list — read, delete                                   |
| `/products/new`       | Create product — Form.FromSchema → Server Action → PostgreSQL |
| `/products/[id]/edit` | Edit product — load from DB → form → save                     |
| `/contacts`           | Contact messages list                                         |
| `/contacts/new`       | Contact form — generated schema → Server Action → DB          |

## Component Examples

| Page                             | Description                                  |
| -------------------------------- | -------------------------------------------- |
| `/examples/basic`                | Simple form — String, Select, Checkbox       |
| `/examples/all-fields`           | All 20+ field types showcase                 |
| `/examples/advanced-fields`      | Rating, Slider, Tags, FileUpload variants    |
| `/examples/validation`           | Zod validation with Form.Errors              |
| `/examples/constraints`          | Regex, cross-field, custom messages          |
| `/examples/conditional`          | Form.When — conditional fields               |
| `/examples/multi-step`           | Form.Steps — wizard with navigation          |
| `/examples/groups`               | Form.Group + Form.Group.List                 |
| `/examples/auto-fields`          | Form.FromSchema — one-line form generation   |
| `/examples/auto-fields-advanced` | AutoFields with include/exclude filtering    |
| `/examples/zenstack`             | Schemas generated from database models       |
| `/examples/recipes`              | Login, Registration, Contact, Settings forms |
| `/examples/theming`              | Custom Chakra UI theme (emerald + purple)    |
| `/examples/persistence`          | localStorage draft — survives page refresh   |
| `/examples/i18n`                 | Multi-language form labels (EN/RU)           |
| `/examples/offline`              | Offline-first forms with sync queue          |

## Tech Stack

- **@letar/forms** — 40+ declarative form field components
- **@letar/zenstack-form-plugin** — generate Zod schemas from database models
- **Next.js 16** — React framework with Server Actions
- **Chakra UI v3** — UI components with theming
- **Zod v4** — schema validation
- **PostgreSQL** — database (via Prisma 7)
- **Docker** — one-command setup

## ZenStack Plugin

`schema.zmodel` defines database models with `@form.*` directives.
Generated schemas are in `src/generated/form-schemas/`.

```bash
npx zenstack generate
```

Pipeline: `schema.zmodel` → `@letar/zenstack-form-plugin` → Zod schemas → `Form.FromSchema` → PostgreSQL

## License

MIT
