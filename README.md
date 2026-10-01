# Dart Smart Salon

Production-ready foundation for a multi-tenant salon management platform.

## Tech Stack

- **Website:** Next.js (App Router), TypeScript, Tailwind CSS — public marketing & SEO
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
npm run start:dev    # migrations + seed (if empty) run automatically on startup
```

### 3. Website Setup (Marketing)

```bash
cd website
cp .env.local.example .env.local
npm install
npm run dev
```

### 4. Frontend Setup (Salon App)

In a new terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 5. Run All (Optional)

From the project root after installing dependencies in both apps:

```bash
npm install
npm run dev
```

## Development URLs

| Service      | URL                                |
| ------------ | ---------------------------------- |
| Website      | http://localhost:3001              |
| Frontend     | http://localhost:5173              |
| Backend      | http://localhost:3000              |
| Health Check | http://localhost:3000/api/health   |

## Useful Commands

```bash
# Root
npm run dev              # Start website + frontend + backend
npm run dev:website      # Start website only
npm run dev:frontend     # Start frontend only
npm run dev:backend      # Start backend only
npm run lint             # Lint website, frontend, and backend

# Backend
npm run start:dev        # Development server (auto migrates + seeds empty DB)
npx prisma generate      # Generate Prisma Client
npm run db:setup         # Manual: migrations + seed
npm run db:migrate       # Manual: migrations only
npm run db:seed          # Manual: seed only
npx prisma migrate dev   # Create new migration during development

# Frontend
npm run dev              # Development server
npm run build            # Production build
```

## Project Structure

```
salon-saas/
├── website/           # Next.js public marketing site
├── frontend/          # React/Vite salon & super-admin app
├── backend/           # NestJS API
├── docker-compose.yml # PostgreSQL service
├── package.json       # Root dev scripts
└── README.md
```

## Next Steps

This is an initial setup only. Business features (auth, tenants, salons, etc.) will be added in subsequent phases.
