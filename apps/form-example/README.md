# @letar/forms — Example Application

Full-stack showcase of [@letar/forms](https://www.npmjs.com/package/@letar/forms): 46
interactive examples, PostgreSQL-backed CRUD pages, and Server Actions, built as one app inside
the [`letar`](https://github.com/kamiletar/letar) Nx monorepo.

**Live demo:** [forms-example.letar.best](https://forms-example.letar.best)
**Documentation:** [forms.letar.best](https://forms.letar.best)

## Quick Start

This app lives inside the `letar` monorepo — there is no standalone repository for it. Clone
the monorepo, then run this app's targets through Nx.

```bash
git clone https://github.com/kamiletar/letar.git
cd letar
bun install
```

### Database

```bash
# Point DATABASE_URL at a local PostgreSQL instance (apps/form-example/.env.local)
nx run form-example:zenstack:generate
nx run form-example:db:push
nx run form-example:db:seed
```

### Dev server

```bash
nx dev form-example
```

Open [http://localhost:3027](http://localhost:3027) (dev port — see `apps/form-example/.env`).

### Docker

```bash
cd apps/form-example
docker compose up
```

## Full-Stack Pages

| Page                  | Description                                                     |
| --------------------- | --------------------------------------------------------------- |
| `/products`           | Product list — read, delete                                     |
| `/products/new`       | Create product — `Form.FromSchema` → Server Action → PostgreSQL |
| `/products/[id]/edit` | Edit product — load from DB → form → save                       |
| `/contacts`           | Contact messages list                                           |
| `/contacts/new`       | Contact form — generated schema → Server Action → DB            |

## Component Examples

The sidebar groups all 46 examples into 6 categories (see `src/components/nav.tsx`):

### BASICS

| Page                        | Description                               |
| --------------------------- | ----------------------------------------- |
| `/examples/basic`           | Simple form — String, Select, Checkbox    |
| `/examples/all-fields`      | 39+ field types showcase                  |
| `/examples/advanced-fields` | Rating, Slider, Tags, FileUpload variants |
| `/examples/validation`      | Zod validation with `Form.Errors`         |
| `/examples/constraints`     | Regex, cross-field, custom messages       |

### LAYOUT

| Page                    | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `/examples/conditional` | `Form.When` — conditional fields                         |
| `/examples/watch`       | Watching field changes                                   |
| `/examples/multi-step`  | `Form.Steps` — wizard with navigation                    |
| `/examples/groups`      | `Form.Group` + sortable `Form.Group.List`, nested arrays |

### FIELDS

| Page                      | Description                                      |
| ------------------------- | ------------------------------------------------ |
| `/examples/schedule`      | `Form.Field.Schedule` — weekly working hours     |
| `/examples/documents`     | Russian document fields (passport, INN, SNILS)   |
| `/examples/credit-card`   | `Form.Field.CreditCard` — card number/expiry/CVC |
| `/examples/signature`     | Canvas signature capture                         |
| `/examples/survey-fields` | Likert scale and survey-specific fields          |
| `/examples/table-editor`  | Inline editable table field                      |
| `/examples/data-grid`     | Data grid field                                  |
| `/examples/matrix-choice` | Matrix/grid choice field                         |

### GENERATION

| Page                             | Description                                            |
| -------------------------------- | ------------------------------------------------------ |
| `/examples/auto-fields`          | `Form.FromSchema` — one-line form generation           |
| `/examples/auto-fields-advanced` | AutoFields with include/exclude filtering              |
| `/examples/templates`            | Reusable form templates                                |
| `/examples/conversational`       | Typeform-style one-question-at-a-time mode             |
| `/examples/mcp-demo`             | How an AI agent generates a form via `@letar/form-mcp` |
| `/examples/zenstack`             | Schemas generated from database models                 |

### PATTERNS

| Page                    | Description                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| `/examples/offline`     | Offline-first forms — `useOfflineForm` + IndexedDB queue                  |
| `/examples/persistence` | localStorage draft — survives page refresh                                |
| `/examples/autosave`    | Debounced autosave                                                        |
| `/examples/i18n`        | Multi-language form labels (EN/RU)                                        |
| `/examples/security`    | Input sanitization, rate-limit-aware submission                           |
| `/examples/captcha`     | CAPTCHA-gated submission                                                  |
| `/examples/autofill`    | Smart address/profile autofill                                            |
| `/examples/edit-intent` | `Form.Field.EditIntent` — replace a secret without exposing the old value |
| `/examples/recipes`     | Login, Registration, Contact, Settings, Profile Edit, Checkout, Feedback  |

### ADVANCED

| Page                          | Description                                   |
| ----------------------------- | --------------------------------------------- |
| `/examples/analytics`         | Form analytics — drop-off, time per field     |
| `/examples/undo-redo`         | Undo/Redo with keyboard shortcuts             |
| `/examples/server-errors`     | Mapping server errors (Prisma, Zod, ZenStack) |
| `/examples/readonly`          | Read-only form rendering                      |
| `/examples/skeleton`          | Loading skeleton generated from a schema      |
| `/examples/theming`           | Custom Chakra UI theme (emerald + purple)     |
| `/examples/calculated`        | Calculated/derived fields                     |
| `/examples/utility`           | Utility components (`Form.DebugValues`, etc.) |
| `/examples/async-validation`  | Async (server round-trip) field validation    |
| `/examples/comparison`        | Diff view — before vs. after                  |
| `/examples/depends-on`        | Cross-field `dependsOn` behavior              |
| `/examples/debug-values`      | `Form.DebugValues` live inspector             |
| `/examples/testing-utilities` | Testing helpers for `@letar/forms`            |
| `/examples/url-prefill`       | Prefilling a form from URL query params       |

## Tech Stack

- **@letar/forms** — 56+ declarative form field components (Chakra UI skin)
- **@letar/forms-core** / **@letar/form-mcp** — framework-free core and MCP server for AI agents
- **@letar/zenstack-form-plugin** — generate Zod schemas from database models
- **Next.js 16** — React framework with Server Actions
- **Chakra UI v3** — UI components with theming
- **Zod v4** — schema validation
- **PostgreSQL** + **ZenStack** (Prisma 7) — database
- **Docker** — one-command setup

## ZenStack Plugin

`schema.zmodel` defines database models with `@meta("form.*", value)` directives. Generated
schemas land in `src/generated/form-schemas/`.

```bash
nx run form-example:zenstack:generate
```

Pipeline: `schema.zmodel` → `@letar/zenstack-form-plugin` → Zod schemas → `Form.FromSchema` →
PostgreSQL.

## License

MIT
