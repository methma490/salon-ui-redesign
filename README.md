# Salon SaaS

Production-ready foundation for a multi-tenant salon management platform.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Axios, shadcn/ui
- **Backend:** NestJS, TypeScript, Prisma, PostgreSQL
- **Infrastructure:** Docker Compose (PostgreSQL only)

## Prerequisites

- Node.js 20+
- npm
- Docker & Docker Compose

## Getting Started

### 1. Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npm run start:dev
```

### 3. Frontend Setup

In a new terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 4. Run Both (Optional)

From the project root after installing dependencies in both apps:

```bash
npm install
npm run dev
```

## Development URLs

| Service      | URL                                |
| ------------ | ---------------------------------- |
| Frontend     | http://localhost:5173              |
| Backend      | http://localhost:3000              |
| Health Check | http://localhost:3000/api/health   |

## Useful Commands

```bash
# Root
npm run dev              # Start frontend + backend
npm run dev:frontend     # Start frontend only
npm run dev:backend      # Start backend only
npm run lint             # Lint both projects

# Backend
npm run start:dev        # Development server
npx prisma generate      # Generate Prisma Client
npx prisma migrate dev   # Run migrations (when models are added)

# Frontend
npm run dev              # Development server
npm run build            # Production build
```

## Project Structure

```
salon-saas/
├── frontend/          # React application
├── backend/           # NestJS API
├── docker-compose.yml # PostgreSQL service
├── package.json       # Root dev scripts
└── README.md
```

## Next Steps

This is an initial setup only. Business features (auth, tenants, salons, etc.) will be added in subsequent phases.
