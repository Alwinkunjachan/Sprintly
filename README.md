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
| [Architecture](docs/ARCHITECTURE.md) | System design and component overview |
| [API Reference](docs/API.md) | REST API endpoints and payloads |
| [Database Schema](docs/DATABASE.md) | Models, associations, and ERD |
| [Frontend Guide](docs/FRONTEND.md) | Angular architecture and components |
| [Redis Caching](docs/REDIS.md) | Cache architecture and monitoring |
| [Setup Guide](docs/SETUP.md) | Installation and configuration |
| [Docker Guide](docs/DOCKER.md) | Docker deployment and troubleshooting |
