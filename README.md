# InterTalent Portal

A talent showcase platform for InterSolutions, enabling clients to browse and request professional talent across multiple industries.

## Features

- **Advanced Search** - Filter by profession type, location, and radius
- **Location-Based Routing** - Automatic email routing to regional offices
- **Responsive Design** - Mobile-first, accessible interface
- **Real-time Data** - Synchronized with HR systems

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** Azure SQL Server
- **Hosting:** Azure App Service
- **Email:** Office 365 SMTP

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
cp .env.example .env.local
# Configure environment variables
npm run dev
```

### Environment Variables

```bash
# Database (Azure SQL) — DB_* is preferred; INTERTALENT_SQL_* / AZURE_SQL_* still work as fallbacks
DB_SERVER=ipsql2025.database.windows.net
DB_NAME=intertalent_DB
DB_USER=
DB_PASSWORD=

# Email (O365 SMTP)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

## Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API endpoints
│   └── profiles/     # Profile pages
├── components/       # React components
├── lib/
│   ├── db/           # Database layer
│   └── email/        # Email service
└── types/            # TypeScript definitions
```

## Scripts

```bash
npm run dev           # Development server
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run linter
```

## Deployment

The application is deployed to Azure App Service with Node.js 20 LTS runtime.

---

© InterSolutions
