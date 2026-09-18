# HiDataLinker

**Version 1.0.0** — Tauri 2 + SvelteKit desktop client for **MySQL** and **PostgreSQL**, with a Navicat-style object tree, data grid, structure view, DDL viewer, and SQL editor.

Rust owns all database work: connection pooling, introspection, identifier quoting, and SQL execution. The SvelteKit UI only calls typed Tauri commands.

## Stack

- **Desktop:** Tauri 2
- **Frontend:** SvelteKit 2 (SPA / `adapter-static`) + Tailwind 4
- **Backend:** Rust (`mysql_async`, `deadpool-postgres`)

## Features (1.0.0)

- Saved connections (MySQL / PostgreSQL, optional password, URL paste)
- Connect / disconnect / test (max 5 open sessions)
- Browse databases/schemas, tables, views, indexes, triggers, functions/procedures
- Table data preview with paging, form view, and row insert/edit/delete
- Column structure editing and DDL viewer
- Query editor with format, Explain, and `⌘/Ctrl+Enter`
- Create / drop database (or schema), dump to `.sql`, run SQL file
- English / 中文 UI

See **[FEATURES.md](./FEATURES.md)** for the full product feature checklist (done / partial / planned).

## Develop

```sh
pnpm install
pnpm tauri dev
```

## Architecture

```
src/                 SvelteKit UI (components, stores, invoke wrappers)
src-tauri/src/db     DatabaseEngine trait + MySQL / PostgreSQL implementations
src-tauri/src/commands  Tauri command layer
src-tauri/src/models    Shared DTOs
```
