# Tech Stack

## Framework & Runtime

- **Application Framework:** Astro SSR with React islands for interactive components
- **Language/Runtime:** TypeScript on Node.js
- **Package Manager:** npm

## Frontend

- **JavaScript Framework:** React (via Astro islands for interactive components)
- **CSS Framework:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Charts & Visualizations:** ECharts

## Database & Storage

- **Database:** PostgreSQL
- **ORM/Query Builder:** Drizzle ORM
- **Migrations:** Drizzle Kit

## Authentication & Authorization

- **Authentication:** Auth.js (formerly NextAuth) with email/password credentials
- **Session Storage:** PostgreSQL-backed sessions
- **Authorization:** Custom role-based access control (Agency Admin, Tenant Admin, Tenant Viewer)

## Background Processing

- **Sync Worker:** Node.js scheduled worker for hourly ClientTether API sync
- **PDF Generation:** Playwright for headless browser PDF rendering (optional, feature-flagged)

## External Integrations

- **Primary Data Source:** ClientTether API for franchise performance data (leads, pipeline, hot list, notes, schedule)

## Testing & Quality

- **Linting:** ESLint
- **Formatting:** Prettier
- **Type Checking:** TypeScript strict mode

## Security

- **Session Security:** Secure HTTP-only cookies, CSRF protection
- **Data Isolation:** Tenant-scoped queries enforced at the data access layer
- **Secrets Management:** Environment variables for all credentials and API keys

## Non-Functional Requirements

- **Performance Target:** Less than 1.5 second TTFB under normal load
- **Reliability:** Portal remains usable with cached data when ClientTether is unavailable
- **Logging:** Structured logging for sync operations and errors
- **Migrations:** Versioned database migrations via Drizzle Kit
