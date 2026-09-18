# HiDataLinker

Tauri 2 + SvelteKit desktop client for MySQL, with a Navicat-style object tree, data grid, structure view, DDL viewer, and SQL editor.

Rust owns all database work: connection pooling, `information_schema` introspection, identifier quoting, and SQL execution. The SvelteKit UI only calls typed Tauri commands.

## Stack

- **Desktop:** Tauri 2
- **Frontend:** SvelteKit 2 (SPA / `adapter-static`) + Tailwind 4
- **Backend:** Rust, `mysql_async`

## Features (MySQL)

- Saved connections (optional password)
- Connect / disconnect / test
- Browse databases, tables, views, indexes, triggers, functions/procedures
- Table data preview with paging
- Column structure and `SHOW CREATE` DDL
- Query editor (`⌘/Ctrl+Enter`)

## Develop

```sh
pnpm install
pnpm tauri dev
```

## Architecture

```
src/                 SvelteKit UI (components, stores, invoke wrappers)
src-tauri/src/db     DatabaseEngine trait + MySQL implementation
src-tauri/src/commands  Tauri command layer
src-tauri/src/models    Shared DTOs
```

Adding PostgreSQL later means a new `db/postgres` engine that implements the same `DatabaseEngine` trait.
