# Boson

Boson is an open-source desktop database workspace for developers.

The goal is simple: help developers understand how relational data is connected.

Instead of stopping at table browsing or raw queries, Boson is being shaped around:

- schema exploration
- table inspection
- record-level traversal
- graph-style understanding of relationships

## Current status

Boson is currently in an early `UI-first` prototype phase.

Right now the app focuses on:

- a desktop shell built with Tauri + React
- a tabbed workspace model
- dummy relational data for product exploration
- schema, table, and record views
- a right-side inspector for selection context

Database connectivity is not the focus yet. The current priority is getting the interaction model right before wiring in real data sources.

## Product direction

Boson is not trying to be just another generic database client.

The current north star is:

> Boson helps developers explore relational data through schema, tables, and connected records.

That means the first versions are optimized for:

- understanding application data, not broad DBA workflows
- local-first, trust-oriented desktop usage
- a clean and opinionated experience over maximum breadth

## Planned scope

### Phase 1

- standalone desktop app
- PostgreSQL-first mindset
- read-only exploration
- schema view
- table view
- record view
- relationship traversal

### Phase 2

- registry-driven internals for first-party panels and renderers
- stronger schema graph
- better record exploration flows
- connector abstraction

### Phase 3

- public extension points
- community-driven panels, renderers, and connectors

## Tech stack

- [Tauri](https://tauri.app/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- Tailwind CSS + shadcn/ui

## Local development

Install dependencies:

```bash
pnpm install
```

Run the web app:

```bash
pnpm dev
```

Run the desktop app:

```bash
pnpm tauri dev
```

Build the frontend:

```bash
pnpm build
```

## Project structure

```text
src/
  boson/
    fake-domain.ts
    workspace/
  components/
  lib/
src-tauri/
```

High-level areas:

- `src/boson/` contains product-specific workspace logic and fake data
- `src/components/` contains shared UI shell and reusable components
- `src-tauri/` contains the desktop runtime and native app configuration

## Open source stance

Boson is being built as an open-source project because trust matters for database tools.

Principles:

- local-first by default
- explicit about networked behavior
- safe and understandable UX
- product-first development before framework/platform work

## Contributing

Contributions, ideas, and feedback are welcome.

Since the project is still early, the most useful contributions right now are:

- product feedback on the workspace flow
- UI/UX improvements
- interaction design suggestions
- architecture feedback that preserves a product-first direction

## Roadmap themes

- make the schema view feel like the core Boson experience
- improve record-to-record traversal
- refine tab behavior and selection model
- introduce real database support after the UI model is solid

## License

License to be decided.
