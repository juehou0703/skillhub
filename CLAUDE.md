# SkillHub — Claude Skill Marketplace

## Project
A marketplace where domain experts upload Claude skills (SKILL.md files) and end users pay per invocation via MCP. React + Vite frontend, Hono + Bun backend, PostgreSQL database.

## Stack
- **Runtime:** Bun
- **Backend:** Hono (TypeScript), port 3456
- **Frontend:** React + Vite, port 5173, proxies API to backend
- **Database:** PostgreSQL 16 via Docker Compose, port 5433
- **Testing:** bun:test

## Commands
- `bun run dev` — start backend server
- `cd web && bun run dev` — start frontend dev server
- `bun test` — run all tests
- `docker compose up -d postgres` — start database

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
