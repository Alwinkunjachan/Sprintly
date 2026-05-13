# Sprintly

A full-stack issue tracking application inspired by [Linear](https://linear.app). Manage projects, issues, cycles (sprints), labels, and team members with a modern UI.

## Tech Stack

**Frontend:** Angular 19, Angular Material, TypeScript | **Backend:** Express, Sequelize, PostgreSQL | **Auth:** JWT + Google SSO | **Cache:** Redis (optional)

## Quick Start

### Local Development

```bash
cp .env.example server/.env    # Configure DB credentials & JWT secrets
cd server && npm install && npm run db:setup && npm run dev
cd client && npm install && ng serve
```

Open http://localhost:4200 — Default admin: `alwin.kunjachan@zeronorth.com` / `password123`

### Docker

```bash
cp .env.docker .env            # Configure secrets in .env
docker compose up -d --build
docker compose run --rm migrate
```

Open http://localhost

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, layers, and data flow |
| [Server](docs/SERVER.md) | Backend deep-dive: bootstrap, routes, services, middleware |
| [Client](docs/CLIENT.md) | Frontend deep-dive: providers, services, signals, features |
| [Frontend Guide](docs/FRONTEND.md) | Angular folder layout and route map |
| [API Reference](docs/API.md) | REST endpoints, payloads, error shapes |
| [Database Schema](docs/DATABASE.md) | Tables, associations, ERD, migration scripts |
| [Redis Caching](docs/REDIS.md) | Cache-aside design, keys, TTLs, invalidation matrix |
| [Setup Guide](docs/SETUP.md) | Local installation, env vars, Google OAuth |
| [Docker Guide](docs/DOCKER.md) | Multi-service compose deployment |
| [Commands Reference](commands.md) | Common local + Docker commands |
| [Google Sign-In Flow](docs/GOOGLE_AUTH_FLOW.md) | Passport OAuth + JWT handoff walkthrough |
| [Drag-and-Drop Kanban](docs/DRAG_AND_DROP.md) | Native HTML5 drag/drop + optimistic update internals |
| [Standalone vs Modular](docs/STANDALONE_VS_MODULAR.md) | Angular standalone-component patterns used here |
