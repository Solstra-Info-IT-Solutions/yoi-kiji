# YOI KIJI — A Quieter Way of Living

A premium, Japanese-inspired commerce platform. The experience is designed around considered discovery, clear product information, calm visual hierarchy, and dependable commerce workflows.

## Product principles
- Quiet, editorial storefront with responsive layouts and accessible interactions.
- Fast product discovery, transparent pricing, reliable cart and checkout.
- Secure customer identity, order lifecycle, inventory controls, and auditable administration.
- India-ready commerce foundations: INR, GST-aware tax modelling, shipping, Razorpay integration, and invoice generation.
- Never expose secrets in source control. Demo data and non-live integrations must be clearly identified.

## Technology baseline
- Next.js App Router, React, TypeScript
- PostgreSQL and Prisma
- Node.js server-side application/API
- Razorpay payment adapter (credentials and webhook secret supplied only through environment variables)
- Automated unit, integration, and end-to-end tests

## Repository status
Initial project foundation. Production integrations, credentials, legal policies, shipping contracts, and business-specific tax settings must be configured and verified before launch.

## Local development
1. Install Node.js 22 or later and PostgreSQL.
2. Copy `.env.example` to `.env` and configure local values.
3. Install dependencies with `npm install`.
4. Generate Prisma Client with `npm run db:generate`.
5. Apply migrations with `npm run db:migrate`.
6. Start the application with `npm run dev`.

See [docs/architecture.md](docs/architecture.md) and [docs/launch-checklist.md](docs/launch-checklist.md).
