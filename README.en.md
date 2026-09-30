# Letar

Open monorepo of the Letar studio: `@letar/*` libraries, tooling and open-source apps.
Private projects are attached as git submodules and are not available in the public copy.

[Русский](README.md) · [Author's site](https://kami.letar.best) · MIT License

## Highlights

**Forms generated from your data schema.** Describe a model in ZenStack and get forms,
Zod v4 validation and hints out of it.

| Package                                                                                    | What it is                                         |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [`@letar/forms`](https://www.npmjs.com/package/@letar/forms) ([source](libs/forms/))       | Forms on TanStack Form + Chakra UI v3              |
| [`@letar/zenstack-form-plugin`](https://www.npmjs.com/package/@letar/zenstack-form-plugin) | ZenStack plugin: form schemas from `schema.zmodel` |
| [`@letar/form-mcp`](https://www.npmjs.com/package/@letar/form-mcp)                         | MCP server for working with forms from AI agents   |

> More libraries are being prepared for publication (as beta first). This list will grow once
> they land on npm. Browse [libs/](libs/) for the full set.

## Quick start

```bash
git clone --recurse-submodules git@github.com:kamiletar/letar.git
cd letar
bun install
bash scripts/hooks/install.sh

nx dev form-example
```

Private submodules will not check out for outsiders. That is expected; the open part builds without them.

## Stack

Node 24 · Nx · Next.js · React 19 · Chakra UI v3 · PostgreSQL + Prisma + ZenStack ·
TanStack Form · Zod v4 · Vitest · Playwright · Bun

## AI-assisted development

The repo is developed together with Claude Code. Rules and lessons learned live in
[CLAUDE.md](CLAUDE.md) and [.claude/docs/](.claude/docs/) (mostly in Russian).

---

_This English README is intentionally short and will be expanded._
